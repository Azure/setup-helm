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

   const downloadBaseURL = core.getInput('downloadBaseURL', {required: false})

   if (version.toLocaleLowerCase() === 'latest') {
      version = await getLatestHelmVersion()
   } else if (isMajorMinorShaped(version)) {
      version = await resolveLatestPatchVersion(downloadBaseURL, version)
      core.info(`Resolved latest patch Helm version to '${version}'`)
   } else if (version[0] !== 'v') {
      version = getValidVersion(version)
      core.info(`Normalized Helm version to '${version}'`)
   }

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

// Matches a complete semantic version (major.minor.patch with optional
// pre-release / build metadata). This is the official regex suggested at
// https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
// with an added optional leading 'v' to accept Helm-style tags (e.g. 'v3.14.0').
const semVerShape =
   /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/

// Returns true when version looks like a semantic version
export function isSemVerShaped(version: string): boolean {
   return semVerShape.test(version)
}

// Matches a major.minor version with an optional leading 'v' and either no
// patch component or a wildcard patch ('.x' / '.*'), e.g. '3.14', 'v3.14',
// '3.14.x', 'v3.14.*'.
const majorMinorShape = /^v?\d+\.\d+(?:\.[x*])?$/

// Returns true when version is a major.minor value (optionally with a wildcard
// patch such as '.x' or '.*')
export function isMajorMinorShaped(version: string): boolean {
   return majorMinorShape.test(version)
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
   if (!isSemVerShaped(version) && !isMajorMinorShaped(version)) {
      throw new Error(
         `The helm version '${version}' in '${filePath}' is not valid. Provide a full version (e.g. '3.14.0') or a major.minor version (e.g. '3.14' or '3.14.x')`
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

// Number of consecutive missing patches to probe before concluding the walk,
// and an upper bound to keep resolution from running unbounded.
const patchLookahead = 3
const maxPatch = 100

// Sends a HEAD request for the given version's download URL. Returns true when
// the artifact exists (2xx) and false only when it is definitively absent
// (404). Any other status (403/405/429/5xx, ...) and genuine network errors are
// thrown, so transient failures, rate-limiting, or a host that disallows HEAD
// are never mistaken for a missing patch.
export async function helmPatchExists(
   baseURL: string,
   version: string
): Promise<boolean> {
   const url = getHelmDownloadURL(baseURL, version)
   const response = await fetch(url, {method: 'HEAD'})
   if (response.ok) {
      return true
   }
   if (response.status === 404) {
      return false
   }
   throw new Error(
      `Unexpected HTTP ${response.status} while checking for Helm artifact at ${url}`
   )
}

// Attempts to resolve the latest patch in a single request via the Azure Blob
// container-listing API that backs get.helm.sh. Returns the newest stable patch
// version, or null when the host does not support listing (any non-listing
// response, empty result, or error) so the caller can fall back to probing.
// Only 'major.minor.patch-<platform>' names are matched, so prereleases and
// sidecar files (.sha256, ...) are ignored.
export async function resolveLatestPatchViaListing(
   baseURL: string,
   major: string,
   minor: string
): Promise<string | null> {
   let body: string
   try {
      const listURL = new URL(baseURL)
      listURL.searchParams.set('restype', 'container')
      listURL.searchParams.set('comp', 'list')
      listURL.searchParams.set('prefix', `helm-v${major}.${minor}.`)
      const response = await fetch(listURL.toString())
      if (!response.ok) {
         return null
      }
      body = await response.text()
   } catch {
      return null
   }

   if (!body.includes('<EnumerationResults')) {
      return null
   }

   const patchPattern = new RegExp(
      `helm-v${major}\\.${minor}\\.(\\d+)-(?:darwin|linux|windows)`,
      'g'
   )
   let latestPatch = -1
   for (const match of body.matchAll(patchPattern)) {
      const patch = Number(match[1])
      if (patch > latestPatch) {
         latestPatch = patch
      }
   }

   if (latestPatch < 0) {
      return null
   }
   return `v${major}.${minor}.${latestPatch}`
}

// Resolves a major.minor value (e.g. '3.14' or 'v3.14') to the newest available
// patch (e.g. 'v3.14.4'). Fast path: a single container-listing request (which
// get.helm.sh supports). When the host does not support listing, it falls back
// to probing the download host for sequential patches. Only 'major.minor.n'
// artifacts are considered, so prereleases are never selected.
export async function resolveLatestPatchVersion(
   baseURL: string,
   version: string
): Promise<string> {
   const [major, minor] = (
      version[0] === 'v' ? version.slice(1) : version
   ).split('.')

   const listed = await resolveLatestPatchViaListing(baseURL, major, minor)
   if (listed) {
      return listed
   }

   if (!(await helmPatchExists(baseURL, `v${major}.${minor}.0`))) {
      throw new Error(`No Helm releases found for ${major}.${minor}`)
   }

   let latestPatch = 0
   let consecutiveMisses = 0
   for (
      let patch = 1;
      patch <= maxPatch && consecutiveMisses < patchLookahead;
      patch++
   ) {
      if (await helmPatchExists(baseURL, `v${major}.${minor}.${patch}`)) {
         latestPatch = patch
         consecutiveMisses = 0
      } else {
         consecutiveMisses++
      }
   }

   // The look-ahead is what should end the walk. Exhausting maxPatch without a
   // trailing run of misses means the host answered 200 for every probe (e.g. a
   // catch-all mirror), so the resolved version cannot be trusted.
   if (consecutiveMisses < patchLookahead) {
      throw new Error(
         `Unable to resolve latest patch for ${major}.${minor} (exceeded ${maxPatch} probes)`
      )
   }

   return `v${major}.${minor}.${latestPatch}`
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
   // Ensure the base ends with '/' so a subpath mirror (e.g.
   // 'https://example/kubernetes/helm') is preserved; otherwise URL resolution
   // replaces the last path segment and points at the wrong location.
   const base = baseURL.endsWith('/') ? baseURL : `${baseURL}/`
   const url = new URL(urlPath, base)
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
