import * as run from './run'
import * as os from 'os'
import * as toolCache from '@actions/tool-cache'
import * as fs from 'fs'
import * as path from 'path'
import * as core from '@actions/core'

describe('run.ts', () => {
   const downloadBaseURL = 'https://test.tld'

   // Cleanup mocks after each test to ensure that subsequent tests are not affected by the mocks.
   afterEach(() => {
      jest.restoreAllMocks()
   })

   test('getExecutableExtension() - return .exe when os is Windows', () => {
      jest.spyOn(os, 'platform').mockReturnValue('win32')

      expect(run.getExecutableExtension()).toBe('.exe')
      expect(os.platform).toHaveBeenCalled()
   })

   test('getExecutableExtension() - return empty string for non-windows OS', () => {
      jest.spyOn(os, 'platform').mockReturnValue('darwin')

      expect(run.getExecutableExtension()).toBe('')
      expect(os.platform).toHaveBeenCalled()
   })

   test('getHelmDownloadURL() - return the URL to download helm for Linux amd64', () => {
      jest.spyOn(os, 'platform').mockReturnValue('linux')
      jest.spyOn(os, 'arch').mockReturnValue('x64')
      const expected = 'https://test.tld/helm-v3.8.0-linux-amd64.tar.gz'

      expect(run.getHelmDownloadURL(downloadBaseURL, 'v3.8.0')).toBe(expected)
      expect(os.platform).toHaveBeenCalled()
      expect(os.arch).toHaveBeenCalled()
   })

   test('getHelmDownloadURL() - return the URL to download helm for Linux arm64', () => {
      jest.spyOn(os, 'platform').mockReturnValue('linux')
      jest.spyOn(os, 'arch').mockReturnValue('arm64')
      const expected = 'https://test.tld/helm-v3.8.0-linux-arm64.tar.gz'

      expect(run.getHelmDownloadURL(downloadBaseURL, 'v3.8.0')).toBe(expected)
      expect(os.platform).toHaveBeenCalled()
      expect(os.arch).toHaveBeenCalled()
   })

   test('getHelmDownloadURL() - return the URL to download helm for Darwin x64', () => {
      jest.spyOn(os, 'platform').mockReturnValue('darwin')
      jest.spyOn(os, 'arch').mockReturnValue('x64')
      const expected = 'https://test.tld/helm-v3.8.0-darwin-amd64.tar.gz'

      expect(run.getHelmDownloadURL(downloadBaseURL, 'v3.8.0')).toBe(expected)
      expect(os.platform).toHaveBeenCalled()
      expect(os.arch).toHaveBeenCalled()
   })

   test('getHelmDownloadURL() - return the URL to download helm for Darwin arm64', () => {
      jest.spyOn(os, 'platform').mockReturnValue('darwin')
      jest.spyOn(os, 'arch').mockReturnValue('arm64')
      const expected = 'https://test.tld/helm-v3.8.0-darwin-arm64.tar.gz'

      expect(run.getHelmDownloadURL(downloadBaseURL, 'v3.8.0')).toBe(expected)
      expect(os.platform).toHaveBeenCalled()
      expect(os.arch).toHaveBeenCalled()
   })

   test('getHelmDownloadURL() - return the URL to download helm for Windows', () => {
      jest.spyOn(os, 'platform').mockReturnValue('win32')
      jest.spyOn(os, 'arch').mockReturnValue('x64')

      const expected = 'https://test.tld/helm-v3.8.0-windows-amd64.zip'
      expect(run.getHelmDownloadURL(downloadBaseURL, 'v3.8.0')).toBe(expected)
      expect(os.platform).toHaveBeenCalled()
   })

   test('getLatestHelmVersion() - return the latest version of HELM', async () => {
      const res = {
         status: 200,
         text: async () => 'v9.99.999'
      } as Response
      global.fetch = jest.fn().mockReturnValue(res)
      expect(await run.getLatestHelmVersion()).toBe('v9.99.999')
   })

   test('getLatestHelmVersion() - return the stable version of HELM when simulating a network error', async () => {
      const errorMessage: string = 'Network Error'
      global.fetch = jest.fn().mockRejectedValueOnce(new Error(errorMessage))
      expect(await run.getLatestHelmVersion()).toBe('v3.13.3')
   })

   test('getValidVersion() - return version with v prepended', () => {
      expect(run.getValidVersion('3.8.0')).toBe('v3.8.0')
   })

   test('walkSync() - return path to the all files matching fileToFind in dir', () => {
      jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
         if (file == 'mainFolder')
            return [
               'file1' as unknown as fs.Dirent,
               'file2' as unknown as fs.Dirent,
               'folder1' as unknown as fs.Dirent,
               'folder2' as unknown as fs.Dirent
            ]
         if (file == path.join('mainFolder', 'folder1'))
            return [
               'file11' as unknown as fs.Dirent,
               'file12' as unknown as fs.Dirent
            ]
         if (file == path.join('mainFolder', 'folder2'))
            return [
               'file21' as unknown as fs.Dirent,
               'file22' as unknown as fs.Dirent
            ]
         return []
      })
      jest.spyOn(core, 'debug').mockImplementation()
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
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
      jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
         if (file == 'mainFolder')
            return [
               'file1' as unknown as fs.Dirent,
               'file2' as unknown as fs.Dirent,
               'folder1' as unknown as fs.Dirent,
               'folder2' as unknown as fs.Dirent
            ]
         if (file == path.join('mainFolder', 'folder1'))
            return [
               'file11' as unknown as fs.Dirent,
               'file12' as unknown as fs.Dirent
            ]
         if (file == path.join('mainFolder', 'folder2'))
            return [
               'file21' as unknown as fs.Dirent,
               'file22' as unknown as fs.Dirent
            ]
         return []
      })
      jest.spyOn(core, 'debug').mockImplementation()
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).toLowerCase().indexOf('file') == -1 ? true : false
         return {isDirectory: () => isDirectory} as fs.Stats
      })

      expect(run.walkSync('mainFolder', null, 'helm.exe')).toEqual([])
      expect(fs.readdirSync).toHaveBeenCalledTimes(3)
      expect(fs.statSync).toHaveBeenCalledTimes(8)
   })

   test('findHelm() - change access permissions and find the helm in given directory', () => {
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
         if (file == 'mainFolder') return ['helm.exe' as unknown as fs.Dirent]
         return []
      })
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         const isDirectory =
            (file as string).indexOf('folder') == -1 ? false : true
         return {isDirectory: () => isDirectory} as fs.Stats
      })
      jest.spyOn(os, 'platform').mockReturnValue('win32')

      expect(run.findHelm('mainFolder')).toBe(
         path.join('mainFolder', 'helm.exe')
      )
   })

   test('findHelm() - throw error if executable not found', () => {
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
         if (file == 'mainFolder') return []
         return []
      })
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
         return {isDirectory: () => true} as fs.Stats
      })
      jest.spyOn(os, 'platform').mockReturnValue('win32')

      expect(() => run.findHelm('mainFolder')).toThrow(
         'Helm executable not found in path mainFolder'
      )
   })

   test('downloadHelm() - download helm and return path to it', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      const response = JSON.stringify([{tag_name: 'v4.0.0'}])
      jest.spyOn(fs, 'readFileSync').mockReturnValue(response)
      jest.spyOn(os, 'platform').mockReturnValue('win32')
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      jest.spyOn(toolCache, 'extractZip').mockResolvedValue('extractedPath')
      jest.spyOn(toolCache, 'cacheDir').mockResolvedValue('pathToCachedDir')
      jest
         .spyOn(fs, 'readdirSync')
         .mockImplementation((file, _) => ['helm.exe' as unknown as fs.Dirent])
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
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
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest.spyOn(toolCache, 'downloadTool').mockImplementation(async () => {
         throw 'Unable to download'
      })
      jest.spyOn(os, 'platform').mockReturnValue('win32')

      const downloadUrl = 'https://test.tld/helm-v3.2.1-windows-amd64.zip'
      await expect(run.downloadHelm(downloadBaseURL, 'v3.2.1')).rejects.toThrow(
         `Failed to download Helm from location ${downloadUrl}`
      )
      expect(toolCache.find).toHaveBeenCalledWith('helm', 'v3.2.1')
      expect(toolCache.downloadTool).toHaveBeenCalledWith(`${downloadUrl}`)
   })

   test('downloadHelm() - return path to helm tool with same version from toolCache', async () => {
      jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedDir')
      jest.spyOn(toolCache, 'cacheDir').mockResolvedValue('pathToCachedDir')
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      jest.spyOn(toolCache, 'extractZip').mockResolvedValue('extractedPath')
      jest.spyOn(os, 'platform').mockReturnValue('win32')
      jest.spyOn(fs, 'chmodSync').mockImplementation(() => {})
      jest
         .spyOn(fs, 'readdirSync')
         .mockReturnValue(['helm.exe' as unknown as fs.Dirent])
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
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
      jest.spyOn(toolCache, 'find').mockReturnValue('')
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      jest.spyOn(toolCache, 'cacheDir').mockResolvedValue('pathToCachedDir')
      jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool')
      jest.spyOn(toolCache, 'extractZip').mockResolvedValue('extractedPath')
      jest.spyOn(os, 'platform').mockReturnValue('win32')
      jest.spyOn(fs, 'chmodSync').mockImplementation()
      jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => [])
      jest.spyOn(fs, 'statSync').mockImplementation((file) => {
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
