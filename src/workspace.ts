import * as core from '@actions/core'
import * as io from '@actions/io'
import fs from 'fs'
import * as exec from '@actions/exec'
import os from 'os'

/**
 * Prepares the Scala Steward workspace that will be used when launching the app.
 *
 * This will involve:
 * - Creating a folder `/ops/scala-steward`.
 * - Creating a `repos.md` file inside workspace containing the repository/repositories to update.
 * - Creating a `askpass.sh` file inside workspace containing the Github token.
 * - Making the previous file executable.
 *
 * @param {string | Buffer} repository - The repository to update or a file containing a list of
 *                                       repositories in Markdown format.
 * @param {string} token - The Github Token used to authenticate into Github.
 * @returns {string} The workspace directory path
 */
export async function prepare(repository: Buffer | string, token: string): Promise<string> {
  try {
    const stewarddir = `${os.homedir()}/scala-steward`
    await io.mkdirP(stewarddir)

    if (typeof repository === 'string') {
      fs.writeFileSync(`${stewarddir}/repos.md`, `- ${repository}`)
    } else {
      fs.writeFileSync(`${stewarddir}/repos.md`, repository)
    }

    fs.writeFileSync(`${stewarddir}/askpass.sh`, `#!/bin/sh\n\necho '${token}'`)
    await exec.exec('chmod', ['+x', `${stewarddir}/askpass.sh`], {silent: true})

    core.info('✓ Scala Steward workspace created')

    return stewarddir
  } catch (error) {
    core.debug(error.message)
    throw new Error('Unable to create Scala Steward workspace')
  }
}

/**
 * Removes the Scala Steward's workspace.
 */
export async function remove(): Promise<void> {
  await io.rmRF(`${os.homedir()}/scala-steward`)
}
