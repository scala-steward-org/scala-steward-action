import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as io from '@actions/io'
import * as exec from '@actions/exec'
import * as path from 'path'

/**
 * Install `coursier` and add its executable to the `PATH`.
 *
 * Throws error if the installation fails.
 */
export async function install(): Promise<void> {
  try {
    const temp = await tc.downloadTool('https://git.io/coursier-cli-linux')

    await exec.exec('chmod', ['+x', temp], {silent: true, ignoreReturnCode: true})

    const binPath = '/home/runner/bin'
    await io.mkdirP(binPath)
    await io.cp(temp, path.join(binPath, 'cs'))
    await io.rmRF(temp)

    core.addPath(binPath)
  } catch (error) {
    core.debug(error.message)
    throw new Error('Unable to install coursier')
  }

  let version = ''

  const code = await exec.exec('cs', ['--version'], {
    silent: true,
    ignoreReturnCode: true,
    listeners: {stdout: data => (version += data.toString()), errline: core.error}
  })

  if (code !== 0) {
    throw new Error('Unable to install coursier')
  }

  core.info(`✓ Coursier installed, version: ${version.trim()}`)
}

/**
 * Launches an app using `coursier`.
 *
 * Refer to [coursier](https://get-coursier.io/docs/cli-launch) for more information.
 *
 * @param {string} org - The application's organization.
 * @param {string} app - The application's artifact name.
 * @param {string} version - The application's version.
 * @param {(string | string[])[]} args - The args to pass to the application launcher.
 */
export async function launch(
  org: string,
  app: string,
  version: string,
  args: (string | string[])[] = []
): Promise<void> {
  const name = `${org}:${app}:${version}`

  core.startGroup(`Launching ${name}`)

  const launchArgs = ['launch', '-r', 'sonatype:snapshots', name, '--'].concat(
    args.flatMap((arg: string | string[]) => (typeof arg === 'string' ? [arg] : arg))
  )

  const code = await exec.exec('cs', launchArgs, {
    silent: true,
    ignoreReturnCode: true,
    listeners: {stdline: core.info, errline: core.error}
  })

  core.endGroup()

  if (code !== 0) {
    throw new Error(`Launching ${name} failed`)
  }
}
