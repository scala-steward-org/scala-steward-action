import fs from 'fs'
import process from 'process'
import * as core from '@actions/core'
import * as coursier from './coursier'
import {type Files} from './files'
import * as github from './github'
import {Input} from './input'
import {type Logger} from './logger'
import {nonEmpty, NonEmptyString} from './types'
import * as workspace from './workspace'

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
    const files: Files = fs
    const inputs = Input.from(core, files, logger).all()

    const user = await github.getAuthUser(inputs.github.token)

    const workspaceDir = await workspace.prepare(inputs.steward.repos, inputs.github.token, inputs.github.app?.key)
    await workspace.restoreWorkspaceCache(workspaceDir)

    if (process.env.RUNNER_DEBUG) {
      core.debug('Debug mode activated for Scala Steward')
      core.exportVariable('LOG_LEVEL', 'TRACE')
      core.exportVariable('ROOT_LOG_LEVEL', 'TRACE')
    }

    await coursier.launch('scala-steward', inputs.steward.version, [
      arg('--workspace', nonEmpty(`${workspaceDir}/workspace`)),
      arg('--repos-file', nonEmpty(`${workspaceDir}/repos.md`)),
      arg('--git-ask-pass', nonEmpty(`${workspaceDir}/askpass.sh`)),
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
      arg('--github-app-key-file', inputs.github.app ? nonEmpty(`${workspaceDir}/app.pem`) : undefined),
      '--do-not-fork',
      '--disable-sandbox',
      inputs.steward.extraArgs ? inputs.steward.extraArgs.value.split(' ') : [],
    ]).finally(() => {
      workspace.saveWorkspaceCache(workspaceDir).catch((error: unknown) => {
        core.setFailed(` ✕ ${(error as Error).message}`)
      })
    })
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
