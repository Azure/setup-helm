// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from 'os'
import * as path from 'path'
import * as util from 'util'
import * as fs from 'fs'

import * as toolCache from '@actions/tool-cache'
import * as core from '@actions/core'

const helmToolName = 'helm'
export const stableHelmVersion = 'v3.18.4'

export async function run() {
   let version = core.getInput('version')
   const versionFile = core.getInput('version-file')

   if (versionFile) {
      if (version && version !== 'latest') {
         core.warning(
            `Both 'version' and 'version-file' inputs are specified, only 'version' will be used.`
         )
      } else {
         version = getVersionFromToolVersionsFile(versionFile)
         core.info(`Resolved Helm version '${version}' from '${versionFile}'`)
      }
   }

   if (!version) {
      version = 'latest'
   }

   if (version !== 'latest' && version[0] !== 'v') {
      version = getValidVersion(version)
      core.info(`Normalized Helm version to '${version}'`)
   }
   if (version.toLocaleLowerCase() === 'latest') {
      version = await getLatestHelmVersion()
   }

   const downloadBaseURL = core.getInput('downloadBaseURL', {required: false})

   core.startGroup(`Installing ${version}`)
   const cachedPath = await downloadHelm(downloadBaseURL, version)
   core.endGroup()

   try {
      if (!process.env['PATH']?.startsWith(path.dirname(cachedPath))) {
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

// Matches a semantic version (major.minor.patch) with an optional leading 'v'
// and optional pre-release / build-metadata suffixes, e.g. '3.14.0', 'v3.14.0',
// '3.14.0-rc.1'.
const semVerShape = /^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/

// Returns true when version looks like a semantic version
export function isSemVerShaped(version: string): boolean {
   return semVerShape.test(version)
}

// Reads a .tool-versions file and returns the helm version declared in it
export function getVersionFromToolVersionsFile(filePath: string): string {
   if (!fs.existsSync(filePath)) {
      throw new Error(`The version-file '${filePath}' does not exist`)
   }
   const content = fs.readFileSync(filePath, 'utf8')
   const version = parseToolVersions(content)
   if (!version) {
      throw new Error(`No helm version found in '${filePath}'`)
   }
   if (!isSemVerShaped(version)) {
      throw new Error(
         `The helm version '${version}' in '${filePath}' is not a valid semantic version`
      )
   }
   return version
}

// Parses .tool-versions content (asdf/mise format) and returns the first
// helm version, or an empty string when none is declared. Lines look like
// `helm 3.14.0`; comments (#) and blank lines are ignored.
export function parseToolVersions(content: string): string {
   for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) {
         continue
      }
      const [tool, version] = trimmed.split(/\s+/)
      if (tool === helmToolName && version) {
         return version
      }
   }
   return ''
}

// Gets the latest helm version or returns a default stable if getting latest fails
export async function getLatestHelmVersion(): Promise<string> {
   try {
      const response = await fetch('https://get.helm.sh/helm-latest-version')
      const release = (await response.text()).trim()
      return release
   } catch (err) {
      core.warning(
         `Error while fetching latest Helm release: ${err instanceof Error ? err.message : String(err)}. Using default version ${stableHelmVersion}`
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
   if (cachedToolpath) {
      core.info(`Restoring '${version}' from cache`)
   } else {
      core.info(`Downloading '${version}' from '${baseURL}'`)
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

      fs.chmodSync(helmDownloadPath, '755')
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

   fs.chmodSync(helmpath, '755')
   return helmpath
}

export function findHelm(rootFolder: string): string {
   fs.chmodSync(rootFolder, '755')
   let filelist: string[] = []
   walkSync(rootFolder, filelist, helmToolName + getExecutableExtension())
   if (!filelist || filelist.length == 0) {
      throw new Error(
         util.format('Helm executable not found in path', rootFolder)
      )
   } else {
      return filelist[0]
   }
}

export function walkSync(dir, filelist, fileToFind) {
   const files = fs.readdirSync(dir)
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
