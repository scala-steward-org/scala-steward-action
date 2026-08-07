import {expect, test} from 'vitest'
import {Logger} from '../core/logger.js'
import {HealthCheck, type ConnectivityProbe} from './healthcheck.js'

test('`HealthCheck.check()` → does not fail if probe returns true', async () => {
  const probe: ConnectivityProbe = async () => true

  const healthCheck = HealthCheck.from(Logger.noOp, probe)

  await expect(healthCheck.check()).resolves.not.toThrow()
})

test('`HealthCheck.check()` → fails if probe returns false', async () => {
  const probe: ConnectivityProbe = async () => false

  const healthCheck = HealthCheck.from(Logger.noOp, probe)

  await expect(healthCheck.check()).rejects.toThrow(/Unable to connect to the configured Maven repositories\./v)
})

test('`HealthCheck.check()` → error message mentions COURSIER_REPOSITORIES and COURSIER_CREDENTIALS', async () => {
  const probe: ConnectivityProbe = async () => false

  const healthCheck = HealthCheck.from(Logger.noOp, probe)

  await expect(healthCheck.check()).rejects.toThrow(/COURSIER_REPOSITORIES.*COURSIER_CREDENTIALS/v)
})
