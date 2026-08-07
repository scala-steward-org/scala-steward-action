import {expect, test} from 'vitest'
import {Logger} from '../core/logger.js'
import {GitHub, type GitHubClient} from './github.js'

test('`GitHub.getAuthUser()` → returns every auth user component', async () => {
  const client: GitHubClient = {
    rest: {
      users: {
        getByUsername: async () => expect.unreachable('This should not be called'),
        getAuthenticated: async () => ({data: {login: 'alejandrohdezma', email: 'alex@example.com', name: 'Alex'}}),
      },
    },
  }

  const input = GitHub.from(Logger.noOp, client)

  const user = await input.getAuthUser()

  expect(user.login().value).toBe('alejandrohdezma')
  expect(user.email().value).toBe('alex@example.com')
  expect(user.name().value).toBe('Alex')
})

test('`GitHub.getAuthUser()` → throws error on any empty component', async () => {
  const client: GitHubClient = {
    rest: {
      users: {
        getByUsername: async () => expect.unreachable('This should not be called'),
        getAuthenticated: async () => ({data: {login: '', email: '', name: ''}}),
      },
    },
  }

  const input = GitHub.from(Logger.noOp, client)

  const user = await input.getAuthUser()

  {
    const expected = 'Unable to retrieve user information from GitHub'
    expect(() => user.login().value).toThrow(new Error(expected))
  }

  {
    const expected = 'Unable to find author\'s email. Either ensure that the token\'s GitHub Account '
      + 'has the email privacy feature disabled for at least one email or use the `author-email` input to provide one.'
    expect(() => user.email().value).toThrow(new Error(expected))
  }

  {
    const expected = 'Unable to find author\'s name. Either ensure that the token\'s GitHub Account '
      + 'has a valid name set in its profile or use the `author-name` input to provide one.'
    expect(() => user.name().value).toThrow(new Error(expected))
  }
})

test('`GitHub.getAuthUser()` → throws error on any null component', async () => {
  const client: GitHubClient = {
    rest: {
      users: {
        getByUsername: async () => expect.unreachable('This should not be called'),
        getAuthenticated: async () => ({data: {login: 'alex', email: null, name: null}}),
      },
    },
  }

  const input = GitHub.from(Logger.noOp, client)

  const user = await input.getAuthUser()

  {
    const expected = 'Unable to find author\'s email. Either ensure that the token\'s GitHub Account '
      + 'has the email privacy feature disabled for at least one email or use the `author-email` input to provide one.'
    expect(() => user.email().value).toThrow(new Error(expected))
  }

  {
    const expected = 'Unable to find author\'s name. Either ensure that the token\'s GitHub Account '
      + 'has a valid name set in its profile or use the `author-name` input to provide one.'
    expect(() => user.name().value).toThrow(new Error(expected))
  }
})

test('`GitHub.getAppUser()` → returns every auth user component', async () => {
  const client: GitHubClient = {
    rest: {
      users: {
        getByUsername: async () => ({data: {login: 'my-app[bot]', id: 123}}),
        getAuthenticated: async () => expect.unreachable('This should not be called'),
      },
    },
  }

  const input = GitHub.from(Logger.noOp, client)

  const user = await input.getAppUser('the-slug')

  expect(user.login().value).toBe('my-app[bot]')
  expect(user.email().value).toBe('123+my-app[bot]@users.noreply.github.com')
  expect(user.name().value).toBe('my-app[bot]')
})

test('`GitHub.getAppUser()` → returns default user if slug is empty', async () => {
  const client: GitHubClient = {
    rest: {
      users: {
        getByUsername: async () => ({data: {login: 'my-app[bot]', id: 123}}),
        getAuthenticated: async () => expect.unreachable('This should not be called'),
      },
    },
  }

  const input = GitHub.from(Logger.noOp, client)

  const user = await input.getAppUser(undefined)

  expect(user.login().value).toBe('github-actions[bot]')
  expect(user.email().value).toBe('41898282+github-actions[bot]@users.noreply.github.com')
  expect(user.name().value).toBe('github-actions[bot]')
})

test('`GitHub.getAppUser()` → returns default user if failed to obtain bot user', async () => {
  const client: GitHubClient = {
    rest: {
      users: {
        getByUsername: async () => expect.unreachable('BOOM!'),
        getAuthenticated: async () => expect.unreachable('This should not be called'),
      },
    },
  }

  const input = GitHub.from(Logger.noOp, client)

  const user = await input.getAppUser(undefined)

  expect(user.login().value).toBe('github-actions[bot]')
  expect(user.email().value).toBe('41898282+github-actions[bot]@users.noreply.github.com')
  expect(user.name().value).toBe('github-actions[bot]')
})
