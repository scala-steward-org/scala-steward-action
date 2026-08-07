import {
  afterAll, beforeAll, expect, test, vi,
} from 'vitest'
import {type ActionCache} from '../core/cache.js'
import {type Files} from '../core/files.js'
import {Logger} from '../core/logger.js'
import {mandatory} from '../core/types.js'
import {Workspace} from './workspace.js'

function fixture(repos_md = '') {
  const calls: string[] = []

  const files: Files = {
    chmodSync(path, mode) {
      calls.push(`chmodSync("${path}", ${mode})`)
    },
    async mkdirP(path) {
      calls.push(`mkdirP("${path}")`)
    },
    writeFileSync(path, content) {
      calls.push(`writeFileSync("${path}", "${content}")`)
    },
    existsSync: path => expect.unreachable(`existsSync(${path}) should not be called`),
    async rmRF(path) {
      calls.push(`rmRF("${path}")`)
    },
    readFileSync(path) {
      calls.push(`readFileSync("${path}")`)
      return repos_md
    },
  }

  const os = {homedir: () => '/home/'}

  const cache: ActionCache = {
    async restoreCache(paths, primaryKey, restoreKeys) {
      calls.push(`restoreCache([${paths.toString()}], "${primaryKey}", [${restoreKeys?.toString() ?? ''}])`)
      return 'hit'
    },
    async saveCache(paths, key) {
      return calls.push(`saveCache([${paths.toString()}], "${key}")`)
    },
  }

  const workspace = Workspace.from(Logger.noOp, files, os, cache)

  return {workspace, calls}
}

beforeAll(() => {
  vi.useFakeTimers()
})

afterAll(() => {
  vi.useRealTimers()
})

test('`Workspace.prepare()` → prepares the workspace', async () => {
  const {workspace, calls} = fixture()

  await workspace.prepare('- owner/repo1\n- owner/repo2', async () => '123', undefined)

  const expected: string[] = [
    'mkdirP("/home/scala-steward")',
    'writeFileSync("/home/scala-steward/repos.md", "- owner/repo1\n- owner/repo2")',
    'writeFileSync("/home/scala-steward/askpass.sh", "#!/bin/sh\n\necho \'123\'")',
    'chmodSync("/home/scala-steward/askpass.sh", 493)',
  ]

  expect(calls).toStrictEqual(expected)
})

test('`Workspace.prepare()` → prepares the workspace when using a GitHub App', async () => {
  const {workspace, calls} = fixture()

  const gitHubAppInfo = {
    authOnly: false,
    id: mandatory('this-is-the-id'),
    installation: mandatory('this-is-the-installation-id'),
    key: mandatory('this-is-the-key'),
  }

  await workspace.prepare('this will not be used', async () => '123', gitHubAppInfo)

  const expected: string[] = [
    'mkdirP("/home/scala-steward")',
    'writeFileSync("/home/scala-steward/repos.md", "")',
    'writeFileSync("/home/scala-steward/app.pem", "this-is-the-key")',
    'writeFileSync("/home/scala-steward/askpass.sh", "#!/bin/sh\n\necho \'123\'")',
    'chmodSync("/home/scala-steward/askpass.sh", 493)',
  ]

  expect(calls).toStrictEqual(expected)
})

test('`Workspace.prepare()` → uses the repos input when GitHub App is "auth only"', async () => {
  const {workspace, calls} = fixture()

  const gitHubAppInfo = {
    authOnly: true,
    id: mandatory('this-is-the-id'),
    installation: mandatory('this-is-the-installation-id'),
    key: mandatory('this-is-the-key'),
  }

  await workspace.prepare('- owner/repo', async () => '123', gitHubAppInfo)

  const expected: string[] = [
    'mkdirP("/home/scala-steward")',
    'writeFileSync("/home/scala-steward/repos.md", "- owner/repo")',
    'writeFileSync("/home/scala-steward/askpass.sh", "#!/bin/sh\n\necho \'123\'")',
    'chmodSync("/home/scala-steward/askpass.sh", 493)',
  ]

  expect(calls).toStrictEqual(expected)
})

test('`Workspace.writeAskPass()` → writes a token to the askpass.sh', async () => {
  const {workspace, calls} = fixture()

  await workspace.writeAskPass(async () => '123')

  const expected: string[] = [
    'writeFileSync("/home/scala-steward/askpass.sh", "#!/bin/sh\n\necho \'123\'")',
  ]

  expect(calls).toStrictEqual(expected)
})

test('`Workspace.remove()` → removes the workspace', async () => {
  const {workspace, calls} = fixture()

  await workspace.remove()

  const expected: string[] = [
    'rmRF("/home/scala-steward")',
  ]

  expect(calls).toStrictEqual(expected)
})

test('`Workspace.restoreWorkspaceCache()` → tries to restore the workspace cache', async () => {
  const {workspace, calls} = fixture('- owner/repo')

  await workspace.restoreWorkspaceCache()

  const now = Date.now()

  const expected: string[] = [
    'readFileSync("/home/scala-steward/repos.md")',
    `restoreCache([/home/scala-steward/workspace], "scala-steward-acc000fd-${now}", [scala-steward-acc000fd,scala-steward-])`,
  ]

  expect(calls).toStrictEqual(expected)
})

test('`Workspace.restoreWorkspaceCache()` → generates same hash for same contents', async () => {
  const {workspace, calls} = fixture('- owner/repo')

  await workspace.restoreWorkspaceCache()

  const now = Date.now()

  const expected: string[] = [
    'readFileSync("/home/scala-steward/repos.md")',
    `restoreCache([/home/scala-steward/workspace], "scala-steward-acc000fd-${now}", [scala-steward-acc000fd,scala-steward-])`,
  ]

  expect(calls).toStrictEqual(expected)
})

test('`Workspace.restoreWorkspaceCache()` → generates different hash for different contents', async () => {
  const {workspace, calls} = fixture('- owner/repo1')

  await workspace.restoreWorkspaceCache()

  const now = Date.now()

  const expected: string[] = [
    'readFileSync("/home/scala-steward/repos.md")',
    `restoreCache([/home/scala-steward/workspace], "scala-steward-fe470d28-${now}", [scala-steward-fe470d28,scala-steward-])`,
  ]

  expect(calls).toStrictEqual(expected)
})

test('`Workspace.saveWorkspaceCache()` → saves cache', async () => {
  const {workspace, calls} = fixture('- owner/repo')

  await workspace.purgeTempFilesAndSaveCache()

  const now = Date.now()

  const expected: string[] = [
    'rmRF("/home/scala-steward/workspace/store/refresh_error")',
    'rmRF("/home/scala-steward/workspace/repos")',
    'rmRF("/home/scala-steward/workspace/run-summary.md")',
    'readFileSync("/home/scala-steward/repos.md")',
    `saveCache([/home/scala-steward/workspace], "scala-steward-acc000fd-${now}")`,
  ]

  expect(calls).toStrictEqual(expected)
})
