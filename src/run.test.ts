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
      readFileSync: vi.fn()
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
      vi.stubGlobal('fetch', vi.fn().mockReturnValue(res))
      expect(await run.getLatestHelmVersion()).toBe('v9.99.999')
   })

   test('getLatestHelmVersion() - return the stable version of HELM when simulating a network error', async () => {
      const errorMessage: string = 'Network Error'
      vi.stubGlobal(
         'fetch',
         vi.fn().mockRejectedValueOnce(new Error(errorMessage))
      )
      expect(await run.getLatestHelmVersion()).toBe(run.stableHelmVersion)
   })

   test('getValidVersion() - return version with v prepended', () => {
      expect(run.getValidVersion('3.8.0')).toBe('v3.8.0')
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
      expect(fs.chmodSync).toHaveBeenCalledWith('pathToTool', '777')
      expect(toolCache.extractZip).toHaveBeenCalledWith('pathToTool')
      expect(fs.chmodSync).toHaveBeenCalledWith(
         path.join('pathToCachedDir', 'helm.exe'),
         '777'
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
         '777'
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
      expect(fs.chmodSync).toHaveBeenCalledWith('pathToTool', '777')
      expect(toolCache.extractZip).toHaveBeenCalledWith('pathToTool')
   })
})
