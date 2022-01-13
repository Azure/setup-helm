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
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
exports.__esModule = true;
exports.run = exports.findHelm = exports.downloadHelm = exports.walkSync = exports.getStableHelmVersion = exports.getHelmDownloadURL = exports.getExecutableExtension = void 0;
var os = require("os");
var path = require("path");
var util = require("util");
var fs = require("fs");
var semver = require("semver");
var exec = require("@actions/exec");
var toolCache = require("@actions/tool-cache");
var core = require("@actions/core");
var helmToolName = 'helm';
var stableHelmVersion = 'v3.7.1';
var helmAllReleasesUrl = 'https://api.github.com/repos/helm/helm/releases';
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
function getStableHelmVersion() {
    return __awaiter(this, void 0, void 0, function () {
        var downloadPath, responseArray, latestHelmVersion_1, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 2, , 3]);
                    return [4 /*yield*/, toolCache.downloadTool(helmAllReleasesUrl)];
                case 1:
                    downloadPath = _a.sent();
                    responseArray = JSON.parse(fs.readFileSync(downloadPath, 'utf8').toString().trim());
                    latestHelmVersion_1 = semver.clean(stableHelmVersion);
                    responseArray.forEach(function (response) {
                        if (response && response.tag_name) {
                            var currentHelmVerison = semver.clean(response.tag_name.toString());
                            if (currentHelmVerison) {
                                if (currentHelmVerison.toString().indexOf('rc') == -1 && semver.gt(currentHelmVerison, latestHelmVersion_1)) {
                                    //If current helm version is not a pre release and is greater than latest helm version
                                    latestHelmVersion_1 = currentHelmVerison;
                                }
                            }
                        }
                    });
                    latestHelmVersion_1 = "v" + latestHelmVersion_1;
                    return [2 /*return*/, latestHelmVersion_1];
                case 2:
                    error_1 = _a.sent();
                    core.warning(util.format("Cannot get the latest Helm info from %s. Error %s. Using default Helm version %s.", helmAllReleasesUrl, error_1, stableHelmVersion));
                    return [3 /*break*/, 3];
                case 3: return [2 /*return*/, stableHelmVersion];
            }
        });
    });
}
exports.getStableHelmVersion = getStableHelmVersion;
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
function downloadHelm(version) {
    return __awaiter(this, void 0, void 0, function () {
        var cachedToolpath, helmDownloadPath, exception_1, unzipedHelmPath, helmpath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!version) return [3 /*break*/, 2];
                    return [4 /*yield*/, getStableHelmVersion()];
                case 1:
                    version = _a.sent();
                    _a.label = 2;
                case 2:
                    cachedToolpath = toolCache.find(helmToolName, version);
                    if (!!cachedToolpath) return [3 /*break*/, 9];
                    helmDownloadPath = void 0;
                    _a.label = 3;
                case 3:
                    _a.trys.push([3, 5, , 6]);
                    return [4 /*yield*/, toolCache.downloadTool(getHelmDownloadURL(version))];
                case 4:
                    helmDownloadPath = _a.sent();
                    return [3 /*break*/, 6];
                case 5:
                    exception_1 = _a.sent();
                    throw new Error(util.format("Failed to download Helm from location", getHelmDownloadURL(version)));
                case 6:
                    fs.chmodSync(helmDownloadPath, '777');
                    return [4 /*yield*/, toolCache.extractZip(helmDownloadPath)];
                case 7:
                    unzipedHelmPath = _a.sent();
                    return [4 /*yield*/, toolCache.cacheDir(unzipedHelmPath, helmToolName, version)];
                case 8:
                    cachedToolpath = _a.sent();
                    _a.label = 9;
                case 9:
                    helmpath = findHelm(cachedToolpath);
                    if (!helmpath) {
                        throw new Error(util.format("Helm executable not found in path", cachedToolpath));
                    }
                    fs.chmodSync(helmpath, '777');
                    return [2 /*return*/, helmpath];
            }
        });
    });
}
exports.downloadHelm = downloadHelm;
function getLatestHelmVersion() {
    return __awaiter(this, void 0, void 0, function () {
        var command, latestHelm, latestHelmErr, options;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    command = "curl -Ls https://api.github.com/repos/helm/helm/releases | grep 'v3.[0-9]*.[0-9]*' | sed -E 's/ .*/helm/helm/releases/tag/tag/(v[0-9.]+)\".*/1/g' | head -1 | sed -E 's/.*tag///' | sed -E 's/\".*//'";
                    latestHelm = "";
                    latestHelmErr = "";
                    options = {};
                    options.listeners = {
                        stdout: function (data) {
                            latestHelm += data.toString();
                        },
                        stderr: function (data) {
                            latestHelmErr += data.toString();
                        }
                    };
                    return [4 /*yield*/, exec.exec(command, [], options)];
                case 1:
                    _a.sent();
                    if (latestHelmErr !== "")
                        return [2 /*return*/, getStableHelmVersion()];
                    return [2 /*return*/, latestHelm];
            }
        });
    });
}
// isValidVersion checks if verison matches the specified type and is a stable release
function isValidVersion(version, type) {
    if (!version.toLocaleLowerCase().startsWith(type))
        return false;
    return version.indexOf('rc') == -1;
}
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
function run() {
    return __awaiter(this, void 0, void 0, function () {
        var version, cachedPath;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    version = core.getInput('version', { 'required': true });
                    if (!(version.toLocaleLowerCase() === 'latest')) return [3 /*break*/, 2];
                    return [4 /*yield*/, getLatestHelmVersion()];
                case 1:
                    version = _a.sent();
                    _a.label = 2;
                case 2:
                    core.debug(util.format("Downloading %s", version));
                    return [4 /*yield*/, downloadHelm(version)];
                case 3:
                    cachedPath = _a.sent();
                    try {
                        if (!process.env['PATH'].startsWith(path.dirname(cachedPath))) {
                            core.addPath(path.dirname(cachedPath));
                        }
                    }
                    catch (_b) {
                        //do nothing, set as output variable
                    }
                    console.log("Helm tool version: '".concat(version, "' has been cached at ").concat(cachedPath));
                    core.setOutput('helm-path', cachedPath);
                    return [2 /*return*/];
            }
        });
    });
}
exports.run = run;
run()["catch"](core.setFailed);
