import {getOctokit} from '@actions/github'
import * as core from '@actions/core'

const emailErrorMessage =
  "Unable to find author's email. Either ensure that the token's Github Account has the email " +
  'privacy feature disabled for at least one email or use the `author-email` input to provide one.'

const nameErrorMessage =
  "Unable to find author's name. Either ensure that the token's Github Account has a valid name " +
  'set in its profile or use the `author-name` input to provide one.'

/**
 * Returns the login, email and name of the authenticated user using
 * the provided Github token.
 *
 * @param {string} token - The token whose user data will be extracted.
 * @returns {Promise<AuthUser>} The login, email and name of token's user.
 */
export async function getAuthUser(token: string): Promise<AuthUser> {
  const github = getOctokit(token)

  try {
    const {login, email, name} = (await github.users.getAuthenticated()).data

    core.info('✓ User information retrieved from Github')

    core.debug(`- Login: ${login}`)
    core.debug(`- Email: ${email}`)
    core.debug(`- Name: ${name}`)

    return {
      login,
      email: () => {
        if (!email) throw new Error(emailErrorMessage)
        return email
      },
      name: () => {
        if (!name) throw new Error(nameErrorMessage)
        return name
      }
    }
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
