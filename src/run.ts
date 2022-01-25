// Copyright (c) Microsoft Corporation.
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';
import * as semver from 'semver';

import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';

const helmToolName = 'helm';
const stableHelmVersion = 'v3.8.0';
const helmAllReleasesUrl = 'https://api.github.com/repos/helm/helm/releases';

export function getExecutableExtension(): string {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}

export function getHelmDownloadURL(version: string): string {
    switch (os.type()) {
        case 'Linux':
            return util.format('https://get.helm.sh/helm-%s-linux-amd64.zip', version);

        case 'Darwin':
            return util.format('https://get.helm.sh/helm-%s-darwin-amd64.zip', version);

        case 'Windows_NT':
        default:
            return util.format('https://get.helm.sh/helm-%s-windows-amd64.zip', version);
    }
}

export var walkSync = function (dir, filelist, fileToFind) {
    var files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            filelist = walkSync(path.join(dir, file), filelist, fileToFind);
        }
        else {
            core.debug(file);
            if (file == fileToFind) {
                filelist.push(path.join(dir, file));
            }
        }
    });
    return filelist;
};

export async function downloadHelm(version: string): Promise<string> {
    if (!version) { version = await getLatestHelmVersion(); }
    let cachedToolpath = toolCache.find(helmToolName, version);
    if (!cachedToolpath) {
        let helmDownloadPath;
        try {
            helmDownloadPath = await toolCache.downloadTool(getHelmDownloadURL(version));
        } catch (exception) {
            throw new Error(util.format("Failed to download Helm from location", getHelmDownloadURL(version)));
        }

        fs.chmodSync(helmDownloadPath, '777');
        const unzipedHelmPath = await toolCache.extractZip(helmDownloadPath);
        cachedToolpath = await toolCache.cacheDir(unzipedHelmPath, helmToolName, version);
    }

    const helmpath = findHelm(cachedToolpath);
    if (!helmpath) {
        throw new Error(util.format("Helm executable not found in path", cachedToolpath));
    }

    fs.chmodSync(helmpath, '777');
    return helmpath;
}

// Downloads the helm releases JSON and parses all the recent versions of helm from it. 
// Defaults to sending stable helm version if none are valid or if it fails

export async function getLatestHelmVersion(): Promise<string> {
    let helmJSONPath:string = await toolCache.downloadTool(helmAllReleasesUrl);
    
    try{
        const helmJSON = JSON.parse(fs.readFileSync(helmJSONPath, 'utf-8'))
        for(let i in helmJSON){
            if(isValidVersion(helmJSON[i].tag_name)){
                return helmJSON[i].tag_name;
            }
        }
    } catch(err){
        core.warning(util.format("Error while fetching the latest Helm release. Error: %s. Using default Helm version %s", err.toString(), stableHelmVersion));
        return stableHelmVersion;
    }
    
    return stableHelmVersion;
}

// isValidVersion checks if verison is a stable release
function isValidVersion(version: string): boolean {
    return version.indexOf('rc') == -1;
}

export function findHelm(rootFolder: string): string {
    fs.chmodSync(rootFolder, '777');
    var filelist: string[] = [];
    walkSync(rootFolder, filelist, helmToolName + getExecutableExtension());
    if (!filelist || filelist.length == 0) {
        throw new Error(util.format("Helm executable not found in path", rootFolder));
    }
    else {
        return filelist[0];
    }
}

export async function run() {
    let version = core.getInput('version', { 'required': true });

    if (version.toLocaleLowerCase() === 'latest') {
        version = await getLatestHelmVersion();
    }

    core.debug(util.format("Downloading %s", version));
    let cachedPath = await downloadHelm(version);

    try {

        if (!process.env['PATH'].startsWith(path.dirname(cachedPath))) {
            core.addPath(path.dirname(cachedPath));
        }
    }
    catch {
        //do nothing, set as output variable
    }

    console.log(`Helm tool version: '${version}' has been cached at ${cachedPath}`);
    core.setOutput('helm-path', cachedPath);
}

run().catch(core.setFailed);
