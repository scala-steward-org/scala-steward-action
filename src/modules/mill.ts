import * as os from 'os'
import * as path from 'path'
import * as core from '@actions/core'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'

type MillDependencies = {
  getInput(name: string): string;
  find(toolName: string, versionSpec: string): string;
  addPath(inputPath: string): void;
  debug(message: string): void;
  info(message: string): void;
  error(message: string): void;
  homedir(): string;
  platform(): NodeJS.Platform;
  arch(): string;
  mkdirP(path: string): Promise<void>;
  downloadTool(url: string, destination?: string): Promise<string>;
  exec(commandLine: string, arguments_?: string[], options?: exec.ExecOptions): Promise<number>;
  cacheFile(sourceFile: string, targetFile: string, tool: string, version: string): Promise<string>;
}

/**
 * Installs `Mill` and add its executable to the `PATH`.
 *
 * Throws error if the installation fails.
 */
export async function install(): Promise<void> {
  return installWith({
    getInput: core.getInput,
    find: tc.find,
    addPath: core.addPath,
    debug: core.debug,
    info: core.info,
    error: core.error,
    homedir: os.homedir,
    platform: os.platform,
    arch: os.arch,
    mkdirP: io.mkdirP,
    downloadTool: tc.downloadTool,
    exec: exec.exec,
    cacheFile: tc.cacheFile,
  })
}

export async function installWith(dependencies: MillDependencies): Promise<void> {
  try {
    const millVersion = dependencies.getInput('mill-version')

    const cachedPath = dependencies.find('mill', millVersion)

    if (cachedPath) {
      dependencies.addPath(cachedPath)
    } else {
      const millUrl = getDownloadUrl(millVersion, dependencies.platform(), dependencies.arch())

      dependencies.debug(`Attempting to install Mill from ${millUrl}`)

      const binary = path.join(dependencies.homedir(), 'bin')
      await dependencies.mkdirP(binary)

      const mill = await dependencies.downloadTool(millUrl, path.join(binary, 'mill'))

      await dependencies.exec('chmod', ['+x', mill], {silent: true, ignoreReturnCode: true})

      await dependencies.cacheFile(mill, 'mill', 'mill', millVersion)
      dependencies.addPath(binary)
    }

    dependencies.info(`✓ Mill installed, version: ${millVersion}`)
  } catch (error: unknown) {
    dependencies.error((error as Error).message)
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
function getDownloadUrl(millVersion: string, platform: NodeJS.Platform, arch: string): string {
  const artifactSuffix = getArtifactSuffix(platform, arch)
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

function getArtifactSuffix(platform: NodeJS.Platform, arch: string): string {
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
