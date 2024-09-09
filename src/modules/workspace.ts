import path from 'path'
import jsSHA from 'jssha/dist/sha256'
import {type ActionCache} from '../core/cache'
import {type Files} from '../core/files'
import {type Logger} from '../core/logger'
import {type OSInfo} from '../core/os'
import {mandatory, type NonEmptyString} from '../core/types'
import {type GitHubAppInfo} from './input'

export class Workspace {
  static from(
    logger: Logger,
    files: Files,
    os: OSInfo,
    cache: ActionCache,
  ) {
    return new Workspace(logger, files, os, cache)
  }

  readonly directory: string
  readonly workspace: NonEmptyString
  readonly repos_md: NonEmptyString
  readonly app_pem: NonEmptyString
  readonly askpass_sh: NonEmptyString
  readonly runSummary_md: string

  private intervalId: NodeJS.Timeout | undefined

  constructor(
    private readonly logger: Logger,
    private readonly files: Files,
    private readonly os: OSInfo,
    private readonly cache: ActionCache,
  ) {
    this.directory = path.join(this.os.homedir(), 'scala-steward')
    this.workspace = mandatory(path.join(this.directory, 'workspace'))
    this.repos_md = mandatory(path.join(this.directory, 'repos.md'))
    this.app_pem = mandatory(path.join(this.directory, 'app.pem'))
    this.askpass_sh = mandatory(path.join(this.directory, 'askpass.sh'))
    this.runSummary_md = path.join(this.workspace.value, 'run-summary.md')
  }

  /**
   * Tries to restore the Scala Steward workspace build from the cache, if any.
   */
  async restoreWorkspaceCache(): Promise<void> {
    try {
      this.logger.startGroup('Trying to restore workspace contents from cache...')

      const hash = this.hashFile(this.repos_md.value)

      const cacheHit = await this.cache.restoreCache(
        [this.workspace.value],
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
  async saveWorkspaceCache(): Promise<void> {
    try {
      this.logger.startGroup('Saving workspace to cache...')

      // We don't want to keep `workspace/store/refresh_error` nor `workspace/repos` in the cache.
      await this.files.rmRF(path.join(this.workspace.value, 'store', 'refresh_error'))
      await this.files.rmRF(path.join(this.workspace.value, 'repos'))

      // Don't persist a summary that's specific to this run
      await this.files.rmRF(this.runSummary_md)

      const hash = this.hashFile(this.repos_md.value)

      await this.cache.saveCache([this.workspace.value], `scala-steward-${hash}-${Date.now().toString()}`)

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
   * - Creating a folder `scala-steward` in the "HOME" directory.
   * - Creating a `repos.md` file inside workspace containing the repository/repositories to update.
   * - Creating a `app.pem` with the GitHub App key (if applicable).
   * - Creating a `askpass.sh` file inside workspace containing the GitHub token.
   * - Making the previous file executable.
   *
   * @param reposList The Markdown list of repositories to write to the `repos.md` file. It is only used if no
   *                  GitHub App key is provided on `gitHubAppKey` parameter.
   * @param token The GitHub Token used to authenticate into GitHub.
   * @param gitHubAppInfo The GitHub App information as provided by the user.
   */
  async prepare(reposList: string, token: () => Promise<string>, gitHubAppInfo: GitHubAppInfo | undefined): Promise<void> {
    try {
      await this.files.mkdirP(this.directory)

      if (gitHubAppInfo && !gitHubAppInfo.authOnly) {
        this.files.writeFileSync(this.repos_md.value, '')
        this.files.writeFileSync(this.app_pem.value, gitHubAppInfo.key.value)
      } else {
        this.files.writeFileSync(this.repos_md.value, reposList)
      }

      await this.writeAskPass(token)
      this.intervalId = setInterval(async () => {
        await this.writeAskPass(token)
        this.logger.info('✓ GitHub Token refreshed')
      }, 1000 * 60 * 50)

      this.files.chmodSync(this.askpass_sh.value, 0o755)

      this.logger.info('✓ Scala Steward workspace created')
    } catch (error: unknown) {
      this.logger.debug((error as Error).message)
      throw new Error('Unable to create Scala Steward workspace')
    }
  }

  /**
   * Removes the Scala Steward's workspace.
   */
  async remove(): Promise<void> {
    await this.files.rmRF(this.directory)
  }

  /**
   * Writes a GitHub Token to the git-ask-pass file
   *
   * @param fetchToken - A function that returns a Promise resolving to a new token string.
   */
  async writeAskPass(fetchToken: () => Promise<string>): Promise<void> {
    const token = await fetchToken()
    this.files.writeFileSync(this.askpass_sh.value, `#!/bin/sh\n\necho '${token}'`)
  }

  /**
   * Cancels the token refresh if it is currently scheduled.
   */
  async cancelTokenRefresh(): Promise<void> {
    if (this.intervalId) {
      clearInterval(this.intervalId)
    }
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
