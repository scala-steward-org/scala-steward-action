import fs from 'fs'
import os from 'os'
import path from 'path'
import test from 'ava'
import {extractFromYaml, extractFromScript} from './mill'

test('extractFromYaml extracts mill-version from YAML', t => {
  const temporaryDirectory = os.tmpdir()
  const testFile = path.join(temporaryDirectory, 'test-build.mill.yaml')

  fs.writeFileSync(testFile, 'mill-version: 1.0.6\nother: value')
  const version = extractFromYaml(testFile, 'mill-version')
  fs.unlinkSync(testFile)

  t.is(version, '1.0.6')
})

test('extractFromYaml handles comments', t => {
  const temporaryDirectory = os.tmpdir()
  const testFile = path.join(temporaryDirectory, 'test-build2.mill.yaml')

  fs.writeFileSync(testFile, 'mill-version: 1.0.6 # this is a comment')
  const version = extractFromYaml(testFile, 'mill-version')
  fs.unlinkSync(testFile)

  t.is(version, '1.0.6')
})

test('extractFromScript extracts mill-version from build script', t => {
  const temporaryDirectory = os.tmpdir()
  const testFile = path.join(temporaryDirectory, 'test-build.mill')

  fs.writeFileSync(testFile, '// | mill-version = 1.0.0-RC3')
  const version = extractFromScript(testFile, 'mill-version')
  fs.unlinkSync(testFile)

  t.is(version, '1.0.0-RC3')
})

test('extractFromScript handles quoted versions', t => {
  const temporaryDirectory = os.tmpdir()
  const testFile = path.join(temporaryDirectory, 'test-build2.mill')

  fs.writeFileSync(testFile, '// | mill-version = "1.0.6"')
  const version = extractFromScript(testFile, 'mill-version')
  fs.unlinkSync(testFile)

  t.is(version, '1.0.6')
})

test('extractFromScript handles single quotes', t => {
  const temporaryDirectory = os.tmpdir()
  const testFile = path.join(temporaryDirectory, 'test-build3.mill')

  fs.writeFileSync(testFile, '// | mill-version = \'0.11.12\'')
  const version = extractFromScript(testFile, 'mill-version')
  fs.unlinkSync(testFile)

  t.is(version, '0.11.12')
})
