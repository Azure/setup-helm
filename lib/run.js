"use strict";
// Copyright (c) Microsoft Corporation.
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.walkSync = exports.findHelm = exports.downloadHelm = exports.getHelmDownloadURL = exports.getExecutableExtension = exports.getLatestHelmVersion = exports.run = void 0;
const os = require("os");
const path = require("path");
const util = require("util");
const fs = require("fs");
const toolCache = require("@actions/tool-cache");
const core = require("@actions/core");
const helmToolName = 'helm';
const stableHelmVersion = 'v3.8.0';
const helmAllReleasesUrl = 'https://api.github.com/repos/helm/helm/releases';
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let version = core.getInput('version', { 'required': true });
        if (version.toLocaleLowerCase() === 'latest') {
            version = yield getLatestHelmVersion();
        }
        core.debug(util.format("Downloading %s", version));
        let cachedPath = yield downloadHelm(version);
        try {
            if (!process.env['PATH'].startsWith(path.dirname(cachedPath))) {
                core.addPath(path.dirname(cachedPath));
            }
        }
        catch (_a) {
            //do nothing, set as output variable
        }
        console.log(`Helm tool version: '${version}' has been cached at ${cachedPath}`);
        core.setOutput('helm-path', cachedPath);
    });
}
exports.run = run;
// Downloads the helm releases JSON and parses all the recent versions of helm from it. 
// Defaults to sending stable helm version if none are valid or if it fails
function getLatestHelmVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        const helmJSONPath = yield toolCache.downloadTool(helmAllReleasesUrl);
        try {
            const helmJSON = JSON.parse(fs.readFileSync(helmJSONPath, 'utf-8'));
            for (let i in helmJSON) {
                if (isValidVersion(helmJSON[i].tag_name)) {
                    return helmJSON[i].tag_name;
                }
            }
        }
        catch (err) {
            core.warning(util.format("Error while fetching the latest Helm release. Error: %s. Using default Helm version %s", err.toString(), stableHelmVersion));
            return stableHelmVersion;
        }
        return stableHelmVersion;
    });
}
exports.getLatestHelmVersion = getLatestHelmVersion;
// isValidVersion checks if verison is a stable release
function isValidVersion(version) {
    return version.indexOf('rc') == -1;
}
function getExecutableExtension() {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}
exports.getExecutableExtension = getExecutableExtension;
function getHelmDownloadURL(version) {
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
exports.getHelmDownloadURL = getHelmDownloadURL;
function downloadHelm(version) {
    return __awaiter(this, void 0, void 0, function* () {
        let cachedToolpath = toolCache.find(helmToolName, version);
        if (!cachedToolpath) {
            let helmDownloadPath;
            try {
                helmDownloadPath = yield toolCache.downloadTool(getHelmDownloadURL(version));
            }
            catch (exception) {
                throw new Error(util.format("Failed to download Helm from location", getHelmDownloadURL(version)));
            }
            fs.chmodSync(helmDownloadPath, '777');
            const unzipedHelmPath = yield toolCache.extractZip(helmDownloadPath);
            cachedToolpath = yield toolCache.cacheDir(unzipedHelmPath, helmToolName, version);
        }
        const helmpath = findHelm(cachedToolpath);
        if (!helmpath) {
            throw new Error(util.format("Helm executable not found in path", cachedToolpath));
        }
        fs.chmodSync(helmpath, '777');
        return helmpath;
    });
}
exports.downloadHelm = downloadHelm;
function findHelm(rootFolder) {
    fs.chmodSync(rootFolder, '777');
    var filelist = [];
    (0, exports.walkSync)(rootFolder, filelist, helmToolName + getExecutableExtension());
    if (!filelist || filelist.length == 0) {
        throw new Error(util.format("Helm executable not found in path", rootFolder));
    }
    else {
        return filelist[0];
    }
}
exports.findHelm = findHelm;
var walkSync = function (dir, filelist, fileToFind) {
    var files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function (file) {
        if (fs.statSync(path.join(dir, file)).isDirectory()) {
            filelist = (0, exports.walkSync)(path.join(dir, file), filelist, fileToFind);
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
exports.walkSync = walkSync;
run().catch(core.setFailed);
