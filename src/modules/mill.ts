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
      const millUrl = getDownloadUrl(millVersion)

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

/**
  * It dublicates logic from 'mill' bash bootstrap script.
  */
function getDownloadUrl(millVersion: string): string {
  const artifactSuffix = getArtifactSuffix()
  let millUrl: string
  let downloadExtension: string
  let downloadSuffix: string
  let downloadFromMaven: boolean

  if (/^0\.0\.\d+$/.test(millVersion)
     || /^0\.1\.\d+$/.test(millVersion)
     || /^0\.2\.\d+$/.test(millVersion)
     || /^0\.3\.\d+$/.test(millVersion)
     || /^0\.4\.\d+$/.test(millVersion)) {
    downloadSuffix = ''
    downloadFromMaven = false
  } else if (/^0\.5\.\d+$/.test(millVersion)
          || /^0\.6\.\d+$/.test(millVersion)
          || /^0\.7\.\d+$/.test(millVersion)
          || /^0\.8\.\d+$/.test(millVersion)
          || /^0\.9\.\d+$/.test(millVersion)
          || /^0\.10\.\d+$/.test(millVersion)
          || /^0\.11\.0-M-[A-Za-z\d]+$/.test(millVersion)) {
    downloadSuffix = '-assembly'
    downloadFromMaven = false
  } else {
    downloadSuffix = '-assembly'
    downloadFromMaven = true
  }

  if (millVersion === '0.12.0'
     || millVersion === '0.12.1'
     || millVersion === '0.12.2'
     || millVersion === '0.12.3'
     || millVersion === '0.12.4'
     || millVersion === '0.12.5'
     || millVersion === '0.12.6'
     || millVersion === '0.12.7'
     || millVersion === '0.12.8'
     || millVersion === '0.12.9'
     || millVersion === '0.12.10'
     || millVersion === '0.12.11') {
    downloadExtension = 'jar'
  } else if (/^0\.12\.[A-Za-z\d]+$/.test(millVersion)) { // 0.12.*
    downloadExtension = 'exe'
  } else if (/^0\.\d+\.\d+(-[A-Za-z\d.-]+)?$/.test(millVersion)) { // 0.*
    downloadExtension = 'jar'
  } else {
    downloadExtension = 'exe'
  }

  if (downloadFromMaven) {
    millUrl = `https://repo1.maven.org/maven2/com/lihaoyi/mill-dist${artifactSuffix}/${millVersion}/mill-dist${artifactSuffix}-${millVersion}.${downloadExtension}`
  } else {
    const millVersionTag = millVersion.replace(/([^-]+)(-M\d+)?(-.*)?/, '$1$2')
    millUrl = `https://github.com/lihaoyi/mill/releases/download/${millVersionTag}/${millVersion}${downloadSuffix}`
  }

  return millUrl
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
