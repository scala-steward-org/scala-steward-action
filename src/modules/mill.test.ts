import * as os from 'node:os'
import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import {
  beforeEach, describe, expect, test, vi,
} from 'vitest'
import {execute} from '../core/exec.js'
import {install, remove} from './mill.js'

vi.mock('node:os', () => ({
  homedir: vi.fn(),
  platform: vi.fn(),
  arch: vi.fn(),
}))
vi.mock('@actions/core')
vi.mock('@actions/exec')
vi.mock('@actions/io')
vi.mock('@actions/tool-cache')
vi.mock('../core/exec.js')

const maven = 'https://repo1.maven.org/maven2'

/** Defaults to a Linux x64 runner with nothing cached, so a URL gets built. */
function setup({
  millVersion,
  millRepository = maven,
  platform = 'linux',
  arch = 'x64',
  cachedPath = '',
}: {
  millVersion: string;
  millRepository?: string;
  platform?: NodeJS.Platform;
  arch?: NodeJS.Architecture;
  cachedPath?: string;
}) {
  const inputs: Record<string, string> = {
    'mill-version': millVersion,
    'mill-repository': millRepository,
  }

  vi.mocked(core.getInput).mockImplementation(name => inputs[name] ?? '')
  vi.mocked(os.homedir).mockReturnValue('/home/runner')
  vi.mocked(os.platform).mockReturnValue(platform)
  vi.mocked(os.arch).mockReturnValue(arch)
  vi.mocked(tc.find).mockReturnValue(cachedPath)
  vi.mocked(tc.downloadTool).mockResolvedValue('/home/runner/bin/mill')
  vi.mocked(execute).mockResolvedValue('/coursier/cache/mill\n')
}

/** GitHub releases go through the tool cache, everything else through `cs get`. */
function downloadedUrl(): string | undefined {
  const fromToolCache = vi.mocked(tc.downloadTool).mock.calls[0]?.[0]

  if (fromToolCache !== undefined) {
    return fromToolCache
  }

  const fromCoursier = vi.mocked(execute).mock.calls[0]

  return fromCoursier?.[2]
}

beforeEach(() => {
  vi.resetAllMocks()
})

/**
 * Pins the URL `getDownloadUrl` builds today. Three of these answer 404, since
 * the native suffix is appended to every Maven download but `mill-dist-native-*`
 * only starts at 0.12.6, and the milestone pattern asks for `0.11.0-M-7`.
 */
describe('`install()` → builds the download URL the way the Mill bootstrap script does', () => {
  const cases: Array<{version: string; url: string; reason: string}> = [
    {
      version: '0.4.2',
      url: 'https://github.com/lihaoyi/mill/releases/download/0.4.2/0.4.2',
      reason: 'releases up to 0.4.x ship a bare launcher',
    },
    {
      version: '0.5.0',
      url: 'https://github.com/lihaoyi/mill/releases/download/0.5.0/0.5.0-assembly',
      reason: '0.5.x starts publishing the assembly',
    },
    {
      version: '0.9.12',
      url: 'https://github.com/lihaoyi/mill/releases/download/0.9.12/0.9.12-assembly',
      reason: 'the assembly naming holds through 0.9.x',
    },
    {
      version: '0.10.15',
      url: 'https://github.com/lihaoyi/mill/releases/download/0.10.15/0.10.15-assembly',
      reason: '0.10.x is the last line served from GitHub',
    },
    {
      version: '0.11.6',
      url: `${maven}/com/lihaoyi/mill-dist-native-linux-amd64/0.11.6/mill-dist-native-linux-amd64-0.11.6.jar`,
      reason: '0.11.x moves to Maven and is still a jar, but this URL answers 404',
    },
    {
      version: '0.11.0-M7',
      url: `${maven}/com/lihaoyi/mill-dist-native-linux-amd64/0.11.0-M7/mill-dist-native-linux-amd64-0.11.0-M7.jar`,
      reason: 'the milestone pattern wants `0.11.0-M-7`, so this misses it and answers 404',
    },
    {
      version: '0.12.0',
      url: `${maven}/com/lihaoyi/mill-dist-native-linux-amd64/0.12.0/mill-dist-native-linux-amd64-0.12.0.jar`,
      reason: '0.12.0 is listed as a jar but predates the native artifact and answers 404',
    },
    {
      version: '0.12.11',
      url: `${maven}/com/lihaoyi/mill-dist-native-linux-amd64/0.12.11/mill-dist-native-linux-amd64-0.12.11.jar`,
      reason: '0.12.11 is the last of the explicitly listed jars',
    },
    {
      version: '0.12.13',
      url: `${maven}/com/lihaoyi/mill-dist-native-linux-amd64/0.12.13/mill-dist-native-linux-amd64-0.12.13.exe`,
      reason: '0.12.12 onwards falls to the native launcher',
    },
    {
      version: '0.13.0-M2',
      url: `${maven}/com/lihaoyi/mill-dist-native-linux-amd64/0.13.0-M2/mill-dist-native-linux-amd64-0.13.0-M2.jar`,
      reason: 'other 0.x lines stay on the jar',
    },
    {
      version: '1.0.0',
      url: `${maven}/com/lihaoyi/mill-dist-native-linux-amd64/1.0.0/mill-dist-native-linux-amd64-1.0.0.exe`,
      reason: '1.x and later are native launchers',
    },
  ]

  for (const {version, url, reason} of cases) {
    test(`${version} because ${reason}`, async () => {
      setup({millVersion: version})

      await install()

      expect(downloadedUrl()).toBe(url)
    })
  }
})

