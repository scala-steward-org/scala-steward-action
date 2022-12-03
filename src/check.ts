import type Buffer from 'buffer'
import fs from 'fs'
import process from 'process'
import fetch from 'node-fetch'
import * as core from '@actions/core'

export class Check {
  /**
   * Checks connection with Maven Central, throws error if unable to connect.
   */
  async mavenCentral(): Promise<void> {
    const response = await fetch('https://repo1.maven.org/maven2/')

    if (!response.ok) {
      throw new Error('Unable to connect to Maven Central')
    }

    core.info('✓ Connected to Maven Central')
  }

  /**
   * Reads the Github Token from the `github-token` input. Throws error if the
   * input is empty or returns the token in case it is not.
   *
   * @returns {string} The Github Token read from the `github-token` input.
   */
  githubToken(): string {
    const token: string = core.getInput('github-token')

    if (token === '') {
      throw new Error('You need to provide a Github token in the `github-token` input')
    }

    core.info('✓ Github Token provided as input')

    return token
  }

  private get defaultRepoConfLocation() {
    return '.github/.scala-steward.conf'
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
    const path = core.getInput('repo-config')

    const fileExists = fs.existsSync(path)

    if (!fileExists && path !== this.defaultRepoConfLocation) {
      throw new Error(`Provided default repo conf file (${path}) does not exist`)
    }

    if (fileExists) {
      core.info(`✓ Default Scala Steward configuration set to: ${path}`)

      return path
    }

    return undefined
  }

  /**
   * Reads a Github repository from the `github-repository` input. Fallback to the
   * `GITHUB_REPOSITORY` environment variable.
   *
   * Throws error if the fallback fails or returns the repository in case it doesn't.
   *
   * If the `branch` input is set, the selected branch will be added for update instead
   * of the default one.
   *
   * @returns {string} The Github repository read from the `github-repository` input
   *                   or the `GITHUB_REPOSITORY` environment variable.
   */
  githubRepository(): string {
    const repo: string | undefined
    = core.getInput('github-repository') || process.env.GITHUB_REPOSITORY

    if (repo === undefined) {
      throw new Error(
        'Unable to read Github repository from `github-repository` '
        + 'input or `GITHUB_REPOSITORY` environment variable',
      )
    }

    const branches = core.getInput('branches').split(',').filter(Boolean)

    if (branches.length === 1) {
      const branch = branches[0]

      core.info(`✓ Github Repository set to: ${repo}. Will update ${branch} branch.`)

      return `- ${repo}:${branch}`
    }

    if (branches.length > 1) {
      core.info(`✓ Github Repository set to: ${repo}. Will update ${branches.join(', ')} branches.`)

      return branches.map((branch: string) => `- ${repo}:${branch}`).join('\n')
    }

    core.info(`✓ Github Repository set to: ${repo}.`)

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
  reposFile(): Buffer | undefined {
    const file: string = core.getInput('repos-file')

    if (!file) {
      return undefined
    }

    if (fs.existsSync(file)) {
      core.info(`✓ Using multiple repos file: ${file}`)

      return fs.readFileSync(file)
    }

    throw new Error(`The path indicated in \`repos-file\` (${file}) does not exist`)
  }

  /**
   * Checks that Github App ID and private key are set together, writes the key to a temporary file.
   *
   * Throws error if only one of the two inputs is set.
   *
   * @returns {{id: string, keyFile: string} | undefined} App ID and path to the private key file or
   * undefined if both inputs are empty.
   */
  githubAppInfo(): {id: string; keyFile: string} | undefined {
    const id: string = core.getInput('github-app-id')
    const key: string = core.getInput('github-app-key')

    if (!id && !key) {
      return undefined
    }

    if (id && key) {
      const keyFile = `${fs.mkdtempSync('tmp-')}/github-app-private-key.pem`
      fs.writeFileSync(keyFile, key)

      core.info(`✓ Github App ID: ${id}`)
      core.info(`✓ Github App private key is written to: ${keyFile}`)
      return {id, keyFile}
    }

    throw new Error(
      '`github-app-id` and `github-app-key` inputs have to be set together. One of them is missing',
    )
  }
}
