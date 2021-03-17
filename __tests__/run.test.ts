import * as run from '../src/run'
import * as os from 'os';
import * as toolCache from '@actions/tool-cache';
import * as fs from 'fs';
import * as path from 'path';
import * as core from '@actions/core';

describe('run.ts', () => {
    test('getExecutableExtension() - return .exe when os is Windows', () => {
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');

        expect(run.getExecutableExtension()).toBe('.exe');
        expect(os.type).toBeCalled();         
    });

    test('getExecutableExtension() - return empty string for non-windows OS', () => {
        jest.spyOn(os, 'type').mockReturnValue('Darwin');

        expect(run.getExecutableExtension()).toBe('');         
        expect(os.type).toBeCalled();         
    });

    test('getHelmDownloadURL() - return the URL to download helm for Linux', () => {
        jest.spyOn(os, 'type').mockReturnValue('Linux');
        const kubectlLinuxUrl = 'https://get.helm.sh/helm-v3.2.1-linux-amd64.zip'

        expect(run.getHelmDownloadURL('v3.2.1')).toBe(kubectlLinuxUrl);
        expect(os.type).toBeCalled();         
    });

    test('getHelmDownloadURL() - return the URL to download helm for Darwin', () => {
        jest.spyOn(os, 'type').mockReturnValue('Darwin');
        const kubectlDarwinUrl = 'https://get.helm.sh/helm-v3.2.1-darwin-amd64.zip'

        expect(run.getHelmDownloadURL('v3.2.1')).toBe(kubectlDarwinUrl);
        expect(os.type).toBeCalled();         
    });

    test('getHelmDownloadURL() - return the URL to download helm for Windows', () => {
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');

        const kubectlWindowsUrl = 'https://get.helm.sh/helm-v3.2.1-windows-amd64.zip'
        expect(run.getHelmDownloadURL('v3.2.1')).toBe(kubectlWindowsUrl);
        expect(os.type).toBeCalled();         
    });

    test('getStableHelmVersion() - download stable version file, read version and return it', async () => {
        jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool');
        const response = JSON.stringify(
            [
                {
                    'tag_name': 'v4.0.0'
                }, {
                    'tag_name': 'v3.0.0'
                }, {
                    'tag_name': 'v2.0.0'
                }
            ]
        );
        jest.spyOn(fs, 'readFileSync').mockReturnValue(response);

        expect(await run.getStableHelmVersion()).toBe('v4.0.0');
        expect(toolCache.downloadTool).toBeCalled();
        expect(fs.readFileSync).toBeCalledWith('pathToTool', 'utf8');
    });

    test('getStableHelmVersion() - return default version if error occurs while getting latest version', async () => {
        jest.spyOn(toolCache, 'downloadTool').mockRejectedValue('Unable to download');
        jest.spyOn(core, 'warning').mockImplementation();

        expect(await run.getStableHelmVersion()).toBe('v3.2.1');
        expect(toolCache.downloadTool).toBeCalled();
        expect(core.warning).toBeCalledWith("Cannot get the latest Helm info from https://api.github.com/repos/helm/helm/releases. Error Unable to download. Using default Helm version v3.2.1.");
    });

    test('walkSync() - return path to the all files matching fileToFind in dir', () => {
        jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
            if (file == 'mainFolder') return ['file1' as unknown as fs.Dirent, 'file2' as unknown as fs.Dirent, 'folder1' as unknown as fs.Dirent, 'folder2' as unknown as fs.Dirent];
            if (file == path.join('mainFolder', 'folder1')) return ['file11' as unknown as fs.Dirent, 'file12' as unknown as fs.Dirent];
            if (file == path.join('mainFolder', 'folder2')) return ['file21' as unknown as fs.Dirent, 'file22' as unknown as fs.Dirent];
        });
        jest.spyOn(core, 'debug').mockImplementation();
        jest.spyOn(fs, 'statSync').mockImplementation((file) => {
            const isDirectory = (file as string).toLowerCase().indexOf('file') == -1 ? true: false
            return { isDirectory: () => isDirectory } as fs.Stats;
        });

        expect(run.walkSync('mainFolder', null, 'file21')).toEqual([path.join('mainFolder', 'folder2', 'file21')]);
        expect(fs.readdirSync).toBeCalledTimes(3);
        expect(fs.statSync).toBeCalledTimes(8);
    });

    test('walkSync() - return empty array if no file with name fileToFind exists', () => {
        jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
            if (file == 'mainFolder') return ['file1' as unknown as fs.Dirent, 'file2' as unknown as fs.Dirent, 'folder1' as unknown as fs.Dirent, 'folder2' as unknown as fs.Dirent];
            if (file == path.join('mainFolder', 'folder1')) return ['file11' as unknown as fs.Dirent, 'file12' as unknown as fs.Dirent];
            if (file == path.join('mainFolder', 'folder2')) return ['file21' as unknown as fs.Dirent, 'file22' as unknown as fs.Dirent];
        });
        jest.spyOn(core, 'debug').mockImplementation();
        jest.spyOn(fs, 'statSync').mockImplementation((file) => {
            const isDirectory = (file as string).toLowerCase().indexOf('file') == -1 ? true: false
            return { isDirectory: () => isDirectory } as fs.Stats;
        });

        expect(run.walkSync('mainFolder', null, 'helm.exe')).toEqual([]);
        expect(fs.readdirSync).toBeCalledTimes(3);
        expect(fs.statSync).toBeCalledTimes(8);
    });

    test('findHelm() - change access permissions and find the helm in given directory', () => {
        jest.spyOn(fs, 'chmodSync').mockImplementation(() => {});
        jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
            if (file == 'mainFolder') return ['helm.exe' as unknown as fs.Dirent];
        });
        jest.spyOn(fs, 'statSync').mockImplementation((file) => {
            const isDirectory = (file as string).indexOf('folder') == -1 ? false: true
            return { isDirectory: () => isDirectory } as fs.Stats;
        });
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');

        expect(run.findHelm('mainFolder')).toBe(path.join('mainFolder', 'helm.exe'));
    });

    test('findHelm() - throw error if executable not found', () => {
        jest.spyOn(fs, 'chmodSync').mockImplementation(() => {});
        jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => {
            if (file == 'mainFolder') return [];
        });
        jest.spyOn(fs, 'statSync').mockImplementation((file) => { return { isDirectory: () => true } as fs.Stats});
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
        expect(() => run.findHelm('mainFolder')).toThrow('Helm executable not found in path mainFolder');
    });

    test('downloadHelm() - download helm and return path to it', async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('');
        jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool');
        const response = JSON.stringify([{'tag_name': 'v4.0.0'}]);
        jest.spyOn(fs, 'readFileSync').mockReturnValue(response);
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
        jest.spyOn(fs, 'chmodSync').mockImplementation(() => {});
        jest.spyOn(toolCache, 'extractZip').mockResolvedValue('pathToUnzippedHelm');
        jest.spyOn(toolCache, 'cacheDir').mockResolvedValue('pathToCachedDir');
        jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => ['helm.exe' as unknown as fs.Dirent]);
        jest.spyOn(fs, 'statSync').mockImplementation((file) => {
            const isDirectory = (file as string).indexOf('folder') == -1 ? false: true
            return { isDirectory: () =>  isDirectory } as fs.Stats;
        });

        expect(await run.downloadHelm(null)).toBe(path.join('pathToCachedDir', 'helm.exe'));
        expect(toolCache.find).toBeCalledWith('helm', 'v4.0.0');
        expect(toolCache.downloadTool).toBeCalledWith('https://get.helm.sh/helm-v4.0.0-windows-amd64.zip');
        expect(fs.chmodSync).toBeCalledWith('pathToTool', '777');
        expect(toolCache.extractZip).toBeCalledWith('pathToTool');
        expect(fs.chmodSync).toBeCalledWith(path.join('pathToCachedDir', 'helm.exe'), '777');
    });

    test('downloadHelm() - throw error if unable to download', async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('');
        jest.spyOn(toolCache, 'downloadTool').mockImplementation(async () => { throw 'Unable to download'});
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');

        await expect(run.downloadHelm('v3.2.1')).rejects.toThrow('Failed to download Helm from location https://get.helm.sh/helm-v3.2.1-windows-amd64.zip');
        expect(toolCache.find).toBeCalledWith('helm', 'v3.2.1');
        expect(toolCache.downloadTool).toBeCalledWith('https://get.helm.sh/helm-v3.2.1-windows-amd64.zip');
    });

    test('downloadHelm() - return path to helm tool with same version from toolCache', async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('pathToCachedDir');
        jest.spyOn(fs, 'chmodSync').mockImplementation(() => {});

        expect(await run.downloadHelm('v3.2.1')).toBe(path.join('pathToCachedDir', 'helm.exe'));
        expect(toolCache.find).toBeCalledWith('helm', 'v3.2.1');
        expect(fs.chmodSync).toBeCalledWith(path.join('pathToCachedDir', 'helm.exe'), '777');
    });

    test('downloadHelm() - throw error is helm is not found in path', async () => {
        jest.spyOn(toolCache, 'find').mockReturnValue('');
        jest.spyOn(toolCache, 'downloadTool').mockResolvedValue('pathToTool');
        jest.spyOn(os, 'type').mockReturnValue('Windows_NT');
        jest.spyOn(fs, 'chmodSync').mockImplementation();
        jest.spyOn(toolCache, 'extractZip').mockResolvedValue('pathToUnzippedHelm');
        jest.spyOn(toolCache, 'cacheDir').mockResolvedValue('pathToCachedDir');
        jest.spyOn(fs, 'readdirSync').mockImplementation((file, _) => []);
        jest.spyOn(fs, 'statSync').mockImplementation((file) => {
            const isDirectory = (file as string).indexOf('folder') == -1 ? false: true
            return { isDirectory: () =>  isDirectory } as fs.Stats;
        });

        await expect(run.downloadHelm('v3.2.1')).rejects.toThrow('Helm executable not found in path pathToCachedDir');
        expect(toolCache.find).toBeCalledWith('helm', 'v3.2.1');
        expect(toolCache.downloadTool).toBeCalledWith('https://get.helm.sh/helm-v3.2.1-windows-amd64.zip');
        expect(fs.chmodSync).toBeCalledWith('pathToTool', '777');
        expect(toolCache.extractZip).toBeCalledWith('pathToTool');
    });
});  