import * as os from 'os'
import * as path from 'path'
import {fileURLToPath} from 'url'
import * as core from '@actions/core'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Installs `Mill` wrapper and add its executable to the `PATH`.
 *
 * If wrapperUrl is provided, downloads from that URL.
 * Otherwise, uses the embedded mill binary in the repository.
 * Mill is always added to PATH.
 * Throws error if the installation fails.
 */
export async function install(wrapperUrl?: string): Promise<void> {
  try {
    const binary = path.join(os.homedir(), 'bin')
    await io.mkdirP(binary)

    const millPath = path.join(binary, 'mill')
    const source = wrapperUrl
      ? tc.downloadTool(wrapperUrl, millPath)
      : io.cp(getBundledMillPath(), millPath)

    await source
    await exec.exec('chmod', ['+x', millPath], {silent: true, ignoreReturnCode: true})

    core.addPath(binary)
    core.info('✓ Mill wrapper installed')
  } catch (error: unknown) {
    core.error((error as Error).message)
    throw new Error('Unable to install Mill wrapper')
  }
}

/**
 * Gets the path to the embedded mill binary in the repository.
 * Mill is at repo root; when bundled in dist/, use one level up.
 */
export function getBundledMillPath(): string {
  const relativePath = __dirname.endsWith('dist') ? ['..', 'mill'] : ['..', '..', 'mill']
  return path.resolve(__dirname, ...relativePath)
}

/**
 * Removes Mill binary
 */
export async function remove(): Promise<void> {
  await io.rmRF(path.join(os.homedir(), 'bin', 'mill'))
}
