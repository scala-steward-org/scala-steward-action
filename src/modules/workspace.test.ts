import {fail} from 'assert'
import test from 'ava'
import * as sinon from 'sinon'
import {type ActionCache} from '../core/cache'
import {type Files} from '../core/files'
import {Logger} from '../core/logger'
import {mandatory} from '../core/types'
import {Workspace} from './workspace'

function fixture(repos_md = '') {
  const calls: string[] = []

  const files: Files = {
    async chmodSync(path, mode) {
      calls.push(`chmodSync("${path}", ${mode})`)
    },
    async mkdirP(path) {
      calls.push(`mkdirP("${path}")`)
    },
    async writeFileSync(path, content) {
      calls.push(`writeFileSync("${path}", "${content}")`)
    },
    existsSync: path => fail(`existsSync(${path}) should not be called`),
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

test.before(() => {
  sinon.useFakeTimers()
})

test.after(() => {
  sinon.restore()
})

test('`Workspace.prepare()` → prepares the workspace', async t => {
  const {workspace, calls} = fixture()

  await workspace.prepare('- owner/repo1\n- owner/repo2', async () => '123', undefined)

  const expected: string[] = [
    'mkdirP("/home/scala-steward")',
    'writeFileSync("/home/scala-steward/repos.md", "- owner/repo1\n- owner/repo2")',
    'writeFileSync("/home/scala-steward/askpass.sh", "#!/bin/sh\n\necho \'123\'")',
    'chmodSync("/home/scala-steward/askpass.sh", 493)',
  ]

  t.deepEqual(calls, expected)
})

test('`Workspace.prepare()` → prepares the workspace when using a GitHub App', async t => {
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

  t.deepEqual(calls, expected)
})

test('`Workspace.prepare()` → uses the repos input when GitHub App is "auth only"', async t => {
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

  t.deepEqual(calls, expected)
})

test('`Workspace.writeAskPass()` → writes a token to the askpass.sh', async t => {
  const {workspace, calls} = fixture()

  await workspace.writeAskPass(async () => '123')

  const expected: string[] = [
    'writeFileSync("/home/scala-steward/askpass.sh", "#!/bin/sh\n\necho \'123\'")',
  ]

  t.deepEqual(calls, expected)
})

test('`Workspace.remove()` → removes the workspace', async t => {
  const {workspace, calls} = fixture()

  await workspace.remove()

  const expected: string[] = [
    'rmRF("/home/scala-steward")',
  ]

  t.deepEqual(calls, expected)
})

test('`Workspace.restoreWorkspaceCache()` → tries to restore the workspace cache', async t => {
  const {workspace, calls} = fixture('- owner/repo')

  await workspace.restoreWorkspaceCache()

  const now = Date.now()

  const expected: string[] = [
    'readFileSync("/home/scala-steward/repos.md")',
    `restoreCache([/home/scala-steward/workspace], "scala-steward-acc000fd-${now}", [scala-steward-acc000fd,scala-steward-])`,
  ]

  t.deepEqual(calls, expected)
})

test('`Workspace.restoreWorkspaceCache()` → generates same hash for same contents', async t => {
  const {workspace, calls} = fixture('- owner/repo')

  await workspace.restoreWorkspaceCache()

  const now = Date.now()

  const expected: string[] = [
    'readFileSync("/home/scala-steward/repos.md")',
    `restoreCache([/home/scala-steward/workspace], "scala-steward-acc000fd-${now}", [scala-steward-acc000fd,scala-steward-])`,
  ]

  t.deepEqual(calls, expected)
})

test('`Workspace.restoreWorkspaceCache()` → generates different hash for different contents', async t => {
  const {workspace, calls} = fixture('- owner/repo1')

  await workspace.restoreWorkspaceCache()

  const now = Date.now()

  const expected: string[] = [
    'readFileSync("/home/scala-steward/repos.md")',
    `restoreCache([/home/scala-steward/workspace], "scala-steward-fe470d28-${now}", [scala-steward-fe470d28,scala-steward-])`,
  ]

  t.deepEqual(calls, expected)
})

test('`Workspace.saveWorkspaceCache()` → saves cache', async t => {
  const {workspace, calls} = fixture('- owner/repo')

  await workspace.saveWorkspaceCache()

  const now = Date.now()

  const expected: string[] = [
    'rmRF("/home/scala-steward/workspace/store/refresh_error")',
    'rmRF("/home/scala-steward/workspace/repos")',
    'rmRF("/home/scala-steward/workspace/run-summary.md")',
    'readFileSync("/home/scala-steward/repos.md")',
    `saveCache([/home/scala-steward/workspace], "scala-steward-acc000fd-${now}")`,
  ]

  t.deepEqual(calls, expected)
})
