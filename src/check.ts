import fetch from 'node-fetch'
import * as core from '@actions/core'

/**
 * Checks connection with Maven Central, throws error if unable to connect
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
 * @returns   string the Github Token read from the `github-token` input
 */
export async function githubToken(): Promise<string> {
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
 * @returns   string the Github repository read from the `github-repository` input
 *                   or the `GITHUB_REPOSITORY` environment variable.
 */
export async function githubRepository(): Promise<string> {
  const github_repository: string | undefined = core.getInput('github-repository') || process.env.GITHUB_REPOSITORY

  if (github_repository === undefined) {
    throw new Error('Unable to read Github repository from `github-repository` ' +
        'input or `GITHUB_REPOSITORY` environment variable')
  }

  core.info(`✓ Github Repository set to: ${github_repository}`)

  return github_repository
}
