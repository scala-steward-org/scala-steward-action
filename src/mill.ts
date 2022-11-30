import * as os from 'os'
import * as path from 'path'
import * as core from '@actions/core'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'

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

      await io.mv(millDownload, millBin)

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
