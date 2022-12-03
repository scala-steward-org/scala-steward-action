import fs from 'fs'
import test from 'ava'
import {match} from 'ts-pattern'
import {Input} from '../src/input'
import {Logger} from '../src/logger'

test.serial('`Input.reposFile()` should return undefined on missing input', t => {
  const input = Input.from({getInput: () => ''}, Logger.noOp)

  const file = input.reposFile()
  t.is(file, undefined)
})

test.serial('`Input.reposFile()` should return contents if file exists', t => {
  const inputs = (name: string) => match(name)
    .with('repos-file', () => 'tests/resources/repos.test.md')
    .otherwise(() => '')

  const input = Input.from({getInput: inputs}, Logger.noOp)

  const file = input.reposFile() ?? ''

  const expected = '- owner1/repo1\n- owner1/repo2\n- owner2/repo'

  t.is(file.toString(), expected)
})

test.serial('`Input.reposFile()` should throw error if file doesn\'t exists', t => {
  const inputs = (name: string) => match(name)
    .with('repos-file', () => 'this/does/not/exist.md')
    .otherwise(() => '')

  const input = Input.from({getInput: inputs}, Logger.noOp)

  const expected = 'The path indicated in `repos-file` (this/does/not/exist.md) does not exist'

  const error = t.throws(() => input.reposFile(), {instanceOf: Error})

  t.is(error?.message, expected)
})

test.serial('`Input.githubRepository()` should return repository from input', t => {
  const inputs = (name: string) => match(name)
    .with('github-repository', () => 'owner/repo')
    .otherwise(() => '')

  const input = Input.from({getInput: inputs}, Logger.noOp)

  const content = input.githubRepository()

  const expected = '- owner/repo'

  t.is(content, expected)
})

test.serial('`Input.githubRepository()` should return repository from input with custom branch', t => {
  const inputs = (name: string) => match(name)
    .with('github-repository', () => 'owner/repo')
    .with('branches', () => '0.1.x')
    .otherwise(() => '')

  const input = Input.from({getInput: inputs}, Logger.noOp)

  const content = input.githubRepository()

  const expected = '- owner/repo:0.1.x'

  t.is(content, expected)
})

test.serial('`Input.githubRepository()` should return repository from input with multiple custom branches', t => {
  const inputs = (name: string) => match(name)
    .with('github-repository', () => 'owner/repo')
    .with('branches', () => 'main,0.1.x,0.2.x')
    .otherwise(() => '')

  const input = Input.from({getInput: inputs}, Logger.noOp)

  const content = input.githubRepository()

  const expected = '- owner/repo:main\n- owner/repo:0.1.x\n- owner/repo:0.2.x'

  t.is(content, expected)
})

test.serial('`Input.defaultRepoConf()` should return the path if it exists', t => {
  const inputs = (name: string) => match(name)
    .with('repo-config', () => 'tests/resources/.scala-steward.conf')
    .otherwise(() => '')

  const input = Input.from({getInput: inputs}, Logger.noOp)

  const path = input.defaultRepoConf()

  const expected = 'tests/resources/.scala-steward.conf'

  t.is(path, expected)
})

test.serial('`Input.defaultRepoConf()` should return the default path if it exists', t => {
  const inputs = (name: string) => match(name)
    .with('repo-config', () => '.github/.scala-steward.conf')
    .otherwise(() => '')

  const input = Input.from({getInput: inputs}, Logger.noOp)

  fs.writeFileSync('.github/.scala-steward.conf', '')

  const path = input.defaultRepoConf()

  const expected = '.github/.scala-steward.conf'

  t.is(path, expected)

  fs.rmSync('.github/.scala-steward.conf')
})

test.serial('`Input.defaultRepoConf()` should return undefined if the default path do not exist', t => {
  const inputs = (name: string) => match(name)
    .with('repo-config', () => '.github/.scala-steward.conf')
    .otherwise(() => '')

  const input = Input.from({getInput: inputs}, Logger.noOp)

  const path = input.defaultRepoConf()

  t.is(path, undefined)
})

test.serial('`Input.defaultRepoConf()` throws error if provided non-default file do not exist', t => {
  const inputs = (name: string) => match(name)
    .with('repo-config', () => 'tests/resources/.scala-steward-new.conf')
    .otherwise(() => '')

  const input = Input.from({getInput: inputs}, Logger.noOp)

  const expected = 'Provided default repo conf file (tests/resources/.scala-steward-new.conf) does not exist'

  const error = t.throws(() => input.defaultRepoConf(), {instanceOf: Error})

  t.is(error?.message, expected)
})
