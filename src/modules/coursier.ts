import * as path from 'path'
import * as os from 'os'
import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as io from '@actions/io'
import * as exec from '@actions/exec'
import {type NonEmptyString} from '../core/types'

/**
 * Installs `coursier` and add its executable to the `PATH`.
 *
 * Once coursier is installed, installs the JVM and the `scalafmt`
 * and `scalafix` tools.
 *
 * Throws error if the installation fails.
 */
export async function install(): Promise<void> {
  try {
    const coursierUrl = core.getInput('coursier-cli-url')

    core.debug(`Installing coursier from ${coursierUrl}`)

    const binPath = path.join(os.homedir(), 'bin')
    await io.mkdirP(binPath)

    const zip = await tc.downloadTool(coursierUrl, path.join(binPath, 'cs.gz'))

    await exec.exec('gzip', ['-d', zip], {silent: true})
    await exec.exec('chmod', ['+x', path.join(binPath, 'cs')], {silent: true})

    core.addPath(binPath)

    await exec.exec(
      'cs',
      ['setup', '--yes', '--jvm', 'adoptium:17', '--apps', 'scalafmt,scalafix', '--install-dir', binPath],
      {
        silent: true,
        listeners: {stdline: core.debug, errline: core.debug},
      },
    )

    const coursierVersion = await execute('cs', 'version')

    core.info(`✓ Coursier installed, version: ${coursierVersion.trim()}`)

    const scalafmtVersion = await execute('scalafmt', '--version')

    core.info(`✓ Scalafmt installed, version: ${scalafmtVersion.replace(/^scalafmt /, '').trim()}`)

    const scalafixVersion = await execute('scalafix', '--version')

    core.info(`✓ Scalafix installed, version: ${scalafixVersion.trim()}`)
  } catch (error: unknown) {
    core.debug((error as Error).message)
    throw new Error('Unable to install coursier or managed tools')
  }
}

/**
 * Launches an app using `coursier`.
 *
 * Refer to [coursier](https://get-coursier.io/docs/cli-launch) for more information.
 *
 * @param app - The application's artifact name.
 * @param version - The application's version.
 * @param args - The args to pass to the application launcher.
 */
export async function launch(
  app: string,
  version: NonEmptyString | undefined,
  args: Array<string | string[]> = [],
): Promise<void> {
  const name = version ? `${app}:${version.value}` : app

  core.startGroup(`Launching ${name}`)

  const launchArgs = [
    'launch',
    '--contrib',
    '-r',
    'sonatype:snapshots',
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
  await io.rmRF(path.join(os.homedir(), '.cache', 'coursier', 'v1'))
  await exec.exec('cs', ['uninstall', '--all'], {
    silent: true,
    ignoreReturnCode: true,
    listeners: {stdline: core.info, errline: core.debug},
  })
}

/**
 * Executes a tool and returns its output.
 */
async function execute(tool: string, ...args: string[]): Promise<string> {
  let output = ''

  const code = await exec.exec(tool, args, {
    silent: true,
    ignoreReturnCode: true,
    listeners: {stdout(data) {
      (output += data.toString())
    }, errline: core.debug},
  })

  if (code !== 0) {
    throw new Error(`There was an error while executing '${tool} ${args.join(' ')}'`)
  }

  return output
}
