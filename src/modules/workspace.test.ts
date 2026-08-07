import {
  afterAll, beforeAll, expect, test, vi,
} from 'vitest'
import {type ActionCache} from '../core/cache.js'
import {type Files} from '../core/files.js'
import {Logger} from '../core/logger.js'
import {mandatory} from '../core/types.js'
import {Workspace} from './workspace.js'

type Overrides = {
  logger?: Logger;
  mkdirP?: Files['mkdirP'];
  restoreCache?: ActionCache['restoreCache'];
  saveCache?: ActionCache['saveCache'];
}

/** The failure paths are only observable through what got logged. */
function recordingLogger() {
  const logs: string[] = []

  const logger: Logger = {
    startGroup(group) {
      logs.push(`startGroup("${group}")`)
    },
    endGroup() {
      logs.push('endGroup()')
    },
    info(message) {
      logs.push(`info("${message}")`)
    },
    debug(message) {
      logs.push(`debug("${message}")`)
    },
    error(message) {
      logs.push(`error("${message}")`)
    },
    warning(message) {
      logs.push(`warning("${message}")`)
    },
  }

  return {logger, logs}
}

function fixture(repos_md = '', overrides: Overrides = {}) {
  const calls: string[] = []

  const files: Files = {
    chmodSync(path, mode) {
      calls.push(`chmodSync("${path}", ${mode})`)
    },
    mkdirP: overrides.mkdirP ?? (async path => {
      calls.push(`mkdirP("${path}")`)
    }),
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
    restoreCache: overrides.restoreCache ?? (async (paths, primaryKey, restoreKeys) => {
      calls.push(`restoreCache([${paths.toString()}], "${primaryKey}", [${restoreKeys?.toString() ?? ''}])`)
      return 'hit'
    }),
    saveCache: overrides.saveCache ?? (async (paths, key) => calls.push(`saveCache([${paths.toString()}], "${key}")`)),
  }

  const workspace = Workspace.from(overrides.logger ?? Logger.noOp, files, os, cache)

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

test('`Workspace.restoreWorkspaceCache()` → says so when there was nothing cached', async () => {
  const {logger, logs} = recordingLogger()
  const {workspace} = fixture('- owner/repo', {
    logger, async restoreCache() {
      return undefined
    },
  })

  await workspace.restoreWorkspaceCache()

  expect(logs).toContain('info("Scala Steward workspace contents weren\'t found on cache")')
})

test('`Workspace.restoreWorkspaceCache()` → warns instead of failing when the cache is unreachable', async () => {
  const {logger, logs} = recordingLogger()
  const {workspace} = fixture('- owner/repo', {
    logger, async restoreCache() {
      throw new Error('cache service unavailable')
    },
  })

  await expect(workspace.restoreWorkspaceCache()).resolves.not.toThrow()

  expect(logs).toContain('debug("cache service unavailable")')
  expect(logs).toContain('warning("Unable to restore workspace from cache")')
})

test('`Workspace.restoreWorkspaceCache()` → closes the log group even after a failure', async () => {
  const {logger, logs} = recordingLogger()
  const {workspace} = fixture('- owner/repo', {
    logger, async restoreCache() {
      throw new Error('boom')
    },
  })

  await workspace.restoreWorkspaceCache()

  expect(logs.filter(log => log === 'endGroup()')).toHaveLength(1)
})

test('`Workspace.saveWorkspaceCache()` → warns instead of failing when the cache cannot be written', async () => {
  const {logger, logs} = recordingLogger()
  const {workspace} = fixture('- owner/repo', {
    logger, async saveCache() {
      throw new Error('cache upload failed')
    },
  })

  await expect(workspace.purgeTempFilesAndSaveCache()).resolves.not.toThrow()

  expect(logs).toContain('debug("cache upload failed")')
  expect(logs).toContain('warning("Unable to save workspace to cache")')
  expect(logs.filter(log => log === 'endGroup()')).toHaveLength(1)
})

test('`Workspace.prepare()` → keeps the original failure as the cause', async () => {
  const cause = new Error('EACCES: permission denied')
  const {workspace} = fixture('', {
    async mkdirP() {
      throw cause
    },
  })

  await expect(workspace.prepare('- owner/repo', async () => '123', undefined))
    .rejects.toThrow(new Error('Unable to create Scala Steward workspace'))

  const {workspace: another} = fixture('', {
    async mkdirP() {
      throw cause
    },
  })

  await expect(another.prepare('- owner/repo', async () => '123', undefined))
    .rejects.toHaveProperty('cause', cause)
})

test('`Workspace.prepare()` → rewrites the askpass file with a fresh token every fifty minutes', async () => {
  const {logger, logs} = recordingLogger()
  const {workspace, calls} = fixture('', {logger})

  let issued = 0

  await workspace.prepare('- owner/repo', async () => {
    issued += 1
    return `token-${issued}`
  }, undefined)

  expect(calls).toContain('writeFileSync("/home/scala-steward/askpass.sh", "#!/bin/sh\n\necho \'token-1\'")')

  await vi.advanceTimersByTimeAsync(1000 * 60 * 50)

  expect(calls).toContain('writeFileSync("/home/scala-steward/askpass.sh", "#!/bin/sh\n\necho \'token-2\'")')
  expect(logs).toContain('info("✓ GitHub Token refreshed")')

  await workspace.cancelTokenRefresh()
})

test('`Workspace.cancelTokenRefresh()` → stops the token from being rewritten again', async () => {
  const {workspace, calls} = fixture()

  let issued = 0

  await workspace.prepare('- owner/repo', async () => {
    issued += 1
    return `token-${issued}`
  }, undefined)

  await workspace.cancelTokenRefresh()

  const writesBefore = calls.length

  await vi.advanceTimersByTimeAsync(1000 * 60 * 50 * 3)

  expect(calls).toHaveLength(writesBefore)
})

test('`Workspace.cancelTokenRefresh()` → does nothing when the workspace was never prepared', async () => {
  const {workspace, calls} = fixture()

  await expect(workspace.cancelTokenRefresh()).resolves.not.toThrow()

  expect(calls).toStrictEqual([])
})

test('`Workspace` → survives cache failures that are not Errors', async () => {
  const notAnError: unknown = 'cache service returned a string'

  const restore = recordingLogger()
  const {workspace} = fixture('- owner/repo', {
    logger: restore.logger, async restoreCache() {
      throw notAnError
    },
  })

  await workspace.restoreWorkspaceCache()

  expect(restore.logs).toContain('debug("cache service returned a string")')

  const save = recordingLogger()
  const {workspace: saving} = fixture('- owner/repo', {
    logger: save.logger, async saveCache() {
      throw notAnError
    },
  })

  await saving.purgeTempFilesAndSaveCache()

  expect(save.logs).toContain('debug("cache service returned a string")')
})

test('`Workspace.prepare()` → survives a failure that is not an Error', async () => {
  const notAnError: unknown = 'mkdir returned a string'
  const {logger, logs} = recordingLogger()
  const {workspace} = fixture('', {
    logger, async mkdirP() {
      throw notAnError
    },
  })

  await expect(workspace.prepare('- owner/repo', async () => '123', undefined))
    .rejects.toThrow(new Error('Unable to create Scala Steward workspace'))

  expect(logs).toContain('debug("mkdir returned a string")')
})
