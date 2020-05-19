import * as check from '../src/check'

afterEach(() => {
  delete process.env['INPUT_REPOS-FILE']
})

describe('check.reposFile', () => {
  it('should return undefined on missing input', () => {
    const file = check.reposFile()
    expect(file).toBeUndefined()
  })
  it('should return undefined on empty input', () => {
    process.env['INPUT_REPOS-FILE'] = ''
    const file = check.reposFile()
    expect(file).toBeUndefined()
  })
  it('should return contents if file exists', () => {
    process.env['INPUT_REPOS-FILE'] = '__tests__/resources/repos.test.md'
    const file = check.reposFile() as Buffer

    const expected = '- owner1/repo1\n- owner1/repo2\n- owner2/repo'

    expect(file.toString()).toBe(expected)
  })
  it("should throw error if file doesn't exists", () => {
    process.env['INPUT_REPOS-FILE'] = 'this/does/not/exist.md'

    let expected = 'The path indicated in `repos-file` (this/does/not/exist.md) does not exist'

    expect(() => check.reposFile()).toThrow(expected)
  })
})
