import test from 'ava'
import {scalaVersion} from './scala-steward'

test('`scalaVersion` → returns `2.13` for versions older than 0.33.0', t => {
  t.is(scalaVersion('0.30.2'), '2.13')
  t.is(scalaVersion('0.32.9'), '2.13')
  t.is(scalaVersion('0.32.0'), '2.13')
  t.is(scalaVersion('0.1.0'), '2.13')
})

test('`scalaVersion` → returns `3` for version 0.33.0', t => {
  t.is(scalaVersion('0.33.0'), '3')
})

test('`scalaVersion` → returns `3` for versions newer than 0.33.0', t => {
  t.is(scalaVersion('0.33.1'), '3')
  t.is(scalaVersion('0.34.0'), '3')
  t.is(scalaVersion('0.37.0'), '3')
})

test('`scalaVersion` → returns `3` for major versions greater than 0', t => {
  t.is(scalaVersion('1.0.0'), '3')
  t.is(scalaVersion('2.0.0'), '3')
})
