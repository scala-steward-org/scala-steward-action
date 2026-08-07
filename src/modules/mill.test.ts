import {existsSync, readFileSync} from 'node:fs'
import {expect, test} from 'vitest'
import {getBundledMillPath, withMavenRepository} from './mill.js'

test('`getBundledMillPath()` → returns path where mill binary exists', () => {
  const millPath = getBundledMillPath()
  expect(existsSync(millPath)).toBe(true)
})

test('`withMavenRepository()` → replaces the Maven Central URL in the embedded wrapper', () => {
  const wrapper = readFileSync(getBundledMillPath(), 'utf8')

  const rewritten = withMavenRepository(wrapper, 'https://nexus.example.com/maven-public/')

  expect(wrapper).toContain('https://repo1.maven.org/maven2')
  expect(rewritten).not.toContain('https://repo1.maven.org/maven2')
  expect(rewritten).toContain('https://nexus.example.com/maven-public/com/lihaoyi/mill-dist')
})

test('`withMavenRepository()` → keeps the wrapper unchanged for Maven Central', () => {
  const wrapper = readFileSync(getBundledMillPath(), 'utf8')

  expect(withMavenRepository(wrapper, 'https://repo1.maven.org/maven2')).toBe(wrapper)
})
