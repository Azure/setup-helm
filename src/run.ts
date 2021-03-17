// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from 'os';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';
import * as semver from 'semver';

import * as toolCache from '@actions/tool-cache';
import * as core from '@actions/core';
import { graphql } from '@octokit/graphql';

const helmToolName = 'helm';
const stableHelmVersion = 'v3.2.1';
const helmAllReleasesUrl = 'https://api.github.com/repos/helm/helm/releases';
const LATEST_HELM2_VERSION = '2.*';
const LATEST_HELM3_VERSION = '3.*';

function getExecutableExtension(): string {
  if (os.type().match(/^Win/)) {
    return '.exe';
  }
  return '';
}

function getHelmDownloadURL(version: string): string {
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

async function getStableHelmVersion(): Promise<string> {
  try {
    const downloadPath = await toolCache.downloadTool(helmAllReleasesUrl);
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
  } catch (error) {
    core.warning(util.format("Cannot get the latest Helm info from %s. Error %s. Using default Helm version %s.", helmAllReleasesUrl, error, stableHelmVersion));
  }

  return stableHelmVersion;
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

async function downloadHelm(version: string): Promise<string> {
  if (!version) { version = await getStableHelmVersion(); }
  let cachedToolpath = toolCache.find(helmToolName, version);
  if (!cachedToolpath) {
    let helmDownloadPath;
    try {
      helmDownloadPath = await toolCache.downloadTool(getHelmDownloadURL(version));
    } catch (exception) {
      throw new Error(util.format("Failed to download Helm from location ", getHelmDownloadURL(version)));
    }

    fs.chmodSync(helmDownloadPath, '777');
    const unzipedHelmPath = await toolCache.extractZip(helmDownloadPath);
    cachedToolpath = await toolCache.cacheDir(unzipedHelmPath, helmToolName, version);
  }

  const helmpath = findHelm(cachedToolpath);
  if (!helmpath) {
    throw new Error(util.format("Helm executable not found in path ", cachedToolpath));
  }

  fs.chmodSync(helmpath, '777');
  return helmpath;
}

async function getLatestHelmVersionFor(type) {
  console.log("Running graphql")
  console.log(type)
  const token =  core.getInput('token', { 'required': true });
  const versions = await graphql(
    `
      repository(name:"helm"
        owner:"helm") {
        releases(last: 100)  {
            nodes {
              tagName
            }
        }
      }
    }
    `,
    {
      headers: {
        authorization: token
      }
    }
  );
  console.log(versions);
  return stableHelmVersion;
}

function findHelm(rootFolder: string): string {
  fs.chmodSync(rootFolder, '777');
  var filelist: string[] = [];
  walkSync(rootFolder, filelist, helmToolName + getExecutableExtension());
  if (!filelist) {
    throw new Error(util.format("Helm executable not found in path ", rootFolder));
  }
  else {
    return filelist[0];
  }
}

async function run() {
  let version = core.getInput('version', { 'required': true });
  if (version.toLocaleLowerCase() === 'latest') {
    version = await getStableHelmVersion();
  } else if (version === LATEST_HELM2_VERSION) {
    version = 'v' + getLatestHelmVersionFor(2);
  } else if (version === LATEST_HELM3_VERSION) {
    version = 'v' + getLatestHelmVersionFor(3);
  } else if (!version.toLocaleLowerCase().startsWith('v')) {
    version = 'v' + version;
  }

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