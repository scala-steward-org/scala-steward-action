import test from 'ava'
import {installWith} from './mill'

function fixture(cachedPath: string) {
  const calls: string[] = []

  return {
    calls,
    dependencies: {
      getInput(name: string) {
        calls.push(`getInput("${name}")`)
        return '1.1.2'
      },
      find(toolName: string, versionSpec: string) {
        calls.push(`find("${toolName}", "${versionSpec}")`)
        return cachedPath
      },
      addPath(inputPath: string) {
        calls.push(`addPath("${inputPath}")`)
      },
      debug(message: string) {
        calls.push(`debug("${message}")`)
      },
      info(message: string) {
        calls.push(`info("${message}")`)
      },
      error(message: string) {
        calls.push(`error("${message}")`)
      },
      homedir() {
        calls.push('homedir()')
        return '/home/runner'
      },
      platform() {
        calls.push('platform()')
        return 'linux' as const
      },
      arch() {
        calls.push('arch()')
        return 'x64'
      },
      async mkdirP(path: string) {
        calls.push(`mkdirP("${path}")`)
      },
      async downloadTool(url: string, destination?: string) {
        calls.push(`downloadTool("${url}", "${destination ?? ''}")`)
        return '/home/runner/bin/mill'
      },
      async exec(commandLine: string, arguments_?: string[]) {
        calls.push(`exec("${commandLine}", [${arguments_?.toString() ?? ''}])`)
        return 0
      },
      async cacheFile(sourceFile: string, targetFile: string, tool: string, version: string) {
        calls.push(`cacheFile("${sourceFile}", "${targetFile}", "${tool}", "${version}")`)
        return '/opt/hostedtoolcache/mill/1.1.2'
      },
    },
  }
}

test('`install()` -> adds cached Mill directory to PATH', async t => {
  const {calls, dependencies} = fixture('/opt/hostedtoolcache/mill/1.1.2')

  await installWith(dependencies)

  t.deepEqual(calls, [
    'getInput("mill-version")',
    'find("mill", "1.1.2")',
    'addPath("/opt/hostedtoolcache/mill/1.1.2")',
    'info("✓ Mill installed, version: 1.1.2")',
  ])
})

test('`install()` -> adds freshly downloaded Mill directory to PATH', async t => {
  const {calls, dependencies} = fixture('')

  await installWith(dependencies)

  t.deepEqual(calls, [
    'getInput("mill-version")',
    'find("mill", "1.1.2")',
    'platform()',
    'arch()',
    'debug("Attempting to install Mill from https://repo1.maven.org/maven2/com/lihaoyi/mill-dist-native-linux-amd64/1.1.2/mill-dist-native-linux-amd64-1.1.2.exe")',
    'homedir()',
    'mkdirP("/home/runner/bin")',
    'downloadTool("https://repo1.maven.org/maven2/com/lihaoyi/mill-dist-native-linux-amd64/1.1.2/mill-dist-native-linux-amd64-1.1.2.exe", "/home/runner/bin/mill")',
    'exec("chmod", [+x,/home/runner/bin/mill])',
    'cacheFile("/home/runner/bin/mill", "mill", "mill", "1.1.2")',
    'addPath("/home/runner/bin")',
    'info("✓ Mill installed, version: 1.1.2")',
  ])
})
