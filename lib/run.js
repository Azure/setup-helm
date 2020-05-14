"use strict";
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const util = __importStar(require("util"));
const fs = __importStar(require("fs"));
const semver = __importStar(require("semver"));
const toolCache = __importStar(require("@actions/tool-cache"));
const core = __importStar(require("@actions/core"));
const helmToolName = 'helm';
const stableHelmVersion = 'v3.2.1';
const helmAllReleasesUrl = 'https://api.github.com/repos/helm/helm/releases';
function getExecutableExtension() {
    if (os.type().match(/^Win/)) {
        return '.exe';
    }
    return '';
}
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
function getStableHelmVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const downloadPath = yield toolCache.downloadTool(helmAllReleasesUrl);
            const responseArray = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
            let latestHelmVersion = semver.clean(stableHelmVersion);
            responseArray.forEach(response => {
                if (response && response.tag_name) {
                    let currentHelmVerison = semver.clean(response.tag_name.toString());
                    if (currentHelmVerison) {
                        if (currentHelmVerison.toString().indexOf('rc') == -1 && semver.gt(currentHelmVerison, latestHelmVersion)) {
                            //If current helm version is not a pre release and is greater than latest helm version
                            latestHelmVersion = currentHelmVerison;
                        }
                    }
                }
            });
            latestHelmVersion = "v" + latestHelmVersion;
            return latestHelmVersion;
        }
        catch (error) {
            core.warning(util.format("Cannot get the latest Helm info from %s. Error %s. Using default Helm version %s.", helmAllReleasesUrl, error, stableHelmVersion));
        }
        return stableHelmVersion;
    });
}
var walkSync = function (dir, filelist, fileToFind) {
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
function downloadHelm(version) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!version) {
            version = yield getStableHelmVersion();
        }
        let cachedToolpath = toolCache.find(helmToolName, version);
        if (!cachedToolpath) {
            let helmDownloadPath;
            try {
                helmDownloadPath = yield toolCache.downloadTool(getHelmDownloadURL(version));
            }
            catch (exception) {
                throw new Error(util.format("Failed to download Helm from location ", getHelmDownloadURL(version)));
            }
            fs.chmodSync(helmDownloadPath, '777');
            const unzipedHelmPath = yield toolCache.extractZip(helmDownloadPath);
            cachedToolpath = yield toolCache.cacheDir(unzipedHelmPath, helmToolName, version);
        }
        const helmpath = findHelm(cachedToolpath);
        if (!helmpath) {
            throw new Error(util.format("Helm executable not found in path ", cachedToolpath));
        }
        fs.chmodSync(helmpath, '777');
        return helmpath;
    });
}
function findHelm(rootFolder) {
    fs.chmodSync(rootFolder, '777');
    var filelist = [];
    walkSync(rootFolder, filelist, helmToolName + getExecutableExtension());
    if (!filelist) {
        throw new Error(util.format("Helm executable not found in path ", rootFolder));
    }
    else {
        return filelist[0];
    }
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        let version = core.getInput('version', { 'required': true });
        if (version.toLocaleLowerCase() === 'latest') {
            version = yield getStableHelmVersion();
        }
        else if (!version.toLocaleLowerCase().startsWith('v')) {
            version = 'v' + version;
        }
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
run().catch(core.setFailed);
