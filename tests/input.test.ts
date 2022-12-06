import {fail} from 'assert'
import test from 'ava'
import {match} from 'ts-pattern'
import {type Files} from '../src/files'
import {Input} from '../src/input'
import {Logger} from '../src/logger'
import {nonEmpty} from '../src/types'

test('`Input.all` should return all inputs', t => {
  const inputs = (name: string) => match(name)
    .with('github-token', () => '123')
    .with('repo-config', () => '.github/defaults/.scala-steward.conf')
    .with('github-repository', () => 'owner/repo')
    .with('branches', () => '1.0x,2.0x')
    .with('author-email', () => 'alex@example.com')
    .with('author-name', () => 'Alex')
    .with('github-api-url', () => 'github.my-org.com')
    .with('cache-ttl', () => '20m')
    .with('timeout', () => '60s')
    .with('scala-steward-version', () => '1.0')
    .with('artifact-migrations', () => '.github/artifact-migrations.conf')
    .with('scalafix-migrations', () => '.github/scalafix-migrations.conf')
    .with('other-args', () => '--help')
    .with('signing-key', () => '42')
    .otherwise(() => '')

  const booleanInputs = (name: string) => match(name)
    .with('ignore-opts-files', () => true)
    .with('sign-commits', () => true)
    .run()

  const files: Files = {
    existsSync: name => name === '.github/defaults/.scala-steward.conf',
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
      version: nonEmpty('1.0'),
      timeout: nonEmpty('60s'),
      ignoreOptsFiles: true,
      extraArgs: nonEmpty('--help'),
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

test('`Input.githubAppInfo()` should return GitHub App info', t => {
  const inputs = (name: string) => match(name)
    .with('github-app-id', () => '123')
    .with('github-app-key', () => '42')
    .otherwise(() => '')

  const files: Files = {
    existsSync: () => false,
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const file = input.githubAppInfo()

  t.deepEqual(file, {id: nonEmpty('123'), key: nonEmpty('42')})
})

test('`Input.githubAppInfo()` should return undefined on missing inputs', t => {
  const files: Files = {
    existsSync: () => false,
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: () => '', getBooleanInput: () => false}, files, Logger.noOp)

  const file = input.githubAppInfo()

  t.is(file, undefined)
})

test('`Input.githubAppInfo()` should return error if only id input present', t => {
  const inputs = (name: string) => match(name)
    .with('github-app-id', () => '123')
    .otherwise(() => '')

  const files: Files = {
    existsSync: () => false,
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const expected = '`github-app-id` and `github-app-key` inputs have to be set together. One of them is missing'

  const error = t.throws(() => input.githubAppInfo(), {instanceOf: Error})

  t.is(error?.message, expected)
})

test('`Input.githubAppInfo()` should return error if only key input present', t => {
  const inputs = (name: string) => match(name)
    .with('github-app-key', () => '42')
    .otherwise(() => '')

  const files: Files = {
    existsSync: () => false,
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const expected = '`github-app-id` and `github-app-key` inputs have to be set together. One of them is missing'

  const error = t.throws(() => input.githubAppInfo(), {instanceOf: Error})

  t.is(error?.message, expected)
})

test('`Input.reposFile()` should return undefined on missing input', t => {
  const files: Files = {
    existsSync: () => false,
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: () => '', getBooleanInput: () => false}, files, Logger.noOp)

  const file = input.reposFile()
  t.is(file, undefined)
})

test('`Input.reposFile()` should return contents if file exists', t => {
  const inputs = (name: string) => match(name)
    .with('repos-file', () => 'repos.md')
    .otherwise(() => '')

  const contents = '- owner1/repo1\n- owner1/repo2\n- owner2/repo'

  const files: Files = {
    existsSync: name => match(name).with('repos.md', () => true).run(),
    readFileSync: name => match(name).with('repos.md', () => contents).run(),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const file = input.reposFile() ?? ''

  t.is(file.toString(), contents)
})

test('`Input.reposFile()` should throw error if file doesn\'t exists', t => {
  const inputs = (name: string) => match(name)
    .with('repos-file', () => 'this/does/not/exist.md')
    .otherwise(() => '')

  const files: Files = {
    existsSync: () => false,
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const expected = 'The path indicated in `repos-file` (this/does/not/exist.md) does not exist'

  const error = t.throws(() => input.reposFile(), {instanceOf: Error})

  t.is(error?.message, expected)
})

test('`Input.githubRepository()` should return repository from input', t => {
  const inputs = (name: string) => match(name)
    .with('github-repository', () => 'owner/repo')
    .otherwise(() => '')

  const files: Files = {
    existsSync: () => false,
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const content = input.githubRepository()

  const expected = '- owner/repo'

  t.is(content, expected)
})

test('`Input.githubRepository()` should return repository from input with custom branch', t => {
  const inputs = (name: string) => match(name)
    .with('github-repository', () => 'owner/repo')
    .with('branches', () => '0.1.x')
    .otherwise(() => '')

  const files: Files = {
    existsSync: () => false,
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const content = input.githubRepository()

  const expected = '- owner/repo:0.1.x'

  t.is(content, expected)
})

test('`Input.githubRepository()` should return repository from input with multiple custom branches', t => {
  const inputs = (name: string) => match(name)
    .with('github-repository', () => 'owner/repo')
    .with('branches', () => 'main,0.1.x,0.2.x')
    .otherwise(() => '')

  const files: Files = {
    existsSync: () => false,
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const content = input.githubRepository()

  const expected = '- owner/repo:main\n- owner/repo:0.1.x\n- owner/repo:0.2.x'

  t.is(content, expected)
})

test('`Input.defaultRepoConf()` should return the path if it exists', t => {
  const inputs = (name: string) => match(name)
    .with('repo-config', () => '.scala-steward.conf')
    .otherwise(() => '')

  const files: Files = {
    existsSync: name => match(name).with('.scala-steward.conf', () => true).run(),
    readFileSync: () => fail('This should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const path = input.defaultRepoConf()

  const expected = '.scala-steward.conf'

  t.is(path?.value, expected)
})

test('`Input.defaultRepoConf()` should return the default path if it exists', t => {
  const inputs = (name: string) => match(name)
    .with('repo-config', () => '.github/.scala-steward.conf')
    .otherwise(() => '')

  const files: Files = {
    existsSync: name => match(name).with('.github/.scala-steward.conf', () => true).run(),
    readFileSync: () => fail('This should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const path = input.defaultRepoConf()

  const expected = '.github/.scala-steward.conf'

  t.is(path?.value, expected)
})

test('`Input.defaultRepoConf()` should return undefined if the default path do not exist', t => {
  const inputs = (name: string) => match(name)
    .with('repo-config', () => '.github/.scala-steward.conf')
    .otherwise(() => '')

  const files: Files = {
    existsSync: () => false,
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const path = input.defaultRepoConf()

  t.is(path, undefined)
})

test('`Input.defaultRepoConf()` throws error if provided non-default file do not exist', t => {
  const inputs = (name: string) => match(name)
    .with('repo-config', () => 'tests/resources/.scala-steward-new.conf')
    .otherwise(() => '')

  const files: Files = {
    existsSync: () => false,
    readFileSync: () => fail('Should not be called'),
  }

  const input = Input.from({getInput: inputs, getBooleanInput: () => false}, files, Logger.noOp)

  const expected = 'Provided default repo conf file (tests/resources/.scala-steward-new.conf) does not exist'

  const error = t.throws(() => input.defaultRepoConf(), {instanceOf: Error})

  t.is(error?.message, expected)
})
