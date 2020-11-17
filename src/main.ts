import * as core from '@actions/core'
import * as github from './github'
import * as check from './check'
import * as workspace from './workspace'
import * as coursier from './coursier'

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
    await check.mavenCentral()
    await coursier.selfInstall()
    const token = check.githubToken()
    const repo = check.reposFile() || check.githubRepository()
    const user = await github.getAuthUser(token)

    const authorEmail = core.getInput('author-email') || user.email()
    const authorName = core.getInput('author-name') || user.name()

    const workspaceDir = await workspace.prepare(repo, token)
    await workspace.restoreWorkspaceCache(workspaceDir)

    const version = core.getInput('scala-steward-version')

    const signCommits = /true/i.test(core.getInput('sign-commits'))
    const ignoreOptsFiles = /true/i.test(core.getInput('ignore-opts-files'))
    const cacheTTL = core.getInput('cache-ttl')
    const githubApiUrl = core.getInput('github-api-url')

    await coursier.launch('org.scala-steward', 'scala-steward-core_2.13', version, [
      ['--workspace', `${workspaceDir}/workspace`],
      ['--repos-file', `${workspaceDir}/repos.md`],
      ['--git-ask-pass', `${workspaceDir}/askpass.sh`],
      ['--git-author-email', `${authorEmail}"`],
      ['--git-author-name', `${authorName}"`],
      ['--vcs-login', `${user.login}"`],
      ['--env-var', '"SBT_OPTS=-Xmx2048m -Xss8m -XX:MaxMetaspaceSize=512m"'],
      ['--process-timeout', '20min'],
      ['--vcs-api-host', githubApiUrl],
      ignoreOptsFiles ? '--ignore-opts-files' : [],
      signCommits ? '--sign-commits' : [],
      ['--cache-ttl', cacheTTL],
      '--do-not-fork',
      '--disable-sandbox'
    ])

    await workspace.saveWorkspaceCache(workspaceDir)
  } catch (error) {
    core.setFailed(` ✕ ${error.message}`)
  }
}

run()
