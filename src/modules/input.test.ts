import {fail} from 'assert'
import test from 'ava'
import {match} from 'ts-pattern'
import {type Files} from '../core/files'
import {Logger} from '../core/logger'
import {nonEmpty} from '../core/types'
import {Input} from './input'

test('`Input.all` → returns all inputs', t => {
  const inputs = (name: string) => match(name)
    .with('github-token', () => '123')
    .with('repo-config', () => '.github/defaults/.scala-steward.conf')
    .with('github-repository', () => 'owner/repo')
    .with('branches', () => '1.0x,2.0x')
    .with('author-email', () => 'alex@example.com')
    .with('author-name', () => 'Alex')
    .with('github-api-url', () => 'github.my-org.com')
    .with('cache-ttl', () => '20m')
    .with('max-buffer-size', () => '16384')
    .with('timeout', () => '60s')
    .with('scala-steward-version', () => '1.0')
    .with('artifact-migrations', () => '.github/artifact-migrations.conf')
    .with('scalafix-migrations', () => '.github/scalafix-migrations.conf')
    .with('other-args', () => '--help')
    .with('signing-key', () => '42')
    .with('extra-jars', () => 'path/to/my/jars')
    .otherwise(() => '')

  const booleanInputs = (name: string) => match(name)
    .with('ignore-opts-files', () => true)
    .with('sign-commits', () => true)
    .otherwise(() => false)

  const files: Files = {
    chmodSync: () => fail('Should not be called'),
    rmRF: () => fail('Should not be called'),
    mkdirP: () => fail('Should not be called'),
    existsSync: name => name === '.github/defaults/.scala-steward.conf',
    writeFileSync: () => fail('Should not be called'),
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: booleanInputs}, files, Logger.noOp)

  const expected = {
    github: {
      token: nonEmpty('123'),
      app: undefined,
      apiUrl: nonEmpty('github.my-org.com'),
    },
    steward: {
      defaultConfiguration: nonEmpty('.github/defaults/.scala-steward.conf'),
      repos: '- owner/repo:1.0x\n- owner/repo:2.0x',
      cacheTtl: nonEmpty('20m'),
      maxBufferSize: nonEmpty('16384'),
      version: nonEmpty('1.0'),
      timeout: nonEmpty('60s'),
      ignoreOptsFiles: true,
      extraArgs: nonEmpty('--help'),
      extraJars: nonEmpty('path/to/my/jars'),
    },
    migrations: {
      scalafix: nonEmpty('.github/scalafix-migrations.conf'),
      artifacts: nonEmpty('.github/artifact-migrations.conf'),
    },
    commits: {
      sign: {
        enabled: true,
        key: nonEmpty('42'),
      },
      author: {
        email: nonEmpty('alex@example.com'),
        name: nonEmpty('Alex'),
      },
    },
  }

  t.deepEqual(input.all(), expected)
})

test('`Input.githubAppInfo()` → returns GitHub App info', t => {
  const inputs = (name: string) => match(name)
    .with('github-app-auth-only', () => 'true')
    .with('github-app-id', () => '123')
    .with('github-app-key', () => '42')
    .with('github-app-installation-id', () => '456')
    .otherwise(() => '')

  const booleanInputs = (name: string) => match(name)
    .with('github-app-auth-only', () => true)
    .otherwise(() => false)

  const files: Files = {
    chmodSync: () => fail('Should not be called'),
    rmRF: () => fail('Should not be called'),
    mkdirP: () => fail('Should not be called'),
    existsSync: () => false,
    writeFileSync: () => fail('Should not be called'),
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: booleanInputs}, files, Logger.noOp)

  const file = input.githubAppInfo()

  t.deepEqual(file, {
    authOnly: true, id: nonEmpty('123'), key: nonEmpty('42'), installation: nonEmpty('456'),
  })
})

