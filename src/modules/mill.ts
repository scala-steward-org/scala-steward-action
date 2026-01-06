import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as process from 'process'
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
    const millVersion = detectMillVersion()

    if (!millVersion) {
      return
    }

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
 * Detects Mill version from repository configuration files.
 */
export function detectMillVersion(): string | undefined {
  const repoRoot = process.cwd()

  // Check .mill-version
  if (fileExists(path.join(repoRoot, '.mill-version'))) {
    return readFirstLine(path.join(repoRoot, '.mill-version'))
  }

  // Check .config/mill-version
  if (fileExists(path.join(repoRoot, '.config/mill-version'))) {
    return readFirstLine(path.join(repoRoot, '.config/mill-version'))
  }

  // Check build.mill.yaml
  if (fileExists(path.join(repoRoot, 'build.mill.yaml'))) {
    const version = extractFromYaml(path.join(repoRoot, 'build.mill.yaml'), 'mill-version')
    if (version) {
      return version
    }
  }

  // Check build scripts
  for (const script of ['build.mill', 'build.mill.scala', 'build.sc']) {
    const scriptPath = path.join(repoRoot, script)
    if (fileExists(scriptPath)) {
      const version = extractFromScript(scriptPath, 'mill-version')
      if (version) {
        return version
      }
    }
  }

  core.debug('No Mill version detected, is this a Mill project?')
  return undefined
}

export function extractFromYaml(filePath: string, key: string): string | undefined {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const match = /mill-version:\s*([^\n#]+)/.exec(content)
    return match?.[1]?.trim()
  } catch {
    return undefined
  }
}

export function extractFromScript(filePath: string, key: string): string | undefined {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const match = /\/\/\s*\|.*mill-version\s*=\s*([^\n#]+)/.exec(content)
    return match?.[1]?.trim().replaceAll(/['"]|,$/g, '')
  } catch {
    return undefined
  }
}

export function fileExists(filePath: string): boolean {
  try {
    return fs.existsSync(filePath)
  } catch {
    return false
  }
}

export function readFirstLine(filePath: string): string | undefined {
  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return content.split('\n')[0].trim()
  } catch {
    return undefined
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
    millUrl = `https://github.com/com-lihaoyi/mill/releases/download/${millVersionTag}/${millVersion}${downloadSuffix}`
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
