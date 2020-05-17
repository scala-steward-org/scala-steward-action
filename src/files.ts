import * as core from '@actions/core'
import * as io from '@actions/io'
import fs from 'fs'
import * as exec from '@actions/exec'

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
 */
export async function prepareScalaStewardWorkspace(
  repository: Buffer | string,
  token: string
): Promise<void> {
  try {
    await io.mkdirP('/opt/scala-steward')

    if (typeof repository === 'string') {
      fs.writeFileSync('/opt/scala-steward/repos.md', `- ${repository}`)
    } else {
      fs.writeFileSync('/opt/scala-steward/repos.md', repository)
    }

    fs.writeFileSync('/opt/scala-steward/askpass.sh', `#!/bin/sh\n\necho '${token}'`)
    await exec.exec('chmod', ['+x', '/opt/scala-steward/askpass.sh'], {silent: true})
  } catch (error) {
    core.debug(error.message)
    throw new Error('Unable to create Scala Steward workspace')
  }

  core.info('✓ Scala Steward workspace created')
}
