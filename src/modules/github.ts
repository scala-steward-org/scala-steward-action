/* eslint-disable @typescript-eslint/ban-types */
import {type Logger} from '../core/logger'
import {mandatory, type NonEmptyString} from '../core/types'

const emailErrorMessage
  = 'Unable to find author\'s email. Either ensure that the token\'s GitHub Account has the email '
  + 'privacy feature disabled for at least one email or use the `author-email` input to provide one.'

const nameErrorMessage
  = 'Unable to find author\'s name. Either ensure that the token\'s GitHub Account has a valid name '
  + 'set in its profile or use the `author-name` input to provide one.'

export class GitHub {
  static from(
    logger: Logger,
    github: GitHubClient,
  ) {
    return new GitHub(logger, github)
  }

  // https://github.community/t/github-actions-bot-email-address/17204/6
  // https://api.github.com/users/github-actions%5Bbot%5D
  private readonly defaultUser = {
    login: () => mandatory('github-actions[bot]'),
    email: () => mandatory('41898282+github-actions[bot]@users.noreply.github.com'),
    name: () => mandatory('github-actions[bot]'),
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

      this.logger.info('✓ User information retrieved from GitHub')

      this.logger.debug(`- Login: ${login}`)
      this.logger.debug(`- Email: ${email ?? 'no email found'}`)
      this.logger.debug(`- Name: ${name ?? 'no name found'}`)

      return {
        login: () => mandatory(login, 'Unable to retrieve user information from GitHub'),
        email: () => mandatory(email ?? '', emailErrorMessage),
        name: () => mandatory(name ?? '', nameErrorMessage),
      }
    } catch (error: unknown) {
      this.logger.debug(`- User information retrieve failed. Error: ${(error as Error).message}`)
      return this.defaultUser
    }
  }

  /**
   * Returns the login, email and name of the authenticated user.
   */
  async getAppUser(slug: string | undefined): Promise<AuthUser> {
    try {
      if (slug === undefined) {
        throw new Error('Unable to find GitHub App Slug')
      }

      const response = await this.github.rest.users.getByUsername({username: slug + '[bot]'})

      // Workaround until https://github.com/github/rest-api-description/issues/288 is fixed
      const {login, id} = (response as {data: {login: string; id: string}}).data

      this.logger.info('✓ GitHub App information retrieved from GitHub')

      return {
        login: () => mandatory(login, 'Unable to retrieve user information from GitHub'),
        email: () => mandatory(`${id}+${login}@users.noreply.github.com`),
        name: () => mandatory(login),
      }
    } catch (error: unknown) {
      this.logger.debug(`- GitHub App User information retrieve failed. Error: ${(error as Error).message}`)
      return this.defaultUser
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
      getByUsername: (parameters?: {username: string}) => Promise<unknown>;
    };
  };
}
