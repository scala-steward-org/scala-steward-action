import fs from 'fs'
import os from 'os'
import process from 'process'
import * as cache from '@actions/cache'
import * as core from '@actions/core'
import {getOctokit} from '@actions/github'
import * as io from '@actions/io'
import {createAppAuth} from '@octokit/auth-app'
import {type Files} from '../core/files'
import {type Logger} from '../core/logger'
import {nonEmpty, NonEmptyString} from '../core/types'
import * as coursier from '../modules/coursier'
import {GitHub} from '../modules/github'
import {Input, type GitHubAppInfo} from '../modules/input'
import {Workspace} from '../modules/workspace'

/**
 * Runs the action main code. In order it will do the following:
 * - Recover user inputs
 * - Get authenticated user data from provided GitHub Token
 * - Prepare Scala Steward's workspace
 * - Run Scala Steward using Coursier.
 */
async function run(): Promise<void> {
  try {
    const logger: Logger = core
    const files: Files = {...fs, ...io}
    const inputs = Input.from(core, files, logger).all()
    const gitHubToken = await gitHubAppToken(inputs.github.app, 'installation') ?? inputs.github.token.value
    const gitHubApiUrl = inputs.github.apiUrl.value
    const octokit = getOctokit(gitHubToken, {baseUrl: gitHubApiUrl})
    const github = GitHub.from(logger, octokit)
    const workspace = Workspace.from(logger, files, os, cache)

    const user = await gitHubAppToken(inputs.github.app, 'app')
      .then(appToken => appToken ? getOctokit(appToken, {baseUrl: gitHubApiUrl}) : undefined)
      .then(async octokit => octokit ? octokit.rest.apps.getAuthenticated() : undefined)
      .then(async response => response ? github.getAppUser(response.data.slug) : github.getAuthUser())

    await workspace.prepare(inputs.steward.repos, gitHubToken, inputs.github.app)
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
      arg('--github-app-id', inputs.github.app && !inputs.github.app.authOnly ? inputs.github.app.id : undefined),
      arg('--github-app-key-file', inputs.github.app && !inputs.github.app.authOnly ? workspace.app_pem : undefined),
      '--do-not-fork',
      '--disable-sandbox',
      inputs.steward.extraArgs?.value.split(' ') ?? [],
    ])

    if (files.existsSync(workspace.runSummary_md)) {
      logger.info(`✓ Run Summary file: ${workspace.runSummary_md}`)

      const summaryMarkdown = files.readFileSync(workspace.runSummary_md, 'utf8')
      await core.summary.addRaw(summaryMarkdown).write()
    }

    await workspace.saveWorkspaceCache()
  } catch (error: unknown) {
    core.setFailed(` ✕ ${(error as Error).message}`)
  }
}

/**
 * Returns a GitHub App Token.
 *
 * @param app The GitHub App information.
 * @param type The type of token to retrieve, either `app` or `installation`.
 * @returns the GitHub App Token for the provided installation.
 */
async function gitHubAppToken(app: GitHubAppInfo | undefined, type: 'app' | 'installation') {
  if (!app) {
    return undefined
  }

  const auth = createAppAuth({appId: app.id.value, privateKey: app.key.value})

  const response = type === 'app'
    ? await auth({type: 'app'})
    : (app.installation ? await auth({type: 'installation', installationId: app.installation.value}) : undefined)

  return response?.token
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
