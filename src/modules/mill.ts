import {readFile, writeFile} from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import {fileURLToPath} from 'node:url'
import * as core from '@actions/core'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import * as exec from '@actions/exec'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const mavenCentral = 'https://repo1.maven.org/maven2'

/**
 * Installs `Mill` wrapper and add its executable to the `PATH`.
 *
 * If wrapperUrl is provided, downloads from that URL.
 * Otherwise, uses the embedded mill binary in the repository and
 * honours the `mill-repository` input by rewriting the Maven Central
 * URL inside the wrapper.
 * Mill is always added to PATH.
 * Throws error if the installation fails.
 */
export async function install(wrapperUrl?: string): Promise<void> {
  try {
    const binary = path.join(os.homedir(), 'bin')
    await io.mkdirP(binary)

    const millPath = path.join(binary, 'mill')

    if (wrapperUrl) {
      await tc.downloadTool(wrapperUrl, millPath)
    } else {
      await io.cp(getBundledMillPath(), millPath)

      const repository = core.getInput('mill-repository')

      if (repository) {
        const wrapper = await readFile(millPath, 'utf8')
        const rewritten = withMavenRepository(wrapper, repository)

        if (rewritten !== wrapper) {
          await writeFile(millPath, rewritten)
        }
      }
    }

    await exec.exec('chmod', ['+x', millPath], {silent: true, ignoreReturnCode: true})

    core.addPath(binary)
    core.info('✓ Mill wrapper installed')
  } catch (error: unknown) {
    core.error(error instanceof Error ? error.message : String(error))
    throw new Error('Unable to install Mill wrapper', {cause: error})
  }
}

/**
 * Rewrites the Maven Central URL in the wrapper script with the
 * given Maven repository. Trailing slashes are stripped from it.
 *
 * The repository is substituted into a shell script that later runs,
 * so anything but a plain https URL is rejected to keep shell
 * metacharacters out of it.
 */
export function withMavenRepository(wrapper: string, repository: string): string {
  const stripped = repository.replace(/\/+$/v, '')

  if (!/^https?:\/\/[\w.~:\/@%+\-]+$/v.test(stripped)) {
    throw new Error(`Invalid mill-repository URL "${repository}"`)
  }

  return wrapper.replaceAll(mavenCentral, stripped)
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
