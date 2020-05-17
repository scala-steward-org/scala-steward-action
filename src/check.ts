import fetch from 'node-fetch'
import * as core from '@actions/core'
import fs from 'fs'

/**
 * Checks connection with Maven Central, throws error if unable to connect.
 */
export async function mavenCentral(): Promise<void> {
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
export function githubToken(): string {
  const token: string = core.getInput('github-token')

  if (token === '') {
    throw new Error('You need to provide a Github token in the `github-token` input')
  }

  core.info('✓ Github Token provided as input')

  return token
}

/**
 * Reads a Github repository from the `github-repository` input. Fallback to the
 * `GITHUB_REPOSITORY` environment variable.
 *
 * Throws error if the fallback fails or returns the repository in case it doesn't.
 *
 * @returns {string} The Github repository read from the `github-repository` input
 *                   or the `GITHUB_REPOSITORY` environment variable.
 */
export function githubRepository(): string {
  const repo: string | undefined =
    core.getInput('github-repository') || process.env.GITHUB_REPOSITORY

  if (repo === undefined) {
    throw new Error(
      'Unable to read Github repository from `github-repository` ' +
        'input or `GITHUB_REPOSITORY` environment variable'
    )
  }

  core.info(`✓ Github Repository set to: ${repo}`)

  return repo
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
export function reposFile(): Buffer | undefined {
  const file: string | undefined = core.getInput('repos-file')

  if (file === undefined) {
    return undefined
  }

  if (fs.existsSync(file)) {
    core.info(`✓ Using multiple repos file: ${file}`)

    return fs.readFileSync(file)
  }

  throw new Error(`The path indicated in \`repos-file\` (${file}) does not exist`)
}
