import {type Files} from './files'
import {type Logger} from './logger'

/**
 * Retrieves (and sanitize) inputs.
 */
export class Input {
  static from(inputs: {getInput: (name: string) => string}, files: Files, logger: Logger) {
    return new Input(inputs, files, logger)
  }

  constructor(
    private readonly inputs: {getInput: (name: string) => string},
    private readonly files: Files,
    private readonly logger: Logger,
  ) {}

  /**
   * Returns every input for this action.
   */
  all() {
    return {
      github: {
        token: this.githubToken(),
        app: this.githubAppInfo(),
        apiUrl: this.inputs.getInput('github-api-url'),
      },
      steward: {
        defaultConfiguration: this.defaultRepoConf(),
        repos: this.reposFile() ?? this.githubAppInfo() ? '' : this.githubRepository(),
        cacheTtl: this.inputs.getInput('cache-ttl'),
        version: this.inputs.getInput('scala-steward-version'),
        timeout: this.inputs.getInput('timeout'),
        ignoreOptsFiles: /true/i.test(this.inputs.getInput('ignore-opts-files')),
        extraArgs: this.inputs.getInput('other-args'),
      },
      migrations: {
        scalafix: this.inputs.getInput('scalafix-migrations'),
        artifacts: this.inputs.getInput('artifact-migrations'),
      },
      commits: {
        sign: {
          enabled: /true/i.test(this.inputs.getInput('sign-commits')),
          key: this.inputs.getInput('signing-key'),
        },
        author: {
          email: this.inputs.getInput('author-email'),
          name: this.inputs.getInput('author-name'),
        },
      },
    }
  }

  /**
   * Reads the Github Token from the `github-token` input. Throws error if the
   * input is empty or returns the token in case it is not.
   *
   * @returns {string} The Github Token read from the `github-token` input.
   */
  githubToken(): string {
    const token: string = this.inputs.getInput('github-token')

    if (token === '') {
      throw new Error('You need to provide a Github token in the `github-token` input')
    }

    this.logger.info('✓ Github Token provided as input')

    return token
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
  defaultRepoConf(): string | undefined {
    const path = this.inputs.getInput('repo-config')

    const fileExists = this.files.existsSync(path)

    if (!fileExists && path !== '.github/.scala-steward.conf') {
      throw new Error(`Provided default repo conf file (${path}) does not exist`)
    }

    if (fileExists) {
      this.logger.info(`✓ Default Scala Steward configuration set to: ${path}`)

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
   * @returns {string} The Github repository read from the `github-repository` input.
   */
  githubRepository(): string {
    const repo = this.inputs.getInput('github-repository')

    if (!repo) {
      throw new Error('Unable to read Github repository from `github-repository` input')
    }

    const branches = this.inputs.getInput('branches').split(',').filter(Boolean)

    if (branches.length === 1) {
      const branch = branches[0]

      this.logger.info(`✓ Github Repository set to: ${repo}. Will update ${branch} branch.`)

      return `- ${repo}:${branch}`
    }

    if (branches.length > 1) {
      this.logger.info(`✓ Github Repository set to: ${repo}. Will update ${branches.join(', ')} branches.`)

      return branches.map((branch: string) => `- ${repo}:${branch}`).join('\n')
    }

    this.logger.info(`✓ Github Repository set to: ${repo}.`)

    return `- ${repo}`
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
    const file: string = this.inputs.getInput('repos-file')

    if (!file) {
      return undefined
    }

    if (this.files.existsSync(file)) {
      this.logger.info(`✓ Using multiple repos file: ${file}`)

      return this.files.readFileSync(file, 'utf8')
    }

    throw new Error(`The path indicated in \`repos-file\` (${file}) does not exist`)
  }

  /**
   * Checks that Github App ID and private key are set together.
   *
   * Throws error if only one of the two inputs is set.
   *
   * @returns {{id: string, key: string} | undefined} App ID and key or undefined if both inputs are empty.
   */
  githubAppInfo(): {id: string; key: string} | undefined {
    const id: string = this.inputs.getInput('github-app-id')
    const key: string = this.inputs.getInput('github-app-key')

    if (!id && !key) {
      return undefined
    }

    if (id && key) {
      this.logger.info(`✓ Github App ID: ${id}`)
      this.logger.info('✓ Github App private key will be written to the Scala Steward workspace')
      return {id, key}
    }

    throw new Error(
      '`github-app-id` and `github-app-key` inputs have to be set together. One of them is missing',
    )
  }
}