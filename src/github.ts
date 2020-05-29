import * as github from '@actions/github'
import * as core from '@actions/core'

/**
 * Returns the login, email and name of the authenticated user using
 * the provided Github token.
 *
 * @param {string} token - The token whose user data will be extracted.
 * @returns {Promise<AuthUser>} The login, email and name of token's user.
 */
export async function getAuthUser(token: string): Promise<AuthUser> {
  const octokit = new github.GitHub(token)

  try {
    const {login, email, name} = (await octokit.users.getAuthenticated()).data

    core.info('✓ User information retrieved from Github')

    core.debug(`- Login: ${login}`)
    core.debug(`- Email: ${email}`)
    core.debug(`- Name: ${name}`)

    return {login, email: () => email, name: () => name}
  } catch (error) {
    core.debug(error)
    throw new Error('Unable to retrieve user information from Github')
  }
}

interface AuthUser {
  email: () => string
  login: string
  name: () => string
}
