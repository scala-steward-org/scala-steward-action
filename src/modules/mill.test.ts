import {existsSync} from 'node:fs'
import {expect, test} from 'vitest'
import {getBundledMillPath} from './mill.js'

test('`getBundledMillPath()` → returns path where mill binary exists', () => {
  const millPath = getBundledMillPath()
  expect(existsSync(millPath)).toBe(true)
})
