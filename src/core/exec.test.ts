import {Buffer} from 'node:buffer'
import * as exec from '@actions/exec'
import {beforeEach, expect, test, vi} from 'vitest'
import {execute} from './exec.js'

vi.mock('@actions/exec')
vi.mock('@actions/core')

beforeEach(() => {
  vi.resetAllMocks()
})

test('`execute()` → returns everything the tool wrote to stdout', async () => {
  vi.mocked(exec.exec).mockImplementation(async (_tool, _arguments, options) => {
    options?.listeners?.stdout?.(Buffer.from('2.7.5'))
    return 0
  })

  const output = await execute('cs', 'version')

  expect(output).toBe('2.7.5')
})

test('`execute()` → joins stdout written across several chunks', async () => {
  vi.mocked(exec.exec).mockImplementation(async (_tool, _arguments, options) => {
    options?.listeners?.stdout?.(Buffer.from('scalafmt '))
    options?.listeners?.stdout?.(Buffer.from('3.8.3'))
    return 0
  })

  const output = await execute('cs', 'launch', 'scalafmt', '--', '--version')

  expect(output).toBe('scalafmt 3.8.3')
})

test('`execute()` → returns an empty string when the tool writes nothing', async () => {
  vi.mocked(exec.exec).mockResolvedValue(0)

  const output = await execute('cs', 'version')

  expect(output).toBe('')
})

test('`execute()` → passes the tool and its arguments through', async () => {
  vi.mocked(exec.exec).mockResolvedValue(0)

  await execute('cs', 'launch', 'scalafmt', '--', '--version')

  expect(vi.mocked(exec.exec).mock.calls[0]?.[0]).toBe('cs')
  expect(vi.mocked(exec.exec).mock.calls[0]?.[1]).toStrictEqual(['launch', 'scalafmt', '--', '--version'])
})

test('`execute()` → reads the exit code itself instead of letting the tool throw', async () => {
  vi.mocked(exec.exec).mockResolvedValue(0)

  await execute('cs', 'version')

  const options = vi.mocked(exec.exec).mock.calls[0]?.[2]

  expect(options?.silent).toBe(true)
  expect(options?.ignoreReturnCode).toBe(true)
})

test('`execute()` → throws naming the failed command when the exit code is not zero', async () => {
  vi.mocked(exec.exec).mockResolvedValue(1)

  const expected = "There was an error while executing 'cs launch scalafmt -- --version'"

  await expect(execute('cs', 'launch', 'scalafmt', '--', '--version')).rejects.toThrow(new Error(expected))
})

test('`execute()` → names the tool alone when it was called without arguments', async () => {
  vi.mocked(exec.exec).mockResolvedValue(127)

  await expect(execute('cs')).rejects.toThrow(new Error("There was an error while executing 'cs '"))
})

test('`execute()` → discards the output collected before a failure', async () => {
  vi.mocked(exec.exec).mockImplementation(async (_tool, _arguments, options) => {
    options?.listeners?.stdout?.(Buffer.from('partial output'))
    return 1
  })

  await expect(execute('cs', 'version')).rejects.toThrow(/There was an error/v)
})
