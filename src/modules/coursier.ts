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
 * Once coursier is installed, installs `scalafmt`
 * `scalafix` and `scala-cli` tools.
 *
 * Throws error if the installation fails.
 */
export async function install(): Promise<void> {
  try {
    const coursierUrl = core.getInput('coursier-cli-url')

    core.debug(`Installing coursier from ${coursierUrl}`)

    const binary = path.join(os.homedir(), 'bin')
    await io.mkdirP(binary)

    const zip = await tc.downloadTool(coursierUrl, path.join(binary, 'cs.gz'))

    await exec.exec('gzip', ['-d', zip], {silent: true})
    await exec.exec('chmod', ['+x', path.join(binary, 'cs')], {silent: true})

    core.addPath(binary)

    await exec.exec(
      'cs',
      ['install', 'scalafmt', 'scalafix', 'scala-cli', '--install-dir', binary],
      {
        silent: true,
        listeners: {stdline: core.debug, errline: core.debug},
      },
    )

    const coursierVersion = await execute('cs', 'version')

    core.info(`✓ Coursier installed, version: ${coursierVersion.trim()}`)

    const scalafmtVersion = await execute('cs', 'launch', 'scalafmt', '--', '--version')

    core.info(`✓ Scalafmt installed, version: ${scalafmtVersion.replace(/^scalafmt /, '').trim()}`)

    const scalafixVersion = await execute('cs', 'launch', 'scalafix', '--', '--version')

    core.info(`✓ Scalafix installed, version: ${scalafixVersion.trim()}`)

    core.info('✓ scala-cli installed')
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
 * @param app - The application to launch
 * @param arguments_ - The args to pass to the application launcher.
 * @param extraJars - Extra JARs to be added to the classpath of the launched application. Directories accepted too.
 */
export async function launch(
  app: string,
  arguments_: Array<string | string[]> = [],
  extraJars: NonEmptyString | undefined,
): Promise<void> {
  core.startGroup(`Launching ${app}`)

  const launchArguments = [
    'launch',
    '--contrib',
    '-r',
    'sonatype:snapshots',
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

/**
 * Executes a tool and returns its output.
 */
async function execute(tool: string, ...arguments_: string[]): Promise<string> {
  let output = ''

  const code = await exec.exec(tool, arguments_, {
    silent: true,
    ignoreReturnCode: true,
    listeners: {
      stdout(data) {
        (output += data.toString())
      }, errline: core.debug,
    },
  })

  if (code !== 0) {
    throw new Error(`There was an error while executing '${tool} ${arguments_.join(' ')}'`)
  }

  return output
}
