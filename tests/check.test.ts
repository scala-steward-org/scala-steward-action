import * as check from '../src/check'
import test from 'ava'

test.afterEach(() => {
  delete process.env['INPUT_REPOS-FILE']
})

test('`check.reposFile()` should return undefined on missing input', t => {
  const file = check.reposFile()
  t.is(file, undefined)
})

test('`check.reposFile()` should return undefined on empty input', t => {
  process.env['INPUT_REPOS-FILE'] = ''
  const file = check.reposFile()
  t.is(file, undefined)
})

test('`check.reposFile()` should return contents if file exists', t => {
  process.env['INPUT_REPOS-FILE'] = 'tests/resources/repos.test.md'
  const file = check.reposFile() ?? ''

  const expected = '- owner1/repo1\n- owner1/repo2\n- owner2/repo'

  t.is(file.toString(), expected)
})

test('`check.reposFile()` should throw error if file doesn\'t exists', t => {
  process.env['INPUT_REPOS-FILE'] = 'this/does/not/exist.md'

  const expected = 'The path indicated in `repos-file` (this/does/not/exist.md) does not exist'

  const error = t.throws(() => check.reposFile(), {instanceOf: Error})

  t.is(error.message, expected)
})
