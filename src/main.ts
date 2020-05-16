import * as core from '@actions/core'
import * as github from './github'
import * as check from './check'
import * as files from './files'
import * as coursier from './coursier'

async function run(): Promise<void> {
  try {
    await check.mavenCentral()
    await coursier.install()
    const token = check.githubToken()
    const repo = check.githubRepository()
    const user = await github.getAuthUser(token)

    await files.prepareScalaStewardWorkspace(repo, token)

    const version = core.getInput('scala-steward-version')

    const signCommits = /true/i.test(core.getInput('sign-commits'))
    const ignoreOptsFiles = /true/i.test(core.getInput('ignore-opts-files'))

    await coursier.launch('org.scala-steward', 'scala-steward-core_2.13', version, [
      ['--workspace', '/opt/scala-steward/workspace'],
      ['--repos-file', '/opt/scala-steward/repos.md'],
      ['--git-ask-pass', '/opt/scala-steward/askpass.sh'],
      ['--git-author-email', `${user.email}"`],
      ['--git-author-name', `${user.name}"`],
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
