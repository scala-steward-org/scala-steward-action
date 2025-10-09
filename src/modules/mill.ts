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
    const millVersion = core.getInput('mill-version')

    const cachedPath = tc.find('mill', millVersion)

    if (cachedPath) {
      core.addPath(cachedPath)
    } else {
      const artifactSuffix = getArtifactSuffix()
      const downloadExtension = 'exe'
      const millUrl = `https://repo1.maven.org/maven2/com/lihaoyi/mill-dist${artifactSuffix}/${millVersion}/mill-dist${artifactSuffix}-${millVersion}.${downloadExtension}`

      core.debug(`Attempting to install Mill from ${millUrl}`)

      const binary = path.join(os.homedir(), 'bin')
      await io.mkdirP(binary)

      const mill = await tc.downloadTool(millUrl, path.join(binary, 'mill'))

      await exec.exec('chmod', ['+x', mill], {silent: true, ignoreReturnCode: true})

      await tc.cacheFile(mill, 'mill', 'mill', millVersion)
    }

    core.info(`✓ Mill installed, version: ${millVersion}`)
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

function getArtifactSuffix(): string {
  const platform = os.platform() // 'linux', 'darwin', 'win32'
  const arch = os.arch() // 'x64', 'arm64', etc.

  let suffix = ''

  if (platform === 'linux') {
    suffix = arch === 'arm64'
      ? '-native-linux-aarch64'
      : '-native-linux-amd64'
  } else if (platform === 'darwin') {
    suffix = arch === 'arm64'
      ? '-native-mac-aarch64'
      : '-native-mac-amd64'
  }

  if (suffix === '') {
    core.error('This native mill launcher supports only Linux and macOS.')
    throw new Error('Unable to detect Mill artifact suffix')
  } else {
    return suffix
  }
}
