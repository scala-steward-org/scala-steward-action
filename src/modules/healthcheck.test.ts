import test from 'ava'
import {type HttpClient} from '../core/http'
import {Logger} from '../core/logger'
import {HealthCheck} from './healthcheck'

test('`HealthCheck.mavenCentral()` → does not fail if connected to Maven Central', async t => {
  const client: HttpClient = {
    run: async (url: string) => url === 'https://repo1.maven.org/maven2/'
      ? {ok: true, status: 200} : {ok: false, status: 404},
  }

  const healthCheck = HealthCheck.from(Logger.noOp, client)

  await t.notThrowsAsync(async () => healthCheck.mavenCentral())
})

test('`HealthCheck.mavenCentral()` → fails if not connected to Maven Central', async t => {
  const client: HttpClient = {
    run: async () => ({ok: false, status: 404}),
  }

  const healthCheck = HealthCheck.from(Logger.noOp, client)

  const expected = 'Unable to connect to Maven Central'

  await t.throwsAsync(async () => healthCheck.mavenCentral(), {instanceOf: Error, message: expected})
})
