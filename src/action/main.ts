import fs from 'fs'
import os from 'os'
import process from 'process'
import * as cache from '@actions/cache'
import * as core from '@actions/core'
import {getOctokit} from '@actions/github'
import * as io from '@actions/io'
import * as coursier from '../modules/coursier'
import {type Files} from '../core/files'
import {GitHub} from '../modules/github'
import {Input} from '../modules/input'
import {type Logger} from '../core/logger'
import {nonEmpty, NonEmptyString} from '../core/types'
import {Workspace} from '../modules/workspace'

/**
 * Runs the action main code. In order it will do the following:
 * - Recover user inputs
 * - Get authenticated user data from provided Github Token
 * - Prepare Scala Steward's workspace
 * - Run Scala Steward using Coursier.
 */
async function run(): Promise<void> {
  try {
    const logger: Logger = core
    const files: Files = {...fs, ...io}
    const inputs = Input.from(core, files, logger).all()
    const octokit = getOctokit(inputs.github.token.value, {baseUrl: inputs.github.apiUrl.value})
    const github = GitHub.from(logger, octokit)
    const workspace = Workspace.from(logger, files, os, cache)

    const user = await github.getAuthUser()

    await workspace.prepare(inputs.steward.repos, inputs.github.token, inputs.github.app?.key)
    await workspace.restoreWorkspaceCache()

    if (process.env.RUNNER_DEBUG) {
      core.debug('🐛 Debug mode activated for Scala Steward')
      core.exportVariable('LOG_LEVEL', 'TRACE')
      core.exportVariable('ROOT_LOG_LEVEL', 'TRACE')
    }

    await coursier.launch('scala-steward', inputs.steward.version, [
      arg('--workspace', workspace.workspace),
      arg('--repos-file', workspace.repos_md),
      arg('--git-ask-pass', workspace.askpass_sh),
      arg('--git-author-email', inputs.commits.author.email ?? user.email()),
      arg('--git-author-name', inputs.commits.author.name ?? user.name()),
      arg('--vcs-login', user.login()),
      arg('--env-var', nonEmpty('"SBT_OPTS=-Xmx2048m -Xss8m -XX:MaxMetaspaceSize=512m"')),
      arg('--process-timeout', inputs.steward.timeout),
      arg('--vcs-api-host', inputs.github.apiUrl),
      arg('--ignore-opts-files', inputs.steward.ignoreOptsFiles),
      arg('--sign-commits', inputs.commits.sign.enabled),
      arg('--git-author-signing-key', inputs.commits.sign.key),
      arg('--cache-ttl', inputs.steward.cacheTtl),
      arg('--scalafix-migrations', inputs.migrations.scalafix),
      arg('--artifact-migrations', inputs.migrations.artifacts),
      arg('--repo-config', inputs.steward.defaultConfiguration),
      arg('--github-app-id', inputs.github.app?.id),
      arg('--github-app-key-file', inputs.github.app ? workspace.app_pem : undefined),
      '--do-not-fork',
      '--disable-sandbox',
      inputs.steward.extraArgs?.value.split(' ') ?? [],
    ])

    await workspace.saveWorkspaceCache()
  } catch (error: unknown) {
    core.setFailed(` ✕ ${(error as Error).message}`)
  }
}

/**
 * Creates an optional argument depending on an input's value.
 *
 * @param name Name of the arg being added.
 * @param value The argument's value, empty string, false booleans or undefined will be skipped.
 * @returns the argument to add if it should be added; otherwise returns `[]`.
 */
function arg(name: string, value: NonEmptyString | boolean | undefined) {
  if (value instanceof NonEmptyString) {
    return [name, value.value]
  }

  if (value === undefined) {
    return []
  }

  return value ? [name] : []
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void run()