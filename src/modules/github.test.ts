import {fail} from 'assert'
import test from 'ava'
import {Logger} from '../core/logger'
import {GitHub, type GitHubClient} from './github'

test('`GitHub.getAuthUser()` → returns every auth user component', async t => {
  const client: GitHubClient = {
    rest: {
      users: {
        getByUsername: async () => fail('This should not be called'),
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

test('`GitHub.getAuthUser()` → throws error on any empty component', async t => {
  const client: GitHubClient = {
    rest: {
      users: {
        getByUsername: async () => fail('This should not be called'),
        getAuthenticated: async () => ({data: {login: '', email: '', name: ''}}),
      },
    },
  }

  const input = GitHub.from(Logger.noOp, client)

  const user = await input.getAuthUser()

  {
    const expected = 'Unable to retrieve user information from GitHub'
    t.throws(() => user.login().value, {instanceOf: Error, message: expected})
  }

  {
    const expected = 'Unable to find author\'s email. Either ensure that the token\'s GitHub Account '
      + 'has the email privacy feature disabled for at least one email or use the `author-email` input to provide one.'
    t.throws(() => user.email().value, {instanceOf: Error, message: expected})
  }

  {
    const expected = 'Unable to find author\'s name. Either ensure that the token\'s GitHub Account '
      + 'has a valid name set in its profile or use the `author-name` input to provide one.'
    t.throws(() => user.name().value, {instanceOf: Error, message: expected})
  }
})

test('`GitHub.getAuthUser()` → throws error on any null component', async t => {
  const client: GitHubClient = {
    rest: {
      users: {
        getByUsername: async () => fail('This should not be called'),
        getAuthenticated: async () => ({data: {login: 'alex', email: null, name: null}}),
      },
    },
  }

  const input = GitHub.from(Logger.noOp, client)

  const user = await input.getAuthUser()

  {
    const expected = 'Unable to find author\'s email. Either ensure that the token\'s GitHub Account '
      + 'has the email privacy feature disabled for at least one email or use the `author-email` input to provide one.'
    t.throws(() => user.email().value, {instanceOf: Error, message: expected})
  }

  {
    const expected = 'Unable to find author\'s name. Either ensure that the token\'s GitHub Account '
      + 'has a valid name set in its profile or use the `author-name` input to provide one.'
    t.throws(() => user.name().value, {instanceOf: Error, message: expected})
  }
})

test('`GitHub.getAppUser()` → returns every auth user component', async t => {
  const client: GitHubClient = {
    rest: {
      users: {
        getByUsername: async () => ({data: {login: 'my-app[bot]', id: 123}}),
        getAuthenticated: async () => fail('This should not be called'),
      },
    },
  }

  const input = GitHub.from(Logger.noOp, client)

  const user = await input.getAppUser('the-slug')

  t.is(user.login().value, 'my-app[bot]')
  t.is(user.email().value, '123+my-app[bot]@users.noreply.github.com')
  t.is(user.name().value, 'my-app[bot]')
})

test('`GitHub.getAppUser()` → returns default user if slug is empty', async t => {
  const client: GitHubClient = {
    rest: {
      users: {
        getByUsername: async () => ({data: {login: 'my-app[bot]', id: 123}}),
        getAuthenticated: async () => fail('This should not be called'),
      },
    },
  }

  const input = GitHub.from(Logger.noOp, client)

  const user = await input.getAppUser(undefined)

  t.is(user.login().value, 'github-actions[bot]')
  t.is(user.email().value, '41898282+github-actions[bot]@users.noreply.github.com')
  t.is(user.name().value, 'github-actions[bot]')
})

test('`GitHub.getAppUser()` → returns default user if failed to obtain bot user', async t => {
  const client: GitHubClient = {
    rest: {
      users: {
        getByUsername: async () => fail('BOOM!'),
        getAuthenticated: async () => fail('This should not be called'),
      },
    },
  }

  const input = GitHub.from(Logger.noOp, client)

  const user = await input.getAppUser(undefined)

  t.is(user.login().value, 'github-actions[bot]')
  t.is(user.email().value, '41898282+github-actions[bot]@users.noreply.github.com')
  t.is(user.name().value, 'github-actions[bot]')
})
