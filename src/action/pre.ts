import * as core from '@actions/core'
import fetch from 'node-fetch'
import * as coursier from '../modules/coursier'
import {HealthCheck} from '../modules/healthcheck'
import * as mill from '../modules/mill'

/**
 * Runs the action pre-requisites code. In order it will do the following:
 *
 * - Check connection with Maven Central
 * - Restore caches
 * - Install required tools
 */
async function run(): Promise<void> {
  try {
    const healthCheck: HealthCheck = HealthCheck.from(core, {run: async url => fetch(url)})
    await healthCheck.mavenCentral()

    await coursier.restoreCache()
    await coursier.install()
    await mill.install()
  } catch (error: unknown) {
    core.setFailed(` ✕ ${(error as Error).message}`)
  }
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void run()
