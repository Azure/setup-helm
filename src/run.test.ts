import {vi, describe, test, expect, afterEach} from 'vitest'
import * as path from 'path'

// Mock os module
vi.mock('os', async (importOriginal) => {
   const actual = await importOriginal<typeof import('os')>()
   return {
      ...actual,
      platform: vi.fn(),
      arch: vi.fn()
   }
})

// Mock fs module
vi.mock('fs', async (importOriginal) => {
   const actual = await importOriginal<typeof import('fs')>()
   return {
      ...actual,
      readdirSync: vi.fn(),
      statSync: vi.fn(),
      chmodSync: vi.fn(),
      readFileSync: vi.fn(),
      existsSync: vi.fn()
   }
})

// Mock @actions/core
vi.mock('@actions/core', async (importOriginal) => {
   const actual = await importOriginal<typeof import('@actions/core')>()
   return {
      ...actual,
      getInput: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      warning: vi.fn(),
      startGroup: vi.fn(),
      endGroup: vi.fn(),
      addPath: vi.fn(),
      setOutput: vi.fn(),
      setFailed: vi.fn()
   }
})

// Mock @actions/tool-cache
vi.mock('@actions/tool-cache', async (importOriginal) => {
   const actual = await importOriginal<typeof import('@actions/tool-cache')>()
   return {
      ...actual,
      find: vi.fn(),
      downloadTool: vi.fn(),
      extractZip: vi.fn(),
      extractTar: vi.fn(),
      cacheDir: vi.fn()
   }
})

import * as run from './run.js'
import * as os from 'os'
import * as toolCache from '@actions/tool-cache'
import * as fs from 'fs'
import * as core from '@actions/core'

