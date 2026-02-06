import {existsSync} from 'fs'
import test from 'ava'
import {getBundledMillPath} from './mill'

test('`getBundledMillPath()` → returns path where mill binary exists', t => {
  const millPath = getBundledMillPath()
  t.true(existsSync(millPath))
})
