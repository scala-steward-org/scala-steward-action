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
export async function install(): Promise<string> {
  try {
    const millVersion = core.getInput('mill-version') || '0.10.9'

    const cachedPath = tc.find('mill', millVersion)

    if (!cachedPath) {
      const millUrl = `https://github.com/lihaoyi/mill/releases/download/${millVersion}/${millVersion}`

      core.debug(`Attempting to install Mill from ${millUrl}`)

      const millDownload = await tc.downloadTool(millUrl)

      await exec.exec('chmod', ['+x', millDownload], {silent: true, ignoreReturnCode: true})

      const homedir = os.homedir()

      const binPath = path.join(homedir, 'bin')

      const millBin = path.join(binPath, 'mill')

      // We first copy and then remove here to avoid this
      // https://stackoverflow.com/questions/44146393/error-exdev-cross-device-link-not-permitted-rename-nodejs
      // This idea is taken from https://github.com/shelljs/shelljs/pull/187
      // It didn't get merged there, but for our usecase just mimicking this
      // should hopefully work fine.
      await io.cp(millDownload, millBin)
      await io.rmRF(millDownload)

      await tc.cacheFile(millBin, 'mill', 'mill', millVersion)
    }
  } catch (error: unknown) {
    core.error((error as Error).message)
    throw new Error('Unable to install Mill')
  }

  let version = ''

  const code = await exec.exec('mill', ['--version'], {
    silent: true,
    ignoreReturnCode: true,
    listeners: {
      stdout(data) {
        (version += data.toString())
      }, errline: core.error,
    },
  })

  if (code !== 0) {
    throw new Error('Unable to install Mill')
  }

  core.info(`✓ Mill installed, version: ${version.trim()}`)
  return version
}

/**
 * Removes Mill binary
 */
export async function remove(): Promise<void> {
  await io.rmRF(path.join(path.join(os.homedir(), 'bin'), 'mill'))
}