describe('`install()` → names the artifact after the runner it is on', () => {
  const cases: Array<{platform: NodeJS.Platform; arch: NodeJS.Architecture; suffix: string}> = [
    {platform: 'linux', arch: 'x64', suffix: '-native-linux-amd64'},
    {platform: 'linux', arch: 'arm64', suffix: '-native-linux-aarch64'},
    {platform: 'darwin', arch: 'x64', suffix: '-native-mac-amd64'},
    {platform: 'darwin', arch: 'arm64', suffix: '-native-mac-aarch64'},
  ]

  for (const {platform, arch, suffix} of cases) {
    test(`${platform} ${arch}`, async () => {
      setup({millVersion: '1.0.0', platform, arch})

      await install()

      expect(downloadedUrl()).toBe(`${maven}/com/lihaoyi/mill-dist${suffix}/1.0.0/mill-dist${suffix}-1.0.0.exe`)
    })
  }
})

test('`install()` → fails on a platform that has no native launcher', async () => {
  setup({millVersion: '1.0.0', platform: 'win32'})

  await expect(install()).rejects.toThrow(new Error('Unable to install Mill'))
})

test('`install()` → strips trailing slashes off the configured repository', async () => {
  setup({millVersion: '1.0.0', millRepository: 'https://mirror.example.com/maven///'})

  await install()

  expect(downloadedUrl()).toBe('https://mirror.example.com/maven/com/lihaoyi/mill-dist-native-linux-amd64/1.0.0/mill-dist-native-linux-amd64-1.0.0.exe')
})

test('`install()` → downloads a GitHub release through the tool cache', async () => {
  setup({millVersion: '0.9.12'})

  await install()

  expect(vi.mocked(tc.downloadTool).mock.calls[0]?.[1]).toBe('/home/runner/bin/mill')
  expect(vi.mocked(execute)).not.toHaveBeenCalled()
})

test('`install()` → fetches a Maven artifact with `cs get` and copies it into place', async () => {
  setup({millVersion: '1.0.0'})

  await install()

  expect(vi.mocked(execute).mock.calls[0]?.[0]).toBe('cs')
  expect(vi.mocked(execute).mock.calls[0]?.[1]).toBe('get')
  expect(vi.mocked(io.cp).mock.calls[0]).toStrictEqual(['/coursier/cache/mill', '/home/runner/bin/mill'])
  expect(vi.mocked(tc.downloadTool)).not.toHaveBeenCalled()
})

test('`install()` → creates the binary directory before downloading', async () => {
  setup({millVersion: '1.0.0'})

  await install()

  expect(vi.mocked(io.mkdirP).mock.calls[0]?.[0]).toBe('/home/runner/bin')
})

test('`install()` → makes the downloaded launcher executable and caches it', async () => {
  setup({millVersion: '0.9.12'})

  await install()

  expect(vi.mocked(exec.exec).mock.calls[0]?.[0]).toBe('chmod')
  expect(vi.mocked(exec.exec).mock.calls[0]?.[1]).toStrictEqual(['+x', '/home/runner/bin/mill'])
  expect(vi.mocked(tc.cacheFile).mock.calls[0]).toStrictEqual([
    '/home/runner/bin/mill', 'mill', 'mill', '0.9.12',
  ])
})

test('`install()` → reuses a cached Mill without downloading anything', async () => {
  setup({millVersion: '1.0.0', cachedPath: '/opt/hostedtoolcache/mill/1.0.0/x64'})

  await install()

  expect(vi.mocked(core.addPath).mock.calls[0]?.[0]).toBe('/opt/hostedtoolcache/mill/1.0.0/x64')
  expect(vi.mocked(tc.downloadTool)).not.toHaveBeenCalled()
  expect(vi.mocked(execute)).not.toHaveBeenCalled()
})

test('`install()` → keeps the original failure as the cause', async () => {
  setup({millVersion: '1.0.0'})

  const cause = new Error('404 Not Found')
  vi.mocked(execute).mockRejectedValue(cause)

  await expect(install()).rejects.toThrow(new Error('Unable to install Mill'))
  await expect(install()).rejects.toHaveProperty('cause', cause)
})

test('`remove()` → deletes the Mill launcher from the binary directory', async () => {
  vi.mocked(os.homedir).mockReturnValue('/home/runner')

  await remove()

  expect(vi.mocked(io.rmRF).mock.calls[0]?.[0]).toBe('/home/runner/bin/mill')
})

test('`install()` → survives a rejection that is not an Error', async () => {
  setup({millVersion: '1.0.0'})
  vi.mocked(execute).mockRejectedValue('coursier exploded')

  await expect(install()).rejects.toThrow(new Error('Unable to install Mill'))
  expect(vi.mocked(core.error)).toHaveBeenCalledWith('coursier exploded')
})