describe('run.ts', () => {
   const downloadBaseURL = 'https://test.tld'

   // Cleanup mocks after each test to ensure that subsequent tests are not affected by the mocks.
   afterEach(() => {
      vi.restoreAllMocks()
   })

   test('getExecutableExtension() - return .exe when os is Windows', () => {
      vi.mocked(os.platform).mockReturnValue('win32')

      expect(run.getExecutableExtension()).toBe('.exe')
      expect(os.platform).toHaveBeenCalled()
   })

   test('getExecutableExtension() - return empty string for non-windows OS', () => {
      vi.mocked(os.platform).mockReturnValue('darwin')

      expect(run.getExecutableExtension()).toBe('')
      expect(os.platform).toHaveBeenCalled()
   })

   test('getHelmDownloadURL() - return the URL to download helm for Linux amd64', () => {
      vi.mocked(os.platform).mockReturnValue('linux')
      vi.mocked(os.arch).mockReturnValue('x64')
      const expected = 'https://test.tld/helm-v3.8.0-linux-amd64.tar.gz'

      expect(run.getHelmDownloadURL(downloadBaseURL, 'v3.8.0')).toBe(expected)
      expect(os.platform).toHaveBeenCalled()
      expect(os.arch).toHaveBeenCalled()
   })

   test('getHelmDownloadURL() - return the URL to download helm for Linux arm64', () => {
      vi.mocked(os.platform).mockReturnValue('linux')
      vi.mocked(os.arch).mockReturnValue('arm64')
      const expected = 'https://test.tld/helm-v3.8.0-linux-arm64.tar.gz'

      expect(run.getHelmDownloadURL(downloadBaseURL, 'v3.8.0')).toBe(expected)
      expect(os.platform).toHaveBeenCalled()
      expect(os.arch).toHaveBeenCalled()
   })

   test('getHelmDownloadURL() - return the URL to download helm for Darwin x64', () => {
      vi.mocked(os.platform).mockReturnValue('darwin')
      vi.mocked(os.arch).mockReturnValue('x64')
      const expected = 'https://test.tld/helm-v3.8.0-darwin-amd64.tar.gz'

      expect(run.getHelmDownloadURL(downloadBaseURL, 'v3.8.0')).toBe(expected)
      expect(os.platform).toHaveBeenCalled()
      expect(os.arch).toHaveBeenCalled()
   })

   test('getHelmDownloadURL() - return the URL to download helm for Darwin arm64', () => {
      vi.mocked(os.platform).mockReturnValue('darwin')
      vi.mocked(os.arch).mockReturnValue('arm64')
      const expected = 'https://test.tld/helm-v3.8.0-darwin-arm64.tar.gz'

      expect(run.getHelmDownloadURL(downloadBaseURL, 'v3.8.0')).toBe(expected)
      expect(os.platform).toHaveBeenCalled()
      expect(os.arch).toHaveBeenCalled()
   })

   test('getHelmDownloadURL() - return the URL to download helm for Windows x64', () => {
      vi.mocked(os.platform).mockReturnValue('win32')
      vi.mocked(os.arch).mockReturnValue('x64')

      const expected = 'https://test.tld/helm-v3.8.0-windows-amd64.zip'
      expect(run.getHelmDownloadURL(downloadBaseURL, 'v3.8.0')).toBe(expected)
      expect(os.platform).toHaveBeenCalled()
   })

   test('getHelmDownloadURL() - return the URL to download helm for Windows arm64', () => {
      vi.mocked(os.platform).mockReturnValue('win32')
      vi.mocked(os.arch).mockReturnValue('arm64')

      const expected = 'https://test.tld/helm-v3.8.0-windows-arm64.zip'
      expect(run.getHelmDownloadURL(downloadBaseURL, 'v3.8.0')).toBe(expected)
      expect(os.platform).toHaveBeenCalled()
   })

   test('getLatestHelmVersion() - return the latest version of HELM', async () => {
      const res = {
         status: 200,
         text: async () => 'v9.99.999'
      } as Response
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(res)
      expect(await run.getLatestHelmVersion()).toBe('v9.99.999')
   })

   test('getLatestHelmVersion() - return the stable version of HELM when simulating a network error', async () => {
      const errorMessage: string = 'Network Error'
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(
         new Error(errorMessage)
      )
      expect(await run.getLatestHelmVersion()).toBe(run.stableHelmVersion)
   })

   test('getValidVersion() - return version with v prepended', () => {
      expect(run.getValidVersion('3.8.0')).toBe('v3.8.0')
   })

   test('parseToolVersions() - return the helm version from .tool-versions content', () => {
      const content = ['nodejs 20.11.0', 'helm 3.14.0', 'terraform 1.7.0'].join(
         '\n'
      )
      expect(run.parseToolVersions(content)).toBe('3.14.0')
   })

   test('parseToolVersions() - ignore comments and blank lines', () => {
      const content = ['# tools', '', '   helm 3.15.2   ', ''].join('\n')
      expect(run.parseToolVersions(content)).toBe('3.15.2')
   })

   test('parseToolVersions() - return the first version when several are listed', () => {
      expect(run.parseToolVersions('helm 3.14.0 3.13.0')).toBe('3.14.0')
   })

   test('parseToolVersions() - return empty string when helm is not declared', () => {
      expect(run.parseToolVersions('nodejs 20.11.0')).toBe('')
   })

   test('getVersionFromToolVersionsFile() - read the helm version from a file', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('helm 3.14.0')

      expect(run.getVersionFromToolVersionsFile('.tool-versions')).toBe(
         '3.14.0'
      )
      expect(fs.readFileSync).toHaveBeenCalledWith('.tool-versions', 'utf8')
   })

   test('getVersionFromToolVersionsFile() - throw when the file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      expect(() =>
         run.getVersionFromToolVersionsFile('missing.tool-versions')
      ).toThrow("The version-file 'missing.tool-versions' does not exist")
   })

   test('getVersionFromToolVersionsFile() - throw when no helm version is present', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('nodejs 20.11.0')

      expect(() =>
         run.getVersionFromToolVersionsFile('.tool-versions')
      ).toThrow("No helm version found in '.tool-versions'")
   })

   test('getVersionFromToolVersionsFile() - throw when the helm version is not valid', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('helm latest')

      expect(() =>
         run.getVersionFromToolVersionsFile('.tool-versions')
      ).toThrow(
         "The helm version 'latest' in '.tool-versions' is not valid. Provide a full version (e.g. '3.14.0') or a major.minor version (e.g. '3.14' or '3.14.x')"
      )
   })

   test('getVersionFromToolVersionsFile() - accept a major.minor version', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('helm 3.14')

      expect(run.getVersionFromToolVersionsFile('.tool-versions')).toBe('3.14')
   })

   test('isSemVerShaped() - accept semver-shaped versions with or without a v prefix', () => {
      expect(run.isSemVerShaped('3.14.0')).toBe(true)
      expect(run.isSemVerShaped('v3.14.0')).toBe(true)
      expect(run.isSemVerShaped('3.14.0-rc.1')).toBe(true)
   })

   test('isSemVerShaped() - reject values that are not semver-shaped', () => {
      expect(run.isSemVerShaped('latest')).toBe(false)
      expect(run.isSemVerShaped('3.14')).toBe(false)
      expect(run.isSemVerShaped('abc')).toBe(false)
   })

   test('isMajorMinorShaped() - accept major.minor with or without a v prefix', () => {
      expect(run.isMajorMinorShaped('3.14')).toBe(true)
      expect(run.isMajorMinorShaped('v3.14')).toBe(true)
   })

   test('isMajorMinorShaped() - accept a wildcard patch (.x / .*)', () => {
      expect(run.isMajorMinorShaped('3.14.x')).toBe(true)
      expect(run.isMajorMinorShaped('v3.14.x')).toBe(true)
      expect(run.isMajorMinorShaped('3.14.*')).toBe(true)
      expect(run.isMajorMinorShaped('v3.14.*')).toBe(true)
   })

   test('isMajorMinorShaped() - reject full versions and other values', () => {
      expect(run.isMajorMinorShaped('3.14.0')).toBe(false)
      expect(run.isMajorMinorShaped('latest')).toBe(false)
      expect(run.isMajorMinorShaped('3')).toBe(false)
   })

   // Stubs the download chain so run() resolves to a cached helm binary,
   // letting these tests focus on version-vs-version-file resolution.
   const stubDownloadChain = () => {
      vi.mocked(os.platform).mockReturnValue('linux')
      vi.mocked(os.arch).mockReturnValue('x64')
      vi.mocked(toolCache.find).mockReturnValue('pathToCachedDir')
      vi.mocked(fs.chmodSync).mockImplementation(() => {})
      vi.mocked(fs.readdirSync).mockReturnValue([
         'helm' as unknown as fs.Dirent<NonSharedBuffer>
      ])
      vi.mocked(fs.statSync).mockReturnValue({
         isDirectory: () => false
      } as fs.Stats)
   }

   const inputs = (version: string, versionFile: string) =>
      vi.mocked(core.getInput).mockImplementation((name: string) => {
         if (name === 'version') return version
         if (name === 'version-file') return versionFile
         if (name === 'downloadBaseURL') return downloadBaseURL
         return ''
      })

   test('run() - resolve the version from version-file when version is not set', async () => {
      stubDownloadChain()
      inputs('', '.tool-versions')
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('helm 3.14.0')

      await run.run()

      expect(core.warning).not.toHaveBeenCalled()
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v3.14.0')
      expect(core.setOutput).toHaveBeenCalledWith(
         'helm-path',
         path.join('pathToCachedDir', 'helm')
      )
   })

   test('run() - resolve the version from version-file when version is left at the latest default', async () => {
      stubDownloadChain()
      inputs('latest', '.tool-versions')
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('helm 3.14.0')

      await run.run()

      expect(core.warning).not.toHaveBeenCalled()
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v3.14.0')
   })

   test('run() - warn and prefer version over version-file when both are set', async () => {
      stubDownloadChain()
      inputs('3.5.0', '.tool-versions')

      await run.run()

      expect(core.warning).toHaveBeenCalledWith(
         `Both 'version' and 'version-file' inputs are specified, only 'version' will be used.`
      )
      expect(fs.readFileSync).not.toHaveBeenCalled()
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v3.5.0')
   })

   // Spies on global fetch so HEAD probes report the given set of versions as
   // existing (200) and everything else as missing (404). Using vi.spyOn (rather
   // than vi.stubGlobal) lets restoreAllMocks() in afterEach reliably restore the
   // real fetch, so the mock never leaks into later tests.
   const stubPatchProbes = (existing: string[]) => {
      const present = new Set(existing)
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
         const version =
            String(input).match(/helm-(v\d+\.\d+\.\d+)-/)?.[1] ?? ''
         const ok = present.has(version)
         return {ok, status: ok ? 200 : 404} as Response
      })
   }

   test('helmPatchExists() - return true when the artifact responds 200', async () => {
      vi.mocked(os.platform).mockReturnValue('linux')
      vi.mocked(os.arch).mockReturnValue('x64')
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
         ok: true,
         status: 200
      } as Response)

      expect(await run.helmPatchExists(downloadBaseURL, 'v3.14.4')).toBe(true)
   })

   test('helmPatchExists() - return false when the artifact responds 404', async () => {
      vi.mocked(os.platform).mockReturnValue('linux')
      vi.mocked(os.arch).mockReturnValue('x64')
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
         ok: false,
         status: 404
      } as Response)

      expect(await run.helmPatchExists(downloadBaseURL, 'v3.14.99')).toBe(false)
   })

   test('helmPatchExists() - throw on a non-404 error status', async () => {
      vi.mocked(os.platform).mockReturnValue('linux')
      vi.mocked(os.arch).mockReturnValue('x64')
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
         ok: false,
         status: 429
      } as Response)

      await expect(
         run.helmPatchExists(downloadBaseURL, 'v3.14.4')
      ).rejects.toThrow('Unexpected HTTP 429')
   })

   test('resolveLatestPatchVersion() - return the newest existing patch', async () => {
      vi.mocked(os.platform).mockReturnValue('linux')
      vi.mocked(os.arch).mockReturnValue('x64')
      stubPatchProbes(['v3.14.0', 'v3.14.1', 'v3.14.2', 'v3.14.3', 'v3.14.4'])

      expect(await run.resolveLatestPatchVersion(downloadBaseURL, '3.14')).toBe(
         'v3.14.4'
      )
   })

   test('resolveLatestPatchVersion() - use the blob listing in a single request when supported', async () => {
      vi.mocked(os.platform).mockReturnValue('linux')
      vi.mocked(os.arch).mockReturnValue('x64')
      const listing =
         '<EnumerationResults>' +
         '<Blob><Name>helm-v3.14.0-linux-amd64.tar.gz</Name></Blob>' +
         '<Blob><Name>helm-v3.14.0-rc.1-linux-amd64.tar.gz</Name></Blob>' +
         '<Blob><Name>helm-v3.14.4-linux-amd64.tar.gz</Name></Blob>' +
         '<Blob><Name>helm-v3.14.4-linux-amd64.tar.gz.sha256</Name></Blob>' +
         '</EnumerationResults>'
      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
         ok: true,
         text: async () => listing
      } as Response)

      expect(await run.resolveLatestPatchVersion(downloadBaseURL, '3.14')).toBe(
         'v3.14.4'
      )
      // A single listing request; no per-patch HEAD probing.
      expect(fetchSpy).toHaveBeenCalledTimes(1)
   })

   test('resolveLatestPatchVersion() - fall back to probing when listing is unavailable', async () => {
      vi.mocked(os.platform).mockReturnValue('linux')
      vi.mocked(os.arch).mockReturnValue('x64')
      const present = new Set(['v3.14.0', 'v3.14.1', 'v3.14.2'])
      vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
         const url = String(input)
         if (url.includes('comp=list')) {
            return {ok: false, status: 404} as Response
         }
         const version = url.match(/helm-(v\d+\.\d+\.\d+)-/)?.[1] ?? ''
         const ok = present.has(version)
         return {ok, status: ok ? 200 : 404} as Response
      })

      expect(await run.resolveLatestPatchVersion(downloadBaseURL, '3.14')).toBe(
         'v3.14.2'
      )
   })

   test('resolveLatestPatchViaListing() - return null when the response is not a listing', async () => {
      vi.mocked(os.platform).mockReturnValue('linux')
      vi.mocked(os.arch).mockReturnValue('x64')
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
         ok: true,
         text: async () => '<html>directory index, not a blob listing</html>'
      } as Response)

      expect(
         await run.resolveLatestPatchViaListing(downloadBaseURL, '3', '14')
      ).toBeNull()
   })

   test('resolveLatestPatchVersion() - tolerate a skipped patch number', async () => {
      vi.mocked(os.platform).mockReturnValue('linux')
      vi.mocked(os.arch).mockReturnValue('x64')
      stubPatchProbes(['v3.14.0', 'v3.14.1', 'v3.14.3'])

      expect(
         await run.resolveLatestPatchVersion(downloadBaseURL, 'v3.14')
      ).toBe('v3.14.3')
   })

   test('resolveLatestPatchVersion() - accept a wildcard patch (.x / .*)', async () => {
      vi.mocked(os.platform).mockReturnValue('linux')
      vi.mocked(os.arch).mockReturnValue('x64')
      stubPatchProbes(['v3.12.0', 'v3.12.1', 'v3.12.2', 'v3.12.3'])

      expect(
         await run.resolveLatestPatchVersion(downloadBaseURL, 'v3.12.x')
      ).toBe('v3.12.3')
      expect(
         await run.resolveLatestPatchVersion(downloadBaseURL, '3.12.*')
      ).toBe('v3.12.3')
   })

   test('resolveLatestPatchVersion() - throw when the minor has no releases', async () => {
      vi.mocked(os.platform).mockReturnValue('linux')
      vi.mocked(os.arch).mockReturnValue('x64')
      stubPatchProbes([])

      await expect(
         run.resolveLatestPatchVersion(downloadBaseURL, '9.99')
      ).rejects.toThrow('No Helm releases found for 9.99')
   })

   test('resolveLatestPatchVersion() - propagate network errors', async () => {
      vi.mocked(os.platform).mockReturnValue('linux')
      vi.mocked(os.arch).mockReturnValue('x64')
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(
         new Error('Network Error')
      )

      await expect(
         run.resolveLatestPatchVersion(downloadBaseURL, '3.14')
      ).rejects.toThrow('Network Error')
   })

   test('resolveLatestPatchVersion() - throw when the host reports every patch as existing', async () => {
      vi.mocked(os.platform).mockReturnValue('linux')
      vi.mocked(os.arch).mockReturnValue('x64')
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({ok: true} as Response)

      await expect(
         run.resolveLatestPatchVersion(downloadBaseURL, '3.14')
      ).rejects.toThrow('exceeded 100 probes')
   })

   test('run() - resolve the latest patch for a major.minor version input', async () => {
      stubDownloadChain()
      inputs('3.14', '')
      stubPatchProbes(['v3.14.0', 'v3.14.1', 'v3.14.2', 'v3.14.3', 'v3.14.4'])

      await run.run()

      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v3.14.4')
   })

   test('run() - resolve the latest patch for a wildcard patch version input', async () => {
      stubDownloadChain()
      inputs('v3.12.x', '')
      stubPatchProbes(['v3.12.0', 'v3.12.1', 'v3.12.2', 'v3.12.3'])

      await run.run()

      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v3.12.3')
   })

   test('run() - resolve the latest patch for a major.minor version-file entry', async () => {
      stubDownloadChain()
      inputs('', '.tool-versions')
      vi.mocked(fs.existsSync).mockReturnValue(true)
      vi.mocked(fs.readFileSync).mockReturnValue('helm 3.14')
      stubPatchProbes(['v3.14.0', 'v3.14.1', 'v3.14.2', 'v3.14.3', 'v3.14.4'])

      await run.run()

      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v3.14.4')
   })

   test('walkSync() - return path to the all files matching fileToFind in dir', () => {
      vi.mocked(fs.readdirSync).mockImplementation((file, _?) => {
         if (file == 'mainFolder')
            return [
               'file1' as unknown as fs.Dirent<NonSharedBuffer>,
               'file2' as unknown as fs.Dirent<NonSharedBuffer>,
               'folder1' as unknown as fs.Dirent<NonSharedBuffer>,
               'folder2' as unknown as fs.Dirent<NonSharedBuffer>
            ]
         if (file == path.join('mainFolder', 'folder1'))
            return [
               'file11' as unknown as fs.Dirent<NonSharedBuffer>,
               'file12' as unknown as fs.Dirent<NonSharedBuffer>
            ]
         if (file == path.join('mainFolder', 'folder2'))
            return [
               'file21' as unknown as fs.Dirent<NonSharedBuffer>,
               'file22' as unknown as fs.Dirent<NonSharedBuffer>
            ]
         return []
      })
      vi.mocked(fs.statSync).mockImplementation((file) => {
         const isDirectory =
            (file as string).toLowerCase().indexOf('file') == -1 ? true : false
         return {isDirectory: () => isDirectory} as fs.Stats
      })

      expect(run.walkSync('mainFolder', null, 'file21')).toEqual([
         path.join('mainFolder', 'folder2', 'file21')
      ])
      expect(fs.readdirSync).toHaveBeenCalledTimes(3)
      expect(fs.statSync).toHaveBeenCalledTimes(8)
   })

   test('walkSync() - return empty array if no file with name fileToFind exists', () => {
      vi.mocked(fs.readdirSync).mockImplementation((file, _?) => {
         if (file == 'mainFolder')
            return [
               'file1' as unknown as fs.Dirent<NonSharedBuffer>,
               'file2' as unknown as fs.Dirent<NonSharedBuffer>,
               'folder1' as unknown as fs.Dirent<NonSharedBuffer>,
               'folder2' as unknown as fs.Dirent<NonSharedBuffer>
            ]
         if (file == path.join('mainFolder', 'folder1'))
            return [
               'file11' as unknown as fs.Dirent<NonSharedBuffer>,
               'file12' as unknown as fs.Dirent<NonSharedBuffer>
            ]
         if (file == path.join('mainFolder', 'folder2'))
            return [
               'file21' as unknown as fs.Dirent<NonSharedBuffer>,
               'file22' as unknown as fs.Dirent<NonSharedBuffer>
            ]
         return []
      })
      vi.mocked(fs.statSync).mockImplementation((file) => {
         const isDirectory =
            (file as string).toLowerCase().indexOf('file') == -1 ? true : false
         return {isDirectory: () => isDirectory} as fs.Stats
      })

      expect(run.walkSync('mainFolder', null, 'helm.exe')).toEqual([])
      expect(fs.readdirSync).toHaveBeenCalledTimes(3)
      expect(fs.statSync).toHaveBeenCalledTimes(8)
   })

   test('findHelm() - change access permissions and find the helm in given directory', () => {
      vi.mocked(fs.chmodSync).mockImplementation(() => {})
      vi.mocked(fs.readdirSync).mockImplementation((file, _?) => {
         if (file == 'mainFolder')
            return ['helm.exe' as unknown as fs.Dirent<NonSharedBuffer>]
         return []
      })
      vi.mocked(fs.statSync).mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })
      vi.mocked(os.platform).mockReturnValue('win32')

      expect(run.findHelm('mainFolder')).toBe(
         path.join('mainFolder', 'helm.exe')
      )
   })

   test('findHelm() - throw error if executable not found', () => {
      vi.mocked(fs.chmodSync).mockImplementation(() => {})
      vi.mocked(fs.readdirSync).mockImplementation((file, _?) => {
         if (file == 'mainFolder') return []
         return []
      })
      vi.mocked(fs.statSync).mockImplementation((file) => {
         return {isDirectory: () => true} as fs.Stats
      })
      vi.mocked(os.platform).mockReturnValue('win32')

      expect(() => run.findHelm('mainFolder')).toThrow(
         'Helm executable not found in path mainFolder'
      )
   })

   test('downloadHelm() - download helm and return path to it', async () => {
      vi.mocked(toolCache.find).mockReturnValue('')
      vi.mocked(toolCache.downloadTool).mockResolvedValue('pathToTool')
      const response = JSON.stringify([{tag_name: 'v4.0.0'}])
      vi.mocked(fs.readFileSync).mockReturnValue(response)
      vi.mocked(os.platform).mockReturnValue('win32')
      vi.mocked(os.arch).mockReturnValue('x64')
      vi.mocked(fs.chmodSync).mockImplementation(() => {})
      vi.mocked(toolCache.extractZip).mockResolvedValue('extractedPath')
      vi.mocked(toolCache.cacheDir).mockResolvedValue('pathToCachedDir')
      vi.mocked(fs.readdirSync).mockImplementation((file, _?) => [
         'helm.exe' as unknown as fs.Dirent<NonSharedBuffer>
      ])
      vi.mocked(fs.statSync).mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })

      expect(await run.downloadHelm(downloadBaseURL, 'v4.0.0')).toBe(
         path.join('pathToCachedDir', 'helm.exe')
      )
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v4.0.0')
      expect(toolCache.downloadTool).toHaveBeenCalledWith(
         'https://test.tld/helm-v4.0.0-windows-amd64.zip'
      )
      expect(fs.chmodSync).toHaveBeenCalledWith('pathToTool', '755')
      expect(toolCache.extractZip).toHaveBeenCalledWith('pathToTool')
      expect(fs.chmodSync).toHaveBeenCalledWith(
         path.join('pathToCachedDir', 'helm.exe'),
         '755'
      )
   })

   test('downloadHelm() - throw error if unable to download', async () => {
      vi.mocked(toolCache.find).mockReturnValue('')
      vi.mocked(toolCache.downloadTool).mockImplementation(async () => {
         throw 'Unable to download'
      })
      vi.mocked(os.platform).mockReturnValue('win32')
      vi.mocked(os.arch).mockReturnValue('x64')

      const downloadUrl = 'https://test.tld/helm-v3.2.1-windows-amd64.zip'
      await expect(run.downloadHelm(downloadBaseURL, 'v3.2.1')).rejects.toThrow(
         `Failed to download Helm from location ${downloadUrl}`
      )
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v3.2.1')
      expect(toolCache.downloadTool).toHaveBeenCalledWith(`${downloadUrl}`)
   })

   test('downloadHelm() - return path to helm tool with same version from toolCache', async () => {
      vi.mocked(toolCache.find).mockReturnValue('pathToCachedDir')
      vi.mocked(toolCache.cacheDir).mockResolvedValue('pathToCachedDir')
      vi.mocked(toolCache.downloadTool).mockResolvedValue('pathToTool')
      vi.mocked(toolCache.extractZip).mockResolvedValue('extractedPath')
      vi.mocked(os.platform).mockReturnValue('win32')
      vi.mocked(os.arch).mockReturnValue('x64')
      vi.mocked(fs.chmodSync).mockImplementation(() => {})
      vi.mocked(fs.readdirSync).mockReturnValue([
         'helm.exe' as unknown as fs.Dirent<NonSharedBuffer>
      ])
      vi.mocked(fs.statSync).mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })

      expect(await run.downloadHelm(downloadBaseURL, 'v3.2.1')).toBe(
         path.join('pathToCachedDir', 'helm.exe')
      )
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v3.2.1')
      expect(fs.chmodSync).toHaveBeenCalledWith(
         path.join('pathToCachedDir', 'helm.exe'),
         '755'
      )
   })

   test('downloadHelm() - throw error is helm is not found in path', async () => {
      vi.mocked(toolCache.find).mockReturnValue('')
      vi.mocked(toolCache.downloadTool).mockResolvedValue('pathToTool')
      vi.mocked(toolCache.cacheDir).mockResolvedValue('pathToCachedDir')
      vi.mocked(toolCache.downloadTool).mockResolvedValue('pathToTool')
      vi.mocked(toolCache.extractZip).mockResolvedValue('extractedPath')
      vi.mocked(os.platform).mockReturnValue('win32')
      vi.mocked(os.arch).mockReturnValue('x64')
      vi.mocked(fs.chmodSync).mockImplementation(() => {})
      vi.mocked(fs.readdirSync).mockImplementation((file, _?) => [])
      vi.mocked(fs.statSync).mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })

      await expect(run.downloadHelm(downloadBaseURL, 'v3.2.1')).rejects.toThrow(
         'Helm executable not found in path pathToCachedDir'
      )
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v3.2.1')
      expect(toolCache.downloadTool).toHaveBeenCalledWith(
         'https://test.tld/helm-v3.2.1-windows-amd64.zip'
      )
      expect(fs.chmodSync).toHaveBeenCalledWith('pathToTool', '755')
      expect(toolCache.extractZip).toHaveBeenCalledWith('pathToTool')
   })
})
