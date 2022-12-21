import * as os from 'os'
import * as path from 'path'
import * as core from '@actions/core'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'

/**
 * Installs `Mill` and add its executable to the `PATH`.
 *
 * Throws error if the installation fails.
 */
export async function install(): Promise<void> {
  try {
    const millVersion = core.getInput('mill-version') || '0.10.9'

    const cachedPath = tc.find('mill', millVersion)

    if (cachedPath) {
      core.addPath(cachedPath)
    } else {
      const millUrl = `https://github.com/lihaoyi/mill/releases/download/${millVersion}/${millVersion}`

      core.debug(`Attempting to install Mill from ${millUrl}`)

      const binPath = path.join(os.homedir(), 'bin')
      await io.mkdirP(binPath)

      const mill = await tc.downloadTool(millUrl, path.join(binPath, 'mill'))

      await exec.exec('chmod', ['+x', mill], {silent: true, ignoreReturnCode: true})

      await tc.cacheFile(mill, 'mill', 'mill', millVersion)
    }

    let output = ''

    const code = await exec.exec('mill', ['--version'], {
      silent: true,
      ignoreReturnCode: true,
      listeners: {
        stdout(data) {
          (output += data.toString())
        }, errline: core.debug,
      },
    })

    if (code !== 0) {
      throw new Error('Unable to install Mill')
    }

    const version = output.split('\n')[0].replace(/^Mill Build Tool version /, '').trim()

    core.info(`✓ Mill installed, version: ${version}`)
  } catch (error: unknown) {
    core.error((error as Error).message)
    throw new Error('Unable to install Mill')
  }
}

/**
 * Removes Mill binary
 */
export async function remove(): Promise<void> {
  await io.rmRF(path.join(path.join(os.homedir(), 'bin'), 'mill'))
}
