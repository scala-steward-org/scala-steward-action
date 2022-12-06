import test from 'ava'
import {Logger} from '../core/logger'
import {GitHub, type GitHubClient} from './github'

test('`GitHub.getAuthUser()` returns every auth user component if present', async t => {
  const client: GitHubClient = {
    rest: {
      users: {
        getAuthenticated: async () => ({data: {login: 'alejandrohdezma', email: 'alex@example.com', name: 'Alex'}}),
      },
    },
  }

  const input = GitHub.from(Logger.noOp, client)

  const user = await input.getAuthUser()

  t.is(user.login().value, 'alejandrohdezma')
  t.is(user.email().value, 'alex@example.com')
  t.is(user.name().value, 'Alex')
})

test('`GitHub.getAuthUser()` throws error on any empty component', async t => {
  const client: GitHubClient = {
    rest: {
      users: {
        getAuthenticated: async () => ({data: {login: '', email: '', name: ''}}),
      },
    },
  }

  const input = GitHub.from(Logger.noOp, client)

  const user = await input.getAuthUser()

  {
    const expected = 'Unable to retrieve user information from Github'
    t.throws(() => user.login().value, {instanceOf: Error, message: expected})
  }

  {
    const expected = 'Unable to find author\'s email. Either ensure that the token\'s Github Account '
      + 'has the email privacy feature disabled for at least one email or use the `author-email` input to provide one.'
    t.throws(() => user.email().value, {instanceOf: Error, message: expected})
  }

  {
    const expected = 'Unable to find author\'s name. Either ensure that the token\'s Github Account '
      + 'has a valid name set in its profile or use the `author-name` input to provide one.'
    t.throws(() => user.name().value, {instanceOf: Error, message: expected})
  }
})

test('`GitHub.getAuthUser()` throws error on any null component', async t => {
  const client: GitHubClient = {
    rest: {
      users: {
        getAuthenticated: async () => ({data: {login: 'alex', email: null, name: null}}),
      },
    },
  }

  const input = GitHub.from(Logger.noOp, client)

  const user = await input.getAuthUser()

  {
    const expected = 'Unable to find author\'s email. Either ensure that the token\'s Github Account '
      + 'has the email privacy feature disabled for at least one email or use the `author-email` input to provide one.'
    t.throws(() => user.email().value, {instanceOf: Error, message: expected})
  }

  {
    const expected = 'Unable to find author\'s name. Either ensure that the token\'s Github Account '
      + 'has a valid name set in its profile or use the `author-name` input to provide one.'
    t.throws(() => user.name().value, {instanceOf: Error, message: expected})
  }
})
