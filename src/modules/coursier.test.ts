import * as os from 'node:os'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import {
  beforeEach, expect, test, vi,
} from 'vitest'
import {execute} from '../core/exec.js'
import {mandatory} from '../core/types.js'
import {
  connectivityProbe, install, launch, remove, selfInstall, versionedApp,
} from './coursier.js'

vi.mock('node:os', () => ({homedir: vi.fn()}))
vi.mock('@actions/core')
vi.mock('@actions/exec')
vi.mock('@actions/io')
vi.mock('@actions/tool-cache')
vi.mock('../core/exec.js')

const binary = '/home/runner/.local/bin'

function setup(inputs: Record<string, string> = {}) {
  vi.mocked(core.getInput).mockImplementation(name => inputs[name] ?? '')
  vi.mocked(os.homedir).mockReturnValue('/home/runner')
  vi.mocked(tc.downloadTool).mockResolvedValue(`${binary}/cs.gz`)
  vi.mocked(exec.exec).mockResolvedValue(0)
  vi.mocked(execute).mockResolvedValue('')
}

/** Returns the argument list of the `cs` invocation that starts with `subcommand`. */
function coursierCall(subcommand: string): string[] | undefined {
  return vi.mocked(exec.exec).mock.calls.find(([tool, arguments_]) => tool === 'cs' && Array.isArray(arguments_) && arguments_[0] === subcommand)?.[1]
}

beforeEach(() => {
  vi.resetAllMocks()
})

test('`versionedApp()` → pins the app when a version is given', () => {
  expect(versionedApp('scalafmt', '3.8.3')).toBe('scalafmt:3.8.3')
})

test('`versionedApp()` → leaves the app unpinned when the version is empty', () => {
  expect(versionedApp('scalafmt', '')).toBe('scalafmt')
})

test('`selfInstall()` → downloads the configured coursier binary and unpacks it', async () => {
  setup({'coursier-cli-url': 'https://example.com/cs-x86_64-pc-linux.gz'})

  await selfInstall()

  expect(vi.mocked(io.mkdirP).mock.calls[0]?.[0]).toBe(binary)
  expect(vi.mocked(tc.downloadTool).mock.calls[0]).toStrictEqual([
    'https://example.com/cs-x86_64-pc-linux.gz', `${binary}/cs.gz`,
  ])
  expect(vi.mocked(exec.exec).mock.calls[0]?.[0]).toBe('gzip')
  expect(vi.mocked(exec.exec).mock.calls[0]?.[1]).toStrictEqual(['-df', `${binary}/cs.gz`])
  expect(vi.mocked(exec.exec).mock.calls[1]?.[1]).toStrictEqual(['+x', `${binary}/cs`])
})

test('`selfInstall()` → puts the binary directory on the PATH', async () => {
  setup({'coursier-cli-url': 'https://example.com/cs.gz'})

  await selfInstall()

  expect(vi.mocked(core.addPath).mock.calls[0]?.[0]).toBe(binary)
})

test('`selfInstall()` → keeps the original failure as the cause', async () => {
  setup({'coursier-cli-url': 'https://example.com/cs.gz'})

  const cause = new Error('403 Forbidden')
  vi.mocked(tc.downloadTool).mockRejectedValue(cause)

  await expect(selfInstall()).rejects.toThrow(new Error('Unable to install coursier'))
  await expect(selfInstall()).rejects.toHaveProperty('cause', cause)
})

test('`install()` → installs the managed tools at their configured versions', async () => {
  setup({
    'scalafmt-version': '3.8.3',
    'scala-cli-version': '1.5.0',
    'sbt-version': '1.10.2',
    'scalafix-dependency': 'ch.epfl.scala:scalafix-cli_2.13.14:0.13.0',
  })

  await install()

  expect(coursierCall('install')).toStrictEqual([
    'install', 'scalafmt:3.8.3', 'scala-cli:1.5.0', 'sbt:1.10.2', '--install-dir', binary,
  ])
})

test('`install()` → leaves the managed tools unpinned when no version is configured', async () => {
  setup({'scalafix-dependency': 'ch.epfl.scala:scalafix-cli_2.13.14:0.13.0'})

  await install()

  expect(coursierCall('install')).toStrictEqual([
    'install', 'scalafmt', 'scala-cli', 'sbt', '--install-dir', binary,
  ])
})

test('`install()` → bootstraps scalafix from the configured dependency', async () => {
  setup({'scalafix-dependency': 'ch.epfl.scala:scalafix-cli_2.13.14:0.13.0'})

  await install()

  expect(coursierCall('bootstrap')).toStrictEqual([
    'bootstrap',
    '--main',
    'scalafix.cli.Cli',
    'ch.epfl.scala:scalafix-cli_2.13.14:0.13.0',
    '-o',
    `${binary}/scalafix`,
  ])
})

