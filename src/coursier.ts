import process from 'process'
import * as path from 'path'
import * as os from 'os'
import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as io from '@actions/io'
import * as exec from '@actions/exec'

/**
 * Install `coursier` and add its executable to the `PATH`.
 *
 * Throws error if the installation fails.
 */
export async function selfInstall(): Promise<void> {
  try {
    const coursierUrl = core.getInput('coursier-cli-url')

    core.debug(`Installing coursier from ${coursierUrl}`)

    const temporary = await tc.downloadTool(coursierUrl)

    await exec.exec('chmod', ['+x', temporary], {silent: true, ignoreReturnCode: true})

    const homedir = os.homedir()
    const binPath = path.join(homedir, 'bin')

    await io.mkdirP(binPath)
    await io.cp(temporary, path.join(binPath, 'cs'))
    await io.rmRF(temporary)

    core.addPath(binPath)
  } catch (error: unknown) {
    core.debug((error as Error).message)
    throw new Error('Unable to install coursier')
  }

  let version = ''

  const code = await exec.exec('cs', ['--version'], {
    silent: true,
    ignoreReturnCode: true,
    listeners: {stdout(data) {
      (version += data.toString())
    }, errline: core.error},
  })

  if (code !== 0) {
    throw new Error('Unable to install coursier')
  }

  core.info(`✓ Coursier installed, version: ${version.trim()}`)
}

/**
 * Installs an app using `coursier`.
 *
 * Refer to [coursier](https://get-coursier.io/docs/cli-launch) for more information.
 *
 * @param {string} app - The application's name.
 */
export async function install(app: string): Promise<void> {
  const homedir = os.homedir()
  const binPath = path.join(homedir, 'bin')

  let code = await exec.exec('cs', ['install', app, '--install-dir', binPath], {
    silent: true,
    ignoreReturnCode: true,
    listeners: {stdline: core.info, errline: core.debug},
  })

  if (code !== 0) {
    throw new Error(`Installing ${app} failed`)
  }

  let version = ''

  code = await exec.exec(app, ['--version'], {
    silent: true,
    ignoreReturnCode: true,
    listeners: {stdout(data) {
      (version += data.toString())
    }, errline: core.error},
  })

  if (code !== 0) {
    throw new Error(`Installing ${app} failed`)
  }

  core.info(`✓ ${app} installed, version: ${version.trim()}`)
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
  args: Array<string | string[]> = [],
): Promise<void> {
  const name = `${org}:${app}:${version}`

  const debug = 'ACTIONS_STEP_DEBUG' in process.env ? ['--java-opt', '-DLOG_LEVEL=TRACE', '-DROOT_LOG_LEVEL=TRACE'] : []

  core.startGroup(`Launching ${name}`)

  const launchArgs = [
    'launch',
    '-r',
    'sonatype:snapshots',
    ...debug,
    name,
    '--',
    ...args.flatMap((arg: string | string[]) => (typeof arg === 'string' ? [arg] : arg)),
  ]

  const code = await exec.exec('cs', launchArgs, {
    silent: true,
    ignoreReturnCode: true,
    listeners: {stdline: core.info, errline: core.error},
  })

  core.endGroup()

  if (code !== 0) {
    throw new Error(`Launching ${name} failed`)
  }
}

/**
 * Removes coursier binary
 */
export async function remove(): Promise<void> {
  await io.rmRF(path.join(path.join(os.homedir(), 'bin'), 'cs'))
  await io.rmRF(path.join(path.join(os.homedir(), 'bin'), 'scalafmt'))
  await io.rmRF(path.join(path.join(os.homedir(), 'bin'), 'scalafix'))
}
