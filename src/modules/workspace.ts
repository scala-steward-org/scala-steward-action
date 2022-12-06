import path from 'path'
import jsSHA from 'jssha/dist/sha256'
import {type ActionCache} from '../core/cache'
import {type Files} from '../core/files'
import {type Logger} from '../core/logger'
import {type OSInfo} from '../core/os'
import {type NonEmptyString} from '../core/types'

export class Workspace {
  static from(
    logger: Logger,
    files: Files,
    os: OSInfo,
    cache: ActionCache,
  ) {
    return new Workspace(logger, files, os, cache)
  }

  constructor(
    private readonly logger: Logger,
    private readonly files: Files,
    private readonly os: OSInfo,
    private readonly cache: ActionCache,
  ) {}

  /**
   * Tries to restore the Scala Steward workspace build from the cache, if any.
   *
   * @param {string} workspace - the Scala Steward workspace directory
   */
  async restoreWorkspaceCache(workspace: string): Promise<void> {
    try {
      this.logger.startGroup('Trying to restore workspace contents from cache...')

      const hash = this.hashFile(path.join(workspace, 'repos.md'))
      const paths = [path.join(workspace, 'workspace')]
      const cacheHit = await this.cache.restoreCache(
        paths,
        `scala-steward-${hash}-${Date.now().toString()}`,
        [`scala-steward-${hash}`, 'scala-steward-'],
      )

      if (cacheHit) {
        this.logger.info('Scala Steward workspace contents restored from cache')
      } else {
        this.logger.info('Scala Steward workspace contents weren\'t found on cache')
      }

      this.logger.endGroup()
    } catch (error: unknown) {
      this.logger.debug((error as Error).message)
      this.logger.warning('Unable to restore workspace from cache')
      this.logger.endGroup()
    }
  }

  /**
   * Tries to save the Scala Steward workspace build to the cache.
   *
   * @param {string} workspace - the Scala Steward workspace directory
   */
  async saveWorkspaceCache(workspace: string): Promise<void> {
    try {
      this.logger.startGroup('Saving workspace to cache...')

      // We don't want to keep `workspace/store/refresh_error` nor `workspace/repos` in the cache.
      await this.files.rmRF(path.join(workspace, 'workspace', 'store', 'refresh_error'))
      await this.files.rmRF(path.join(workspace, 'workspace', 'repos'))

      const hash = this.hashFile(path.join(workspace, 'repos.md'))

      await this.cache.saveCache(
        [path.join(workspace, 'workspace')],
        `scala-steward-${hash}-${Date.now().toString()}`,
      )

      this.logger.info('Scala Steward workspace contents saved to cache')
      this.logger.endGroup()
    } catch (error: unknown) {
      this.logger.debug((error as Error).message)
      this.logger.warning('Unable to save workspace to cache')
      this.logger.endGroup()
    }
  }

  /**
   * Prepares the Scala Steward workspace that will be used when launching the app.
   *
   * This will involve:
   * - Creating a folder `/ops/scala-steward`.
   * - Creating a `repos.md` file inside workspace containing the repository/repositories to update.
   * - Creating a `askpass.sh` file inside workspace containing the Github token.
   * - Making the previous file executable.
   *
   * @param {string} reposList - The Markdown list of repositories to write to the `repos.md` file. It is only used if no
   *                             GitHub App key is provided on `gitHubAppKey` parameter.
   * @param {string} token - The Github Token used to authenticate into Github.
   * @param {string | undefined} gitHubAppKey - The Github App private key (optional).
   * @returns {string} The workspace directory path
   */
  async prepare(reposList: string, token: NonEmptyString, gitHubAppKey: NonEmptyString | undefined): Promise<string> {
    try {
      const stewarddir = `${this.os.homedir()}/scala-steward`
      await this.files.mkdirP(stewarddir)

      if (gitHubAppKey === undefined) {
        this.files.writeFileSync(`${stewarddir}/repos.md`, reposList)
      } else {
        this.files.writeFileSync(`${stewarddir}/repos.md`, '')
        this.files.writeFileSync(`${stewarddir}/app.pem`, gitHubAppKey.value)
      }

      this.files.writeFileSync(`${stewarddir}/askpass.sh`, `#!/bin/sh\n\necho '${token.value}'`)
      this.files.chmodSync(`${stewarddir}/askpass.sh`, 0o755)

      this.logger.info('✓ Scala Steward workspace created')

      return stewarddir
    } catch (error: unknown) {
      this.logger.debug((error as Error).message)
      throw new Error('Unable to create Scala Steward workspace')
    }
  }

  /**
   * Removes the Scala Steward's workspace.
   */
  async remove(): Promise<void> {
    await this.files.rmRF(`${this.os.homedir()}/scala-steward`)
  }

  /**
   * Gets the first eight characters of the SHA-256 hash value for the
   * provided file's contents.
   *
   * @param {string} file - the file for which to calculate the hash
   * @returns {string} the file content's hash
   */
  private hashFile(file: string): string {
    // eslint-disable-next-line unicorn/text-encoding-identifier-case
    const sha = new jsSHA('SHA-256', 'TEXT', {encoding: 'UTF8'})
    sha.update(this.files.readFileSync(file, 'utf8'))
    return sha.getHash('HEX').slice(0, 8)
  }
}
