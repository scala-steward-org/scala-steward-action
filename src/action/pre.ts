import fs from 'fs'
import os from 'os'
import * as cache from '@actions/cache'
import * as core from '@actions/core'
import * as io from '@actions/io'
import fetch from 'node-fetch'
import * as coursier from '../modules/coursier'
import {HealthCheck} from '../modules/healthcheck'
import * as mill from '../modules/mill'
import {Workspace} from '../modules/workspace'

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
    const workspace = Workspace.from(core, {...fs, ...io}, os, cache)

    await healthCheck.mavenCentral()

    await workspace.restoreWorkspaceCache()
    await coursier.restoreCache(workspace.reposHash())

    await coursier.install()
    await mill.install()
  } catch (error: unknown) {
    core.setFailed(` ✕ ${(error as Error).message}`)
  }
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void run()
