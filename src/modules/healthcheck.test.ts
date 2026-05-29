import test from 'ava'
import {Logger} from '../core/logger.js'
import {HealthCheck, type ConnectivityProbe} from './healthcheck.js'

test('`HealthCheck.check()` → does not fail if probe returns true', async t => {
  const probe: ConnectivityProbe = async () => true

  const healthCheck = HealthCheck.from(Logger.noOp, probe)

  await t.notThrowsAsync(async () => healthCheck.check())
})

test('`HealthCheck.check()` → fails if probe returns false', async t => {
  const probe: ConnectivityProbe = async () => false

  const healthCheck = HealthCheck.from(Logger.noOp, probe)

  await t.throwsAsync(async () => healthCheck.check(), {
    instanceOf: Error,
    message: /Unable to connect to the configured Maven repositories\./v,
  })
})

test('`HealthCheck.check()` → error message mentions COURSIER_REPOSITORIES and COURSIER_CREDENTIALS', async t => {
  const probe: ConnectivityProbe = async () => false

  const healthCheck = HealthCheck.from(Logger.noOp, probe)

  await t.throwsAsync(async () => healthCheck.check(), {
    message: /COURSIER_REPOSITORIES.*COURSIER_CREDENTIALS/v,
  })
})