test('`install()` → reports the scalafmt version without repeating the tool name', async () => {
  setup({'scalafix-dependency': 'ch.epfl.scala:scalafix-cli_2.13.14:0.13.0'})
  vi.mocked(execute).mockResolvedValue('scalafmt 3.8.3\n')

  await install()

  expect(vi.mocked(core.info).mock.calls[0]?.[0]).toBe('✓ Scalafmt installed, version: 3.8.3')
})

test('`install()` → keeps the original failure as the cause', async () => {
  setup({'scalafix-dependency': 'ch.epfl.scala:scalafix-cli_2.13.14:0.13.0'})

  const cause = new Error('resolution failed')
  vi.mocked(exec.exec).mockRejectedValue(cause)

  await expect(install()).rejects.toThrow(new Error('Unable to install managed tools'))
  await expect(install()).rejects.toHaveProperty('cause', cause)
})

test('`connectivityProbe` → reports success when coursier resolves the probe artifact', async () => {
  setup()

  await expect(connectivityProbe()).resolves.toBe(true)
  expect(coursierCall('resolve')).toStrictEqual([
    'resolve', '--intransitive', 'org.scala-lang:scala-library:2.13.12',
  ])
})

test('`connectivityProbe` → reports failure when coursier cannot resolve it', async () => {
  setup()
  vi.mocked(exec.exec).mockResolvedValue(1)

  await expect(connectivityProbe()).resolves.toBe(false)
})

test('`connectivityProbe` → lets coursier fail without throwing', async () => {
  setup()

  await connectivityProbe()

  const options = vi.mocked(exec.exec).mock.calls[0]?.[2]

  expect(options?.ignoreReturnCode).toBe(true)
})

test('`launch()` → passes the app and its arguments after the separator', async () => {
  setup()

  await launch('org.scala-steward:scala-steward-core_2.13:1.2.3', ['--do-not-fork', '--disable-sandbox'])

  expect(coursierCall('launch')).toStrictEqual([
    'launch',
    '--contrib',
    '-r',
    'central:maven-snapshots',
    'org.scala-steward:scala-steward-core_2.13:1.2.3',
    '--',
    '--do-not-fork',
    '--disable-sandbox',
  ])
})

test('`launch()` → flattens arguments that arrive already paired', async () => {
  setup()

  await launch('app', [['--repos', 'repos.md'], '--verbose'])

  expect(coursierCall('launch')).toStrictEqual([
    'launch',
    '--contrib',
    '-r',
    'central:maven-snapshots',
    'app',
    '--',
    '--repos',
    'repos.md',
    '--verbose',
  ])
})

test('`launch()` → adds extra jars before the separator when given', async () => {
  setup()

  await launch('app', ['--verbose'], mandatory('/tmp/extra.jar'))

  expect(coursierCall('launch')).toStrictEqual([
    'launch',
    '--contrib',
    '-r',
    'central:maven-snapshots',
    'app',
    '--extra-jars',
    '/tmp/extra.jar',
    '--',
    '--verbose',
  ])
})

test('`launch()` → runs with no arguments at all when none are given', async () => {
  setup()

  await launch('app')

  expect(coursierCall('launch')).toStrictEqual([
    'launch', '--contrib', '-r', 'central:maven-snapshots', 'app', '--',
  ])
})

test('`launch()` → closes the log group even though the app failed', async () => {
  setup()
  vi.mocked(exec.exec).mockResolvedValue(1)

  await expect(launch('app')).rejects.toThrow(new Error('Launching app failed'))
  expect(vi.mocked(core.endGroup)).toHaveBeenCalled()
})

test('`remove()` → deletes the coursier cache and uninstalls every managed app', async () => {
  setup()

  await remove()

  expect(vi.mocked(io.rmRF).mock.calls[0]?.[0]).toBe('/home/runner/.cache/coursier/v1')
  expect(coursierCall('uninstall')).toStrictEqual(['uninstall', '--all'])
})

test('`selfInstall()` → survives a rejection that is not an Error', async () => {
  setup({'coursier-cli-url': 'https://example.com/cs.gz'})
  vi.mocked(tc.downloadTool).mockRejectedValue('network unreachable')

  await expect(selfInstall()).rejects.toThrow(new Error('Unable to install coursier'))
  expect(vi.mocked(core.debug)).toHaveBeenCalledWith('network unreachable')
})

test('`install()` → survives a rejection that is not an Error', async () => {
  setup({'scalafix-dependency': 'ch.epfl.scala:scalafix-cli_2.13.14:0.13.0'})
  vi.mocked(exec.exec).mockRejectedValue('coursier exploded')

  await expect(install()).rejects.toThrow(new Error('Unable to install managed tools'))
  expect(vi.mocked(core.debug)).toHaveBeenCalledWith('coursier exploded')
})
