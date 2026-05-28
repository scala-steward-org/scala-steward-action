import * as path from 'path'
import * as os from 'os'
import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as io from '@actions/io'
import * as exec from '@actions/exec'
import {type NonEmptyString} from '../core/types'
import {execute} from '../core/exec'

/**
 * Downloads the `coursier` CLI binary and adds it to the `PATH`.
 *
 * Splitting this out from `install()` lets callers run it before
 * the health check so `cs` is available on the `PATH` for the
 * connectivity probe.
 *
 * Throws error if the download fails.
 */
export async function selfInstall(): Promise<void> {
  try {
    const coursierUrl = core.getInput('coursier-cli-url')

    core.debug(`Installing coursier from ${coursierUrl}`)

    const binary = path.join(os.homedir(), '.local', 'bin')
    await io.mkdirP(binary)

    const zip = await tc.downloadTool(coursierUrl, path.join(binary, 'cs.gz'))

    await exec.exec('gzip', ['-df', zip], {silent: true})
    await exec.exec('chmod', ['+x', path.join(binary, 'cs')], {silent: true})

    core.addPath(binary)

    const coursierVersion = await execute('cs', 'version')

    core.info(`✓ Coursier installed, version: ${coursierVersion.trim()}`)
  } catch (error: unknown) {
    core.debug((error as Error).message)
    throw new Error('Unable to install coursier')
  }
}

/**
 * Installs `scalafmt`, `scalafix`, `sbt` and `scala-cli` using
 * `coursier`. Assumes `selfInstall()` has already put `cs` on the
 * `PATH`.
 *
 * Throws error if the installation fails.
 */
export async function install(): Promise<void> {
  try {
    const scalafixDependency = core.getInput('scalafix-dependency')

    core.debug(`Installing scalafix ${scalafixDependency}`)

    const binary = path.join(os.homedir(), '.local', 'bin')
    await io.mkdirP(binary)

    await exec.exec(
      'cs',
      ['install', 'scalafmt', 'scala-cli', 'sbt', '--install-dir', binary],
      {
        silent: true,
        listeners: {stdline: core.debug, errline: core.debug},
      },
    )

    const scalafixBinaryPath = path.join(binary, 'scalafix')

    await exec.exec(
      'cs',
      ['bootstrap', '--main', 'scalafix.cli.Cli', scalafixDependency, '-o', scalafixBinaryPath],
      {
        silent: true,
        listeners: {stdline: core.debug, errline: core.debug},
      },
    )

    const scalafmtVersion = await execute('cs', 'launch', 'scalafmt', '--', '--version')

    core.info(`✓ Scalafmt installed, version: ${scalafmtVersion.replace(/^scalafmt /, '').trim()}`)

    const scalafixVersion = await execute(scalafixBinaryPath, '--version')

    core.info(`✓ Scalafix installed, version: ${scalafixVersion.trim()}`)

    core.info('✓ SBT installed')

    core.info('✓ scala-cli installed')
  } catch (error: unknown) {
    core.debug((error as Error).message)
    throw new Error('Unable to install managed tools')
  }
}

/**
 * Launches an app using `coursier`.
 *
 * Refer to [coursier](https://get-coursier.io/docs/cli-launch) for more information.
 *
 * @param app - The application to launch
 * @param arguments_ - The args to pass to the application launcher.
 * @param extraJars - Extra JARs to be added to the classpath of the launched application. Directories accepted too.
 */
export async function launch(
  app: string,
  arguments_: Array<string | string[]> = [],
  extraJars: NonEmptyString | undefined = undefined,
): Promise<void> {
  core.startGroup(`Launching ${app}`)

  const launchArguments = [
    'launch',
    '--contrib',
    '-r',
    'central:maven-snapshots',
    app,
    ...(extraJars ? ['--extra-jars', extraJars.value] : []),
    '--',
    ...arguments_.flatMap((argument: string | string[]) => (typeof argument === 'string' ? [argument] : argument)),
  ]

  const code = await exec.exec('cs', launchArguments, {
    silent: true,
    ignoreReturnCode: true,
    listeners: {stdline: core.info, errline: core.error},
  })

  core.endGroup()

  if (code !== 0) {
    throw new Error(`Launching ${app} failed`)
  }
}

/**
 * Removes coursier binary
 */
export async function remove(): Promise<void> {
  await io.rmRF(path.join(os.homedir(), '.cache', 'coursier', 'v1'))
  await exec.exec('cs', ['uninstall', '--all'], {
    silent: true,
    ignoreReturnCode: true,
    listeners: {stdline: core.info, errline: core.debug},
  })
}

