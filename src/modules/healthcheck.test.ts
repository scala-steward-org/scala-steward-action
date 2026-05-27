import test from 'ava'
import * as core from '@actions/core'
import {type HttpClient, type RequestOptions} from '../core/http'
import {Logger} from '../core/logger'
import {HealthCheck, type HealthCheckAuth} from './healthcheck'

test('`HealthCheck.url()` → fails if not connected to health check url', async t => {
  const client: HttpClient = {
    run: async () => ({ok: false, status: 404}),
  }

  const healthCheck = HealthCheck.from(Logger.noOp, client)

  const expected = 'Unable to connect to health check url: https://my-health-check.com'

  await t.throwsAsync(async () => healthCheck.url('https://my-health-check.com'), {instanceOf: Error, message: expected})
})

test('`HealthCheck.url()` → pass if connected to health check url', async t => {
  const customUrl = 'https://my-mirror.example.com/maven2/'
  const client: HttpClient = {
    run: async (url: string) => url === customUrl
      ? {ok: true, status: 200} : {ok: false, status: 404},
  }

  const healthCheck = HealthCheck.from(Logger.noOp, client)

  await t.notThrowsAsync(async () => healthCheck.url(customUrl))
})

test('`HealthCheck.url()` → sends no auth header when no auth is configured', async t => {
  let capturedOptions: RequestOptions | undefined

  const client: HttpClient = {
    async run(_url: string, options?: RequestOptions) {
      capturedOptions = options
      return {ok: true, status: 200}
    },
  }

  const healthCheck = HealthCheck.from(Logger.noOp, client)

  await healthCheck.url('https://example.com')

  t.is(capturedOptions, undefined)
})

test('`HealthCheck.url()` → sends Bearer auth header when auth type is bearer', async t => {
  let capturedOptions: RequestOptions | undefined

  const client: HttpClient = {
    async run(_url: string, options?: RequestOptions) {
      capturedOptions = options
      return {ok: true, status: 200}
    },
  }

  const healthCheck = HealthCheck.from(Logger.noOp, client, {token: 'my-secret-token', type: 'bearer'})

  await healthCheck.url('https://example.com')

  t.deepEqual(capturedOptions, {headers: {Authorization: 'Bearer my-secret-token'}})
})

test('`HealthCheck.url()` → sends Basic auth header when auth type is basic', async t => {
  let capturedOptions: RequestOptions | undefined

  const client: HttpClient = {
    async run(_url: string, options?: RequestOptions) {
      capturedOptions = options
      return {ok: true, status: 200}
    },
  }

  const healthCheck = HealthCheck.from(Logger.noOp, client, {token: 'dXNlcjpwYXNz', type: 'basic'})

  await healthCheck.url('https://example.com')

  t.deepEqual(capturedOptions, {headers: {Authorization: 'Basic dXNlcjpwYXNz'}})
})

test('`HealthCheck.url()` → uses default Maven Central URL without auth when no custom healthcheck is supplied', async t => {
  const defaultUrl = 'https://repo1.maven.org/maven2/'
  let capturedUrl: string | undefined
  let capturedOptions: RequestOptions | undefined

  const client: HttpClient = {
    async run(url: string, options?: RequestOptions) {
      capturedUrl = url
      capturedOptions = options
      return {ok: true, status: 200}
    },
  }

  const healthCheck = HealthCheck.from(Logger.noOp, client)

  await healthCheck.url(defaultUrl)

  t.is(capturedUrl, defaultUrl)
  t.is(capturedOptions, undefined)
})

test('`HealthCheck.url()` → fails with auth when server returns non-ok', async t => {
  const client: HttpClient = {
    run: async () => ({ok: false, status: 401}),
  }

  const healthCheck = HealthCheck.from(Logger.noOp, client, {token: 'bad-token', type: 'bearer'})

  const expected = 'Unable to connect to health check url: https://private-mirror.com'

  await t.throwsAsync(async () => healthCheck.url('https://private-mirror.com'), {instanceOf: Error, message: expected})
})
