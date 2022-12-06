import fs from 'fs'
import os from 'os'
import path from 'path'
import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as io from '@actions/io'
import * as exec from '@actions/exec'
import jsSHA from 'jssha/dist/sha256'

/**
 * Gets the first eight characters of the SHA-256 hash value for the
 * provided file's contents.
 *
 * @param {string} file - the file for which to calculate the hash
 * @returns {string} the file content's hash
 */
export function hashFile(file: string): string {
  // eslint-disable-next-line unicorn/text-encoding-identifier-case
  const sha = new jsSHA('SHA-256', 'TEXT', {encoding: 'UTF8'})
  sha.update(fs.readFileSync(file).toString())
  return sha.getHash('HEX').slice(0, 8)
}

/**
 * Tries to restore the Scala Steward workspace build from the cache, if any.
 *
 * @param {string} workspace - the Scala Steward workspace directory
 */
export async function restoreWorkspaceCache(workspace: string): Promise<void> {
  try {
    core.startGroup('Trying to restore workspace contents from cache...')

    const hash = hashFile(path.join(workspace, 'repos.md'))
    const paths = [path.join(workspace, 'workspace')]
    const cacheHit = await cache.restoreCache(
      paths,
      `scala-steward-${hash}-${Date.now().toString()}`,
      [`scala-steward-${hash}`, 'scala-steward-'],
    )

    if (cacheHit) {
      core.info('Scala Steward workspace contents restored from cache')
    } else {
      core.info('Scala Steward workspace contents weren\'t found on cache')
    }

    core.endGroup()
  } catch (error: unknown) {
    core.debug((error as Error).message)
    core.warning('Unable to restore workspace from cache')
    core.endGroup()
  }
}

/**
 * Tries to save the Scala Steward workspace build to the cache.
 *
 * @param {string} workspace - the Scala Steward workspace directory
 */
export async function saveWorkspaceCache(workspace: string): Promise<void> {
  try {
    core.startGroup('Saving workspace to cache...')

    // We don't want to keep `workspace/store/refresh_error` nor `workspace/repos` in the cache.
    await io.rmRF(path.join(workspace, 'workspace', 'store', 'refresh_error'))
    await io.rmRF(path.join(workspace, 'workspace', 'repos'))

    const hash = hashFile(path.join(workspace, 'repos.md'))

    await cache.saveCache(
      [path.join(workspace, 'workspace')],
      `scala-steward-${hash}-${Date.now().toString()}`,
    )

    core.info('Scala Steward workspace contents saved to cache')
    core.endGroup()
  } catch (error: unknown) {
    core.debug((error as Error).message)
    core.warning('Unable to save workspace to cache')
    core.endGroup()
  }
}

/**
 * Prepares the Scala Steward workspace that will be used when launching the app.
 *
 * This will involve:
 * - Creating a folder `/ops/scala-steward`.
 * - Creating a `repos.md` file inside workspace containing the repository/repositories to update.
 * - Creating a `askpass.sh` file inside workspace containing the Github token.
 * - Making the previous file executable.
 *
 * @param {string} reposList - The Markdown list of repositories to write to the `repos.md` file. It is only used if no
 *                             GitHub App key is provided on `gitHubAppKey` parameter.
 * @param {string} token - The Github Token used to authenticate into Github.
 * @param {string | undefined} gitHubAppKey - The Github App private key (optional).
 * @returns {string} The workspace directory path
 */
export async function prepare(reposList: string, token: string, gitHubAppKey: string | undefined): Promise<string> {
  try {
    const stewarddir = `${os.homedir()}/scala-steward`
    await io.mkdirP(stewarddir)

    if (gitHubAppKey === undefined) {
      fs.writeFileSync(`${stewarddir}/repos.md`, reposList)
    } else {
      fs.writeFileSync(`${stewarddir}/repos.md`, '')
      fs.writeFileSync(`${stewarddir}/app.pem`, gitHubAppKey)
    }

    fs.writeFileSync(`${stewarddir}/askpass.sh`, `#!/bin/sh\n\necho '${token}'`)
    await exec.exec('chmod', ['+x', `${stewarddir}/askpass.sh`], {silent: true})

    core.info('✓ Scala Steward workspace created')

    return stewarddir
  } catch (error: unknown) {
    core.debug((error as Error).message)
    throw new Error('Unable to create Scala Steward workspace')
  }
}

/**
 * Removes the Scala Steward's workspace.
 */
export async function remove(): Promise<void> {
  await io.rmRF(`${os.homedir()}/scala-steward`)
}