test('`Input.githubAppInfo()` → returns undefined on missing inputs', t => {
  const files: Files = {
    chmodSync: () => fail('Should not be called'),
    rmRF: () => fail('Should not be called'),
    mkdirP: () => fail('Should not be called'),
    existsSync: () => false,
    writeFileSync: () => fail('Should not be called'),
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: () => '', getBooleanInput: () => false}, files, Logger.noOp)

  const file = input.githubAppInfo()

  t.is(file, undefined)
})

test('`Input.githubAppInfo()` → throws error if only id input present', t => {
  const inputs = (name: string) => match(name)
    .with('github-app-id', () => '123')
    .otherwise(() => '')

  const files: Files = {
    chmodSync: () => fail('Should not be called'),
    rmRF: () => fail('Should not be called'),
    mkdirP: () => fail('Should not be called'),
    existsSync: () => false,
    writeFileSync: () => fail('Should not be called'),
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const expected = '`github-app-id` and `github-app-key` inputs have to be set together. One of them is missing'

  const error = t.throws(() => input.githubAppInfo(), {instanceOf: Error})

  t.is(error?.message, expected)
})

test('`Input.githubAppInfo()` → throws error if only key input present', t => {
  const inputs = (name: string) => match(name)
    .with('github-app-key', () => '42')
    .otherwise(() => '')

  const files: Files = {
    chmodSync: () => fail('Should not be called'),
    rmRF: () => fail('Should not be called'),
    mkdirP: () => fail('Should not be called'),
    existsSync: () => false,
    writeFileSync: () => fail('Should not be called'),
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const expected = '`github-app-id` and `github-app-key` inputs have to be set together. One of them is missing'

  const error = t.throws(() => input.githubAppInfo(), {instanceOf: Error})

  t.is(error?.message, expected)
})

test('`Input.reposFile()` → returns undefined on missing input', t => {
  const files: Files = {
    chmodSync: () => fail('Should not be called'),
    rmRF: () => fail('Should not be called'),
    mkdirP: () => fail('Should not be called'),
    existsSync: () => false,
    writeFileSync: () => fail('Should not be called'),
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: () => '', getBooleanInput: () => false}, files, Logger.noOp)

  const file = input.reposFile()
  t.is(file, undefined)
})

test('`Input.reposFile()` → returns contents if file exists', t => {
  const inputs = (name: string) => match(name)
    .with('repos-file', () => 'repos.md')
    .otherwise(() => '')

  const contents = '- owner1/repo1\n- owner1/repo2\n- owner2/repo'

  const files: Files = {
    chmodSync: () => fail('Should not be called'),
    rmRF: () => fail('Should not be called'),
    mkdirP: () => fail('Should not be called'),
    existsSync: name => match(name).with('repos.md', () => true).run(),
    writeFileSync: () => fail('Should not be called'),
    readFileSync: name => match(name).with('repos.md', () => contents).run(),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const file = input.reposFile() ?? ''

  t.is(file.toString(), contents)
})

test('`Input.reposFile()` → throws error if file does not exist', t => {
  const inputs = (name: string) => match(name)
    .with('repos-file', () => 'this/does/not/exist.md')
    .otherwise(() => '')

  const files: Files = {
    chmodSync: () => fail('Should not be called'),
    rmRF: () => fail('Should not be called'),
    mkdirP: () => fail('Should not be called'),
    existsSync: () => false,
    writeFileSync: () => fail('Should not be called'),
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const expected = 'The path indicated in `repos-file` (this/does/not/exist.md) does not exist'

  const error = t.throws(() => input.reposFile(), {instanceOf: Error})

  t.is(error?.message, expected)
})

test('`Input.githubRepository()` → returns repository from input', t => {
  const inputs = (name: string) => match(name)
    .with('github-repository', () => 'owner/repo')
    .otherwise(() => '')

  const files: Files = {
    chmodSync: () => fail('Should not be called'),
    rmRF: () => fail('Should not be called'),
    mkdirP: () => fail('Should not be called'),
    existsSync: () => false,
    writeFileSync: () => fail('Should not be called'),
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const content = input.githubRepository()

  const expected = '- owner/repo'

  t.is(content, expected)
})

test('`Input.githubRepository()` → returns repository from input with custom branch', t => {
  const inputs = (name: string) => match(name)
    .with('github-repository', () => 'owner/repo')
    .with('branches', () => '0.1.x')
    .otherwise(() => '')

  const files: Files = {
    chmodSync: () => fail('Should not be called'),
    rmRF: () => fail('Should not be called'),
    mkdirP: () => fail('Should not be called'),
    existsSync: () => false,
    writeFileSync: () => fail('Should not be called'),
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const content = input.githubRepository()

  const expected = '- owner/repo:0.1.x'

  t.is(content, expected)
})

test('`Input.githubRepository()` → returns repository from input with multiple custom branches', t => {
  const inputs = (name: string) => match(name)
    .with('github-repository', () => 'owner/repo')
    .with('branches', () => 'main,0.1.x,0.2.x')
    .otherwise(() => '')

  const files: Files = {
    chmodSync: () => fail('Should not be called'),
    rmRF: () => fail('Should not be called'),
    mkdirP: () => fail('Should not be called'),
    existsSync: () => false,
    writeFileSync: () => fail('Should not be called'),
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const content = input.githubRepository()

  const expected = '- owner/repo:main\n- owner/repo:0.1.x\n- owner/repo:0.2.x'

  t.is(content, expected)
})

test('`Input.defaultRepoConf()` → returns the path if it exists', t => {
  const inputs = (name: string) => match(name)
    .with('repo-config', () => '.scala-steward.conf')
    .otherwise(() => '')

  const files: Files = {
    chmodSync: () => fail('Should not be called'),
    rmRF: () => fail('Should not be called'),
    mkdirP: () => fail('Should not be called'),
    existsSync: name => match(name).with('.scala-steward.conf', () => true).run(),
    writeFileSync: () => fail('Should not be called'),
    readFileSync: () => fail('This should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const path = input.defaultRepoConf()

  const expected = '.scala-steward.conf'

  t.is(path?.value, expected)
})

test('`Input.defaultRepoConf()` → returns the default path if it exists', t => {
  const inputs = (name: string) => match(name)
    .with('repo-config', () => '.github/.scala-steward.conf')
    .otherwise(() => '')

  const files: Files = {
    chmodSync: () => fail('Should not be called'),
    rmRF: () => fail('Should not be called'),
    mkdirP: () => fail('Should not be called'),
    existsSync: name => match(name).with('.github/.scala-steward.conf', () => true).run(),
    writeFileSync: () => fail('Should not be called'),
    readFileSync: () => fail('This should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const path = input.defaultRepoConf()

  const expected = '.github/.scala-steward.conf'

  t.is(path?.value, expected)
})

test('`Input.defaultRepoConf()` → returns undefined if the default path does not exist', t => {
  const inputs = (name: string) => match(name)
    .with('repo-config', () => '.github/.scala-steward.conf')
    .otherwise(() => '')

  const files: Files = {
    chmodSync: () => fail('Should not be called'),
    rmRF: () => fail('Should not be called'),
    mkdirP: () => fail('Should not be called'),
    existsSync: () => false,
    writeFileSync: () => fail('Should not be called'),
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const path = input.defaultRepoConf()

  t.is(path, undefined)
})

test('`Input.defaultRepoConf()` → throws error if provided non-default file does not exist', t => {
  const inputs = (name: string) => match(name)
    .with('repo-config', () => 'tests/resources/.scala-steward-new.conf')
    .otherwise(() => '')

  const files: Files = {
    chmodSync: () => fail('Should not be called'),
    rmRF: () => fail('Should not be called'),
    mkdirP: () => fail('Should not be called'),
    existsSync: () => false,
    writeFileSync: () => fail('Should not be called'),
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const expected = 'Provided default repo conf file (tests/resources/.scala-steward-new.conf) does not exist'

  const error = t.throws(() => input.defaultRepoConf(), {instanceOf: Error})

  t.is(error?.message, expected)
})
