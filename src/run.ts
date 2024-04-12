// Copyright (c) Microsoft Corporation.
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from 'os'
import * as path from 'path'
import * as util from 'util'
import * as fs from 'fs'

import * as toolCache from '@actions/tool-cache'
import * as core from '@actions/core'

const helmToolName = 'helm'
const stableHelmVersion = 'v3.13.3'

export async function run() {
   let version = core.getInput('version', {required: true})

   if (version !== 'latest' && version[0] !== 'v') {
      core.info('Getting latest Helm version')
      version = getValidVersion(version)
   }
   if (version.toLocaleLowerCase() === 'latest') {
      version = await getLatestHelmVersion()
   }

   const downloadBaseURL = core.getInput('downloadBaseURL', {required: false})

   core.startGroup(`Downloading ${version}`)
   const cachedPath = await downloadHelm(downloadBaseURL, version)
   core.endGroup()

   try {
      if (!process.env['PATH'].startsWith(path.dirname(cachedPath))) {
         core.addPath(path.dirname(cachedPath))
      }
   } catch {
      //do nothing, set as output variable
   }

   core.info(`Helm tool version '${version}' has been cached at ${cachedPath}`)
   core.setOutput('helm-path', cachedPath)
}

// Prefixes version with v
export function getValidVersion(version: string): string {
   return 'v' + version
}

// Gets the latest helm version or returns a default stable if getting latest fails
export async function getLatestHelmVersion(): Promise<string> {
   try {
      const response = await fetch('https://get.helm.sh/helm-latest-version')
      const release = (await response.text()).trim()
      return release
   } catch (err) {
      core.warning(
         `Error while fetching latest Helm release: ${err.toString()}. Using default version ${stableHelmVersion}`
      )
      return stableHelmVersion
   }
}

export function getArch(): string {
   return os.arch() === 'x64' ? 'amd64' : os.arch()
}

export function getPlatform(): string {
   return os.platform() === 'win32' ? 'windows' : os.platform()
}

export function getArchiveExtension(): string {
   return os.platform() === 'win32' ? 'zip' : 'tar.gz'
}

export function getExecutableExtension(): string {
   return os.platform() === 'win32' ? '.exe' : ''
}

export function getHelmDownloadURL(baseURL: string, version: string): string {
   const urlPath = `helm-${version}-${getPlatform()}-${getArch()}.${getArchiveExtension()}`
   const url = new URL(urlPath, baseURL)
   return url.toString()
}

export async function downloadHelm(
   baseURL: string,
   version: string
): Promise<string> {
   let cachedToolpath = toolCache.find(helmToolName, version)
   if (!cachedToolpath) {
      let helmDownloadPath
      try {
         helmDownloadPath = await toolCache.downloadTool(
            getHelmDownloadURL(baseURL, version)
         )
      } catch (exception) {
         throw new Error(
            `Failed to download Helm from location ${getHelmDownloadURL(
               baseURL,
               version
            )}`
         )
      }

      fs.chmodSync(helmDownloadPath, '777')
      const extractedPath =
         getPlatform() === 'windows'
            ? await toolCache.extractZip(helmDownloadPath)
            : await toolCache.extractTar(helmDownloadPath)

      cachedToolpath = await toolCache.cacheDir(
         extractedPath,
         helmToolName,
         version
      )
   }

   const helmpath = findHelm(cachedToolpath)
   if (!helmpath) {
      throw new Error(
         util.format('Helm executable not found in path', cachedToolpath)
      )
   }

   fs.chmodSync(helmpath, '777')
   return helmpath
}

export function findHelm(rootFolder: string): string {
   fs.chmodSync(rootFolder, '777')
   var filelist: string[] = []
   walkSync(rootFolder, filelist, helmToolName + getExecutableExtension())
   if (!filelist || filelist.length == 0) {
      throw new Error(
         util.format('Helm executable not found in path', rootFolder)
      )
   } else {
      return filelist[0]
   }
}

export var walkSync = function (dir, filelist, fileToFind) {
   var files = fs.readdirSync(dir)
   filelist = filelist || []
   files.forEach(function (file) {
      if (fs.statSync(path.join(dir, file)).isDirectory()) {
         filelist = walkSync(path.join(dir, file), filelist, fileToFind)
      } else {
         core.debug(file)
         if (file == fileToFind) {
            filelist.push(path.join(dir, file))
         }
      }
   })
   return filelist
}

run().catch(core.setFailed)
