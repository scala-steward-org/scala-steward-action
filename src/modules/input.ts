
import {type Files} from '../core/files'
import {type Logger} from '../core/logger'
import {mandatory, nonEmpty, type NonEmptyString} from '../core/types'

export type GitHubAppInfo = {
  authOnly: boolean;
  id: NonEmptyString;
  installation: NonEmptyString | undefined;
  key: NonEmptyString;
}

/**
 * Retrieves (and sanitize) inputs.
 */
export class Input {
  static from(
    inputs: {getInput: (name: string) => string; getBooleanInput: (name: string) => boolean},
    files: Files,
    logger: Logger,
  ) {
    return new Input(inputs, files, logger)
  }

  constructor(
    private readonly inputs: {getInput: (name: string) => string; getBooleanInput: (name: string) => boolean},
    private readonly files: Files,
    private readonly logger: Logger,
  ) {}

  /**
   * Returns every input for this action.
   */
  all() {
    return {
      github: {
        token: mandatory(this.inputs.getInput('github-token')),
        app: this.githubAppInfo(),
        apiUrl: mandatory(this.inputs.getInput('github-api-url')),
      },
      steward: {
        defaultConfiguration: this.defaultRepoConf(),
        repos: this.reposFile() ?? this.githubRepository(),
        cacheTtl: nonEmpty(this.inputs.getInput('cache-ttl')),
        maxBufferSize: nonEmpty(this.inputs.getInput('max-buffer-size')),
        version: nonEmpty(this.inputs.getInput('scala-steward-version')),
        timeout: nonEmpty(this.inputs.getInput('timeout')),
        ignoreOptsFiles: this.inputs.getBooleanInput('ignore-opts-files'),
        extraArgs: nonEmpty(this.inputs.getInput('other-args')),
        extraJars: nonEmpty(this.inputs.getInput('extra-jars')),
      },
      migrations: {
        scalafix: nonEmpty(this.inputs.getInput('scalafix-migrations')),
        artifacts: nonEmpty(this.inputs.getInput('artifact-migrations')),
      },
      commits: {
        sign: {
          enabled: this.inputs.getBooleanInput('sign-commits'),
          key: nonEmpty(this.inputs.getInput('signing-key')),
        },
        author: {
          email: nonEmpty(this.inputs.getInput('author-email')),
          name: nonEmpty(this.inputs.getInput('author-name')),
        },
      },
    }
  }

  /**
   * Reads the path of the file containing the default Scala Steward configuration.
   *
   * If the provided file does not exist and is not the default one it will throw an error.
   * On the other hand, if it exists it will be returned, otherwise; it will return `undefined`.
   *
   * @returns {string | undefined} The path indicated in the `repo-config` input, if it
   *                               exists; otherwise, `undefined`.
   */
  defaultRepoConf(): NonEmptyString | undefined {
    const path = nonEmpty(this.inputs.getInput('repo-config'))

    if (!path) {
      return undefined
    }

    const fileExists = this.files.existsSync(path.value)

    if (!fileExists && path.value !== '.github/.scala-steward.conf') {
      throw new Error(`Provided default repo conf file (${path.value}) does not exist`)
    }

    if (fileExists) {
      this.logger.info(`✓ Default Scala Steward configuration set to: ${path.value}`)

      return path
    }

    return undefined
  }

  /**
   * Returns the GitHub repository set to update.
   *
   * It reads it from the `github-repository` input.
   *
   * Throws error if input is empty or missing.
   *
   * If the `branches` input is set, the selected branches will be added.
   *
   * @returns {string} The GitHub repository read from the `github-repository` input.
   */
  githubRepository(): string {
    const repo = nonEmpty(this.inputs.getInput('github-repository'))

    if (!repo) {
      throw new Error('Unable to read GitHub repository from `github-repository` input')
    }

    const branches = this.inputs.getInput('branches').split(',').filter(Boolean)

    if (branches.length === 1) {
      const branch = branches[0]

      this.logger.info(`✓ GitHub Repository set to: ${repo.value}. Will update ${branch} branch.`)

      return `- ${repo.value}:${branch}`
    }

    if (branches.length > 1) {
      this.logger.info(`✓ GitHub Repository set to: ${repo.value}. Will update ${branches.join(', ')} branches.`)

      return branches.map((branch: string) => `- ${repo.value}:${branch}`).join('\n')
    }

    return `- ${repo.value}`
  }

  /**
   * Reads the path of the file containing the list of repositories to update  from the `repos-file`
   * input.
   *
   * If the input isn't provided this function will return `undefined`.
   * On the other hand, if it is provided, it will check if the path exists:
   * - If the file exists, its contents will be returned.
   * - If it doesn't exists, an error will be thrown.
   *
   * @returns {string | undefined} The contents of the file indicated in `repos-file` input, if is
   *                               defined; otherwise, `undefined`.
   */
  reposFile(): string | undefined {
    const file = nonEmpty(this.inputs.getInput('repos-file'))

    if (!file) {
      return undefined
    }

    if (this.files.existsSync(file.value)) {
      this.logger.info(`✓ Using multiple repos file: ${file.value}`)

      return this.files.readFileSync(file.value, 'utf8')
    }

    throw new Error(`The path indicated in \`repos-file\` (${file.value}) does not exist`)
  }

  /**
   * Checks that GitHub App ID and private key are set together.
   *
   * Throws error if only one of the two inputs is set.
   *
   * @returns {{id: string, key: string} | undefined} App ID and key or undefined if both inputs are empty.
   */
  githubAppInfo(): GitHubAppInfo | undefined {
    const authOnly = this.inputs.getBooleanInput('github-app-auth-only')
    const id = nonEmpty(this.inputs.getInput('github-app-id'))
    const installation = nonEmpty(this.inputs.getInput('github-app-installation-id'))
    const key = nonEmpty(this.inputs.getInput('github-app-key')?.replace(/\\n/g, '\n'))

    if (!id && !key) {
      return undefined
    }

    if (id && key) {
      return {
        authOnly, id, installation, key,
      }
    }

    throw new Error('`github-app-id` and `github-app-key` inputs have to be set together. One of them is missing')
  }
}
