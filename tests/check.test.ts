import fs from 'fs'
import test from 'ava'
import * as check from '../src/check'

test.beforeEach(() => {
  process.env['INPUT_REPOS-FILE'] = ''
  process.env.GITHUB_REPOSITORY = ''
  process.env.INPUT_BRANCHES = ''
  process.env['INPUT_GITHUB-REPOSITORY'] = ''
  process.env['INPUT_REPO-CONFIG'] = ''
})

test.serial('`check.reposFile()` should return undefined on missing input', t => {
  const file = check.reposFile()
  t.is(file, undefined)
})

test.serial('`check.reposFile()` should return undefined on empty input', t => {
  process.env['INPUT_REPOS-FILE'] = ''
  const file = check.reposFile()
  t.is(file, undefined)
})

test.serial('`check.reposFile()` should return contents if file exists', t => {
  process.env['INPUT_REPOS-FILE'] = 'tests/resources/repos.test.md'
  const file = check.reposFile() ?? ''

  const expected = '- owner1/repo1\n- owner1/repo2\n- owner2/repo'

  t.is(file.toString(), expected)
})

test.serial('`check.reposFile()` should throw error if file doesn\'t exists', t => {
  process.env['INPUT_REPOS-FILE'] = 'this/does/not/exist.md'

  const expected = 'The path indicated in `repos-file` (this/does/not/exist.md) does not exist'

  const error = t.throws(() => check.reposFile(), {instanceOf: Error})

  t.is(error.message, expected)
})

test.serial('`check.githubRepository()` should return current repository if input not present', t => {
  process.env.GITHUB_REPOSITORY = 'owner/repo'

  const content = check.githubRepository()

  const expected = '- owner/repo'

  t.is(content, expected)
})

test.serial('`check.githubRepository()` should return current repository if input not present with custom branch', t => {
  process.env.GITHUB_REPOSITORY = 'owner/repo'
  process.env.INPUT_BRANCHES = '0.1.x'

  const content = check.githubRepository()

  const expected = '- owner/repo:0.1.x'

  t.is(content, expected)
})

test.serial('`check.githubRepository()` should return current repository if input not present with multiple custom branches', t => {
  process.env.GITHUB_REPOSITORY = 'owner/repo'
  process.env.INPUT_BRANCHES = 'main,0.1.x,0.2.x'

  const content = check.githubRepository()

  const expected = '- owner/repo:main\n- owner/repo:0.1.x\n- owner/repo:0.2.x'

  t.is(content, expected)
})

test.serial('`check.githubRepository()` should return repository from input', t => {
  process.env['INPUT_GITHUB-REPOSITORY'] = 'owner/repo'

  const content = check.githubRepository()

  const expected = '- owner/repo'

  t.is(content, expected)
})

test.serial('`check.githubRepository()` should return repository from input with custom branch', t => {
  process.env['INPUT_GITHUB-REPOSITORY'] = 'owner/repo'
  process.env.INPUT_BRANCHES = '0.1.x'

  const content = check.githubRepository()

  const expected = '- owner/repo:0.1.x'

  t.is(content, expected)
})

test.serial('`check.githubRepository()` should return repository from input with multiple custom branches', t => {
  process.env['INPUT_GITHUB-REPOSITORY'] = 'owner/repo'
  process.env.INPUT_BRANCHES = 'main,0.1.x,0.2.x'

  const content = check.githubRepository()

  const expected = '- owner/repo:main\n- owner/repo:0.1.x\n- owner/repo:0.2.x'

  t.is(content, expected)
})

test.serial('`check.defaultRepoConf()` should return the path if it exists', t => {
  process.env['INPUT_REPO-CONFIG'] = 'tests/resources/.scala-steward.conf'

  const path = check.defaultRepoConf()

  const expected = 'tests/resources/.scala-steward.conf'

  t.is(path, expected)
})

test.serial('`check.defaultRepoConf()` should return the default path if it exists', t => {
  fs.writeFileSync('.github/.scala-steward.conf', '')
  process.env['INPUT_REPO-CONFIG'] = '.github/.scala-steward.conf'

  const path = check.defaultRepoConf()

  const expected = '.github/.scala-steward.conf'

  t.is(path, expected)

  fs.rmSync('.github/.scala-steward.conf')
})

test.serial('`check.defaultRepoConf()` should return undefined if the default path do not exist', t => {
  process.env['INPUT_REPO-CONFIG'] = '.github/.scala-steward.conf'

  const path = check.defaultRepoConf()

  t.is(path, undefined)
})

test.serial('`check.defaultRepoConf()` throws error if provided non-default file do not exist', t => {
  process.env['INPUT_REPO-CONFIG'] = 'tests/resources/.scala-steward-new.conf'

  const expected = 'Provided default repo conf file (tests/resources/.scala-steward-new.conf) does not exist'

  const error = t.throws(() => check.defaultRepoConf(), {instanceOf: Error})

  t.is(error.message, expected)
})
