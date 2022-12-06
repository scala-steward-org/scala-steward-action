import {getOctokit} from '@actions/github'
import * as core from '@actions/core'
import {mandatory, nonEmpty, type NonEmptyString} from './types'

const emailErrorMessage
  = 'Unable to find author\'s email. Either ensure that the token\'s Github Account has the email '
  + 'privacy feature disabled for at least one email or use the `author-email` input to provide one.'

const nameErrorMessage
  = 'Unable to find author\'s name. Either ensure that the token\'s Github Account has a valid name '
  + 'set in its profile or use the `author-name` input to provide one.'

/**
 * Returns the login, email and name of the authenticated user using
 * the provided Github token.
 *
 * @param token - The token whose user data will be extracted.
 * @returns The login, email and name of token's user.
 */
export async function getAuthUser(token: NonEmptyString, baseUrl: NonEmptyString): Promise<AuthUser> {
  const github = getOctokit(token.value, {baseUrl: baseUrl.value})

  try {
    const auth = await github.rest.users.getAuthenticated()
    const {login, email, name} = auth.data

    core.info('✓ User information retrieved from Github')

    core.debug(`- Login: ${login}`)
    core.debug(`- Email: ${email ?? 'no email found'}`)
    core.debug(`- Name: ${name ?? 'no name found'}`)

    return {
      login: () => mandatory(login, 'Unable to retrieve user information from Github'),
      email: () => mandatory(email ?? '', emailErrorMessage),
      name: () => mandatory(name ?? '', nameErrorMessage),
    }
  } catch (error: unknown) {
    core.debug(`- User information retrieve failed. Error: ${(error as Error).message}`)

    // https://github.community/t/github-actions-bot-email-address/17204/6
    // https://api.github.com/users/github-actions%5Bbot%5D
    return {
      login: () => mandatory('github-actions[bot]'),
      email: () => mandatory('41898282+github-actions[bot]@users.noreply.github.com'),
      name: () => mandatory('github-actions[bot]'),
    }
  }
}

type AuthUser = {
  email: () => NonEmptyString;
  login: () => NonEmptyString;
  name: () => NonEmptyString;
}
