/* eslint-disable @typescript-eslint/ban-types */
import {type Logger} from '../core/logger'
import {mandatory, type NonEmptyString} from '../core/types'

const emailErrorMessage
  = 'Unable to find author\'s email. Either ensure that the token\'s Github Account has the email '
  + 'privacy feature disabled for at least one email or use the `author-email` input to provide one.'

const nameErrorMessage
  = 'Unable to find author\'s name. Either ensure that the token\'s Github Account has a valid name '
  + 'set in its profile or use the `author-name` input to provide one.'

export class GitHub {
  static from(
    logger: Logger,
    github: GitHubClient,
  ) {
    return new GitHub(logger, github)
  }

  constructor(
    private readonly logger: Logger,
    private readonly github: GitHubClient,
  ) {}

  /**
   * Returns the login, email and name of the authenticated user.
   */
  async getAuthUser(): Promise<AuthUser> {
    try {
      const auth = await this.github.rest.users.getAuthenticated()
      const {login, email, name} = auth.data

      this.logger.info('✓ User information retrieved from Github')

      this.logger.debug(`- Login: ${login}`)
      this.logger.debug(`- Email: ${email ?? 'no email found'}`)
      this.logger.debug(`- Name: ${name ?? 'no name found'}`)

      return {
        login: () => mandatory(login, 'Unable to retrieve user information from Github'),
        email: () => mandatory(email ?? '', emailErrorMessage),
        name: () => mandatory(name ?? '', nameErrorMessage),
      }
    } catch (error: unknown) {
      this.logger.debug(`- User information retrieve failed. Error: ${(error as Error).message}`)

      // https://github.community/t/github-actions-bot-email-address/17204/6
      // https://api.github.com/users/github-actions%5Bbot%5D
      return {
        login: () => mandatory('github-actions[bot]'),
        email: () => mandatory('41898282+github-actions[bot]@users.noreply.github.com'),
        name: () => mandatory('github-actions[bot]'),
      }
    }
  }
}

type AuthUser = {
  email: () => NonEmptyString;
  login: () => NonEmptyString;
  name: () => NonEmptyString;
}

export type GitHubClient = {
  rest: {
    users: {
      getAuthenticated: () => Promise<{data: {login: string; email: string | null; name: string | null}}>;
    };
  };
}
