import process from 'process'
import * as core from '@actions/core'
import fetch from 'node-fetch'
import * as github from './github'
import {HealthCheck} from './healthcheck'
import * as workspace from './workspace'
import * as coursier from './coursier'
import {type Logger} from './logger'
import {Input} from './input'
import {type HttpClient} from './http'
import * as mill from './mill'

/**
 * Runs the action main code. In order it will do the following:
 * - Check connection with Maven Central
 * - Install Coursier
 * - Recover user inputs
 * - Get authenticated user data from provided Github Token
 * - Prepare Scala Steward's workspace
 * - Run Scala Steward using Coursier.
 */
async function run(): Promise<void> {
  try {
    const logger: Logger = core
    const httpClient: HttpClient = {run: async url => fetch(url)}
    const inputs = Input.from(core, logger).all()
    const healthCheck: HealthCheck = HealthCheck.from(logger, httpClient)

    await healthCheck.mavenCentral()

    await coursier.selfInstall()
    await coursier.install('scalafmt')
    await coursier.install('scalafix')
    await mill.install()

    const user = await github.getAuthUser(inputs.github.token)

    const workspaceDir = await workspace.prepare(inputs.steward.repos, inputs.github.token)

    await workspace.restoreWorkspaceCache(workspaceDir)

    if (process.env.RUNNER_DEBUG) {
      core.debug('Debug mode activated for Scala Steward')
      core.exportVariable('LOG_LEVEL', 'TRACE')
      core.exportVariable('ROOT_LOG_LEVEL', 'TRACE')
    }

    await coursier.launch('scala-steward', inputs.steward.version, [
      ['--workspace', `${workspaceDir}/workspace`],
      ['--repos-file', `${workspaceDir}/repos.md`],
      ['--git-ask-pass', `${workspaceDir}/askpass.sh`],
      ['--git-author-email', inputs.commits.author.email || user.email()],
      ['--git-author-name', inputs.commits.author.name || user.name()],
      ['--vcs-login', `${user.login()}"`],
      ['--env-var', '"SBT_OPTS=-Xmx2048m -Xss8m -XX:MaxMetaspaceSize=512m"'],
      ['--process-timeout', inputs.steward.timeout],
      ['--vcs-api-host', inputs.github.apiUrl],
      inputs.steward.ignoreOptsFiles ? '--ignore-opts-files' : [],
      inputs.commits.sign.enabled ? '--sign-commits' : [],
      inputs.commits.sign.key ? ['--git-author-signing-key', inputs.commits.sign.key] : [],
      ['--cache-ttl', inputs.steward.cacheTtl],
      inputs.migrations.scalafix ? ['--scalafix-migrations', inputs.migrations.scalafix] : [],
      inputs.migrations.artifacts ? ['--artifact-migrations', inputs.migrations.artifacts] : [],
      inputs.steward.defaultConfiguration ? ['--repo-config', inputs.steward.defaultConfiguration] : [],
      '--do-not-fork',
      '--disable-sandbox',
      inputs.github.app ? ['--github-app-id', inputs.github.app.id, '--github-app-key-file', inputs.github.app.keyFile] : [],
      inputs.steward.extraArgs ? inputs.steward.extraArgs.split(' ') : [],
    ]).finally(() => {
      workspace.saveWorkspaceCache(workspaceDir).catch((error: unknown) => {
        core.setFailed(` ✕ ${(error as Error).message}`)
      })
    })
  } catch (error: unknown) {
    core.setFailed(` ✕ ${(error as Error).message}`)
  }
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void run()
