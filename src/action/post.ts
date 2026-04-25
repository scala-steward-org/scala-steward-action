import fs from 'node:fs'
import os from 'node:os'
import * as core from '@actions/core'
import * as io from '@actions/io'
import * as cache from '@actions/cache'
import * as coursier from '../modules/coursier.js'
import * as mill from '../modules/mill.js'
import {type Logger} from '../core/logger.js'
import {Workspace} from '../modules/workspace.js'
import {type Files} from '../core/files.js'

/**
 * Performs a cleanup of all the artifacts/folders created by this action.
 */
async function run(): Promise<void> {
  try {
    const logger: Logger = core
    const files: Files = {...fs, ...io}
    const workspace = Workspace.from(logger, files, os, cache)

    await workspace.remove()
    core.info('🗑 Scala Steward\'s workspace removed')

    await coursier.remove()
    core.info('🗑 Coursier binary removed')

    await mill.remove()
    core.info('🗑 Mill binary removed')
  } catch (error: unknown) {
    core.warning(error instanceof Error ? error.message : String(error))
  }
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void run()
