import test from 'ava'
import {type HttpClient} from '../core/http'
import {Logger} from '../core/logger'
import {HealthCheck} from './healthcheck'

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
