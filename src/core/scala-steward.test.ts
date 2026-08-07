import {expect, test} from 'vitest'
import {scalaVersion} from './scala-steward.js'

test('`scalaVersion` → returns `2.13` for versions older than 0.33.0', () => {
  expect(scalaVersion('0.30.2')).toBe('2.13')
  expect(scalaVersion('0.32.9')).toBe('2.13')
  expect(scalaVersion('0.32.0')).toBe('2.13')
  expect(scalaVersion('0.1.0')).toBe('2.13')
})

test('`scalaVersion` → returns `3` for version 0.33.0', () => {
  expect(scalaVersion('0.33.0')).toBe('3')
})

test('`scalaVersion` → returns `3` for versions newer than 0.33.0', () => {
  expect(scalaVersion('0.33.1')).toBe('3')
  expect(scalaVersion('0.34.0')).toBe('3')
  expect(scalaVersion('0.37.0')).toBe('3')
})

test('`scalaVersion` → returns `3` for major versions greater than 0', () => {
  expect(scalaVersion('1.0.0')).toBe('3')
  expect(scalaVersion('2.0.0')).toBe('3')
})
