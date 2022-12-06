import * as core from '@actions/core'
import fetch from 'node-fetch'
import * as coursier from '../modules/coursier'
import {HealthCheck} from '../modules/healthcheck'
import {type HttpClient} from '../core/http'
import {type Logger} from '../core/logger'
import * as mill from '../modules/mill'

/**
 * Runs the action pre-requisites code. In order it will do the following:
 * - Check connection with Maven Central
 * - Install Coursier
 * - Install Scalafmt
 * - Install Scalafix
 * - Install Mill
 */
async function run(): Promise<void> {
  try {
    const logger: Logger = core
    const httpClient: HttpClient = {run: async url => fetch(url)}
    const healthCheck: HealthCheck = HealthCheck.from(logger, httpClient)

    await healthCheck.mavenCentral()

    await coursier.selfInstall()
    await coursier.install('scalafmt')
    await coursier.install('scalafix')
    await mill.install()
  } catch (error: unknown) {
    core.setFailed(` ✕ ${(error as Error).message}`)
  }
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void run()
