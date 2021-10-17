import * as check from '../src/check'
import test from 'ava'

test.beforeEach(() => {
  process.env['INPUT_REPOS-FILE'] = ''
  process.env.GITHUB_REPOSITORY = ''
  process.env.INPUT_BRANCHES = ''
  process.env['INPUT_GITHUB-REPOSITORY'] = ''
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
