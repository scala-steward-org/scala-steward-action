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
    const user = await github.getAuthUser(token)

    const authorEmail = core.getInput('author-email') || user.email()
    const authorName = core.getInput('author-name') || user.name()

    const githubAppInfo = check.githubAppInfo()

    // Content of the repos.md file either comes from the input file
    // or is empty (replaced by the Github App info) or is a single repo
    const reposList =
      check.reposFile() ??
      (githubAppInfo ? Buffer.from('') : Buffer.from(check.githubRepository()))

    const workspaceDir = await workspace.prepare(reposList, token)

    const cacheTTL = core.getInput('cache-ttl')

    if (cacheTTL !== '0s') {
      await workspace.restoreWorkspaceCache(workspaceDir)
    }

    const version = core.getInput('scala-steward-version')

    const signCommits = /true/i.test(core.getInput('sign-commits'))
    const ignoreOptionsFiles = /true/i.test(core.getInput('ignore-opts-files'))
    const githubApiUrl = core.getInput('github-api-url')
    const scalafixMigrations = core.getInput('scalafix-migrations') ?
      ['--scalafix-migrations', core.getInput('scalafix-migrations')] :
      []
    const artifactMigrations = core.getInput('artifact-migrations') ?
      ['--artifact-migrations', core.getInput('artifact-migrations')] :
      []

    const githubAppArgs = githubAppInfo ?
      ['--github-app-id', githubAppInfo.id, '--github-app-key-file', githubAppInfo.keyFile] :
      []

    await coursier.install('scalafmt')

    await coursier.launch('org.scala-steward', 'scala-steward-core_2.13', version, [
      ['--workspace', `${workspaceDir}/workspace`],
      ['--repos-file', `${workspaceDir}/repos.md`],
      ['--git-ask-pass', `${workspaceDir}/askpass.sh`],
      ['--git-author-email', `${authorEmail}"`],
      ['--git-author-name', `${authorName}"`],
      ['--vcs-login', `${user.login()}"`],
      ['--env-var', '"SBT_OPTS=-Xmx2048m -Xss8m -XX:MaxMetaspaceSize=512m"'],
      ['--process-timeout', '20min'],
      ['--vcs-api-host', githubApiUrl],
      ignoreOptionsFiles ? '--ignore-opts-files' : [],
      signCommits ? '--sign-commits' : [],
      ['--cache-ttl', cacheTTL],
      scalafixMigrations,
      artifactMigrations,
      '--do-not-fork',
      '--disable-sandbox',
      githubAppArgs
    ])

    if (cacheTTL !== '0') {
      await workspace.saveWorkspaceCache(workspaceDir)
    }
  } catch (error: unknown) {
    core.setFailed(` ✕ ${(error as Error).message}`)
  }
}

void run()
