"use strict";
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
const toolCache = __importStar(require("../node_modules/@actions/tool-cache"));
const core = __importStar(require("../node_modules/@actions/core"));
const helmToolName = 'helm';
const stableHelmVersion = 'v2.14.1';
const helmLatestReleaseUrl = 'https://api.github.com/repos/helm/helm/releases/latest';
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
        return toolCache.downloadTool(helmLatestReleaseUrl).then((downloadPath) => {
            const response = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
            if (!response.tag_name) {
                return stableHelmVersion;
            }
            return response.tag_name;
        }, (error) => {
            core.debug(error);
            core.warning(util.format("Failed to read latest kubectl version from stable.txt. From URL %s. Using default stable version %s", helmLatestReleaseUrl, stableHelmVersion));
            return stableHelmVersion;
        });
    });
}
var walkSync = function (dir, filelist, fileToFind) {
    var fs = fs || require('fs'), files = fs.readdirSync(dir);
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
        let cachedPath = yield downloadHelm(version);
        console.log(`Helm tool version: '${version}' has been cached at ${cachedPath}`);
        core.setOutput('helm-path', cachedPath);
    });
}
run().catch(core.setFailed);
