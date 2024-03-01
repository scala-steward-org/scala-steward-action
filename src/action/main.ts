import fs from 'fs'
import os from 'os'
import process from 'process'
import * as cache from '@actions/cache'
import * as core from '@actions/core'
import {getOctokit} from '@actions/github'
import * as io from '@actions/io'
import {createAppAuth} from '@octokit/auth-app'
import {request} from '@octokit/request'
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
    const gitHubApiUrl = inputs.github.apiUrl.value
    const gitHubToken = await gitHubAppToken(inputs.github.app, gitHubApiUrl, 'installation') ?? inputs.github.token.value
    const octokit = getOctokit(gitHubToken, {baseUrl: gitHubApiUrl})
    const github = GitHub.from(logger, octokit)
    const workspace = Workspace.from(logger, files, os, cache)

    const user = await gitHubAppToken(inputs.github.app, gitHubApiUrl, 'app')
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

    const app = inputs.steward.version
      ? `org.scala-steward:scala-steward-core_2.13:${inputs.steward.version.value}`
      : 'scala-steward'

    await coursier.launch(app, [
      argument('--workspace', workspace.workspace),
      argument('--repos-file', workspace.repos_md),
      argument('--git-ask-pass', workspace.askpass_sh),
      argument('--git-author-email', inputs.commits.author.email ?? user.email()),
      argument('--git-author-name', inputs.commits.author.name ?? user.name()),
      argument('--forge-login', user.login()),
      argument('--env-var', nonEmpty('"SBT_OPTS=-Xmx2048m -Xss8m -XX:MaxMetaspaceSize=512m"')),
      argument('--process-timeout', inputs.steward.timeout),
      argument('--forge-api-host', inputs.github.apiUrl),
      argument('--ignore-opts-files', inputs.steward.ignoreOptsFiles),
      argument('--sign-commits', inputs.commits.sign.enabled),
      argument('--git-author-signing-key', inputs.commits.sign.key),
      argument('--cache-ttl', inputs.steward.cacheTtl),
      argument('--max-buffer-size', inputs.steward.maxBufferSize),
      argument('--scalafix-migrations', inputs.migrations.scalafix),
      argument('--artifact-migrations', inputs.migrations.artifacts),
      argument('--repo-config', inputs.steward.defaultConfiguration),
      argument('--github-app-id', inputs.github.app && !inputs.github.app.authOnly ? inputs.github.app.id : undefined),
      argument('--github-app-key-file', inputs.github.app && !inputs.github.app.authOnly ? workspace.app_pem : undefined),
      '--do-not-fork',
      '--disable-sandbox',
      inputs.steward.extraArgs?.value.split(' ') ?? [],
    ], inputs.steward.extraJars)

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
 * @param gitHubApiUrl The GitHub API URL.
 * @param type The type of token to retrieve, either `app` or `installation`.
 * @returns the GitHub App Token for the provided installation.
 */
async function gitHubAppToken(app: GitHubAppInfo | undefined, gitHubApiUrl: string, type: 'app' | 'installation') {
  if (!app) {
    return undefined
  }

  const auth = createAppAuth({
    appId: app.id.value,
    privateKey: app.key.value,
    request: request.defaults({
      baseUrl: gitHubApiUrl,
    }),
  })

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
function argument(name: string, value: NonEmptyString | boolean | undefined) {
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
