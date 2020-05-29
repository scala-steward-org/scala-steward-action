import * as core from '@actions/core'
import * as github from './github'
import * as check from './check'
import * as files from './files'
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
    await coursier.install()
    const token = check.githubToken()
    const repo = check.reposFile() || check.githubRepository()
    const user = await github.getAuthUser(token)
    const workspace = await files.prepareScalaStewardWorkspace(repo, token)

    const authorEmail = core.getInput('author-email') ?? user.email
    const authorName = core.getInput('author-name') ?? user.name
    const version = core.getInput('scala-steward-version')

    const signCommits = /true/i.test(core.getInput('sign-commits'))
    const ignoreOptsFiles = /true/i.test(core.getInput('ignore-opts-files'))

    await coursier.launch('org.scala-steward', 'scala-steward-core_2.13', version, [
      ['--workspace', `${workspace}/workspace`],
      ['--repos-file', `${workspace}/repos.md`],
      ['--git-ask-pass', `${workspace}/askpass.sh`],
      ['--git-author-email', `${authorEmail}"`],
      ['--git-author-name', `${authorName}"`],
      ['--vcs-login', `${user.login}"`],
      ['--env-var', '"SBT_OPTS=-Xmx2048m -Xss8m -XX:MaxMetaspaceSize=512m"'],
      ['--process-timeout', '20min'],
      ignoreOptsFiles ? '--ignore-opts-files' : [],
      signCommits ? '--sign-commits' : [],
      '--do-not-fork',
      '--disable-sandbox'
    ])
  } catch (error) {
    core.setFailed(` ✕ ${error.message}`)
  }
}

run()
