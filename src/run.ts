// Copyright (c) Microsoft Corporation.
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import * as os from 'os'
import * as path from 'path'
import * as util from 'util'
import * as fs from 'fs'

import * as toolCache from '@actions/tool-cache'
import * as core from '@actions/core'
import {graphql} from '@octokit/graphql'
import {createActionAuth} from '@octokit/auth-action'

const helmToolName = 'helm'
const stableHelmVersion = 'v3.11.1'

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
      const auth = createActionAuth()
      const graphqlAuthenticated = graphql.defaults({
         request: {hook: auth.hook}
      })
      const {repository} = await graphqlAuthenticated(
         `
            {
               repository(name: "helm", owner: "helm") {
                  releases(first: 100, orderBy: {field: CREATED_AT, direction: DESC}) {
                     nodes {
                        tagName
                        isLatest
                        isDraft
                        isPrerelease
                     }
                  }
               }
            }
         `
      )
      const latestValidRelease: string = repository.releases.nodes.find(
         ({tagName, isLatest, isDraft, isPreRelease}) =>
            isValidVersion(tagName) && isLatest && !isDraft && !isPreRelease
      )?.tagName

      if (latestValidRelease) return latestValidRelease
   } catch (err) {
      core.warning(
         `Error while fetching latest Helm release: ${err.toString()}. Using default version ${stableHelmVersion}`
      )
      return stableHelmVersion
   }

   core.warning(
      `Could not find valid release. Using default version ${stableHelmVersion}`
   )
   return stableHelmVersion
}

// isValidVersion checks if verison is a stable release
function isValidVersion(version: string): boolean {
   return version.indexOf('rc') == -1
}

export function getExecutableExtension(): string {
   if (os.type().match(/^Win/)) {
      return '.exe'
   }
   return ''
}

const LINUX = 'Linux'
const MAC_OS = 'Darwin'
const WINDOWS = 'Windows_NT'
const ARM64 = 'arm64'
export function getHelmDownloadURL(baseURL: string, version: string): string {
   const arch = os.arch()
   const operatingSystem = os.type()

   let urlPath = ''

   switch (true) {
      case operatingSystem == LINUX && arch == ARM64:
         urlPath = util.format(`/helm-%s-linux-arm64.zip`, version)
         break
      case operatingSystem == LINUX:
         urlPath = util.format(`/helm-%s-linux-amd64.zip`, version)
         break
      case operatingSystem == MAC_OS && arch == ARM64:
         urlPath = util.format(`/helm-%s-darwin-arm64.zip`, version)
         break
      case operatingSystem == MAC_OS:
         urlPath = util.format(`/helm-%s-darwin-amd64.zip`, version)
         break
      case operatingSystem == WINDOWS:
      default:
         urlPath = util.format(`/helm-%s-windows-amd64.zip`, version)
   }

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
      const unzipedHelmPath = await toolCache.extractZip(helmDownloadPath)
      cachedToolpath = await toolCache.cacheDir(
         unzipedHelmPath,
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
