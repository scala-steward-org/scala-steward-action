# Scala Steward GitHub Action

A GitHub Action to launch [Scala Steward](https://github.com/scala-steward-org/scala-steward) in your repository.

<!-- toc -->

- [Installation](#installation)
- [Usage](#usage)
- [Guides](#guides)
- [Contributors](#contributors)

<!-- tocstop -->

---

## Installation

To use the Action in your repo, you need to create a GitHub App. Then you need to create a new GitHub Actions workflow file to run this Action. Here is a step-by-step tutorial on how to do it:

<details><summary>1. <b>Create a new GitHub App</b></summary><br/>

If you are creating a GitHub App for your personal account, just click [here][github-app-personal] and it will create one with the base settings already pre-configured.

On the other hand, if you are creating the App for an organization account, copy [this url][github-app-organization] and replace `my_org` with the name of your organization.

> You will need to rename the App's name to a handler that is not already taken. You can use `scala-steward-{my-github-login}` if you are creating the app for your personal account; otherwise, you can use `scala-steward-{my-org}`.

Alternatively, you can follow the official guide for creating a GitHub App :point_down:

<details><summary><i>Official guide</i></summary><br/>

Follow the GitHub's [Creating a GitHub App](https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app) Guide.

1. If you're setting up this Action for an organisation-owned repo, note that the step (1) of the "Creating a GitHub App" Guide tells you how to create an organization-level App.
2. Step (7) of the Guide tells you to specify the homepage – you can write a random URL there.
3. Step (13) of the Guide tells you to specify the Webhook URL - you don't need it. Uncheck the box.
4. Step (15) of the Guide asks you which permissions you want your app to have. Specify the following:
    - Metadata: Read-only
    - Pull requests: Read and write
    - Contents: Read and write

</details><br/>

Optional: Upload a profile picture for the newly created App.

1. Locate the newly created App's Settings. To do so, go to the settings of either your personal profile or of that of your organisation (depending on where you created the App), select "Developer Settings" from the side bar, then click "GitHub Apps". Find your app, and click "Edit" next to it.
    - To access your personal settings, click on your profile icon at the top-right corner of the GitHub interface, click "Settings".
    - To access the settings of an organisation, click on your profile icon at the top-right, select "Your organizations", find the organisation for which you created an App and click "Settings" for that organisation.
2. In the settings, locate the "Display information" section and press the "Upload a logo" button.
3. If you want to use [Scala Steward's official logo](https://github.com/scala-steward-org/scala-steward/raw/main/data/images/scala-steward-logo-circle-0.png) just download it to a folder in your computer and upload it back using the input. Then set "Badge background color" to `#3d5a80`

</details>

<details><summary>2. <b>Install the App</b></summary><br/>

1. At the App Settings, at the sidebar, click the "Public page" button, there, click the green "Install" button.
2. Select whether you'd like to install it account-wide or only for selected repos. If you install it for your entire account (personal or organisation), Scala Steward will try to update every repository in your organization, even if they're not Scala repositories.
3. Click "Install".
4. When the new page opens, find its URL and copy the number behind `https://github.com/settings/installations/`. It is the installation ID, you will need it in the following step.

</details>

<details><summary>3. <b>Copy the App ID, the App private key and the installation ID</b></summary><br/>

Locate the App ID, the installation ID and the App private key for usage in the next step of this tutorial. All of them can be accessed from your App's Settings.

1. App ID is available in the "About" section of the Settings.
2. You should have the installation ID from step (2.4). If you didn't copy it, go to the App's settings and click on "Install App" on the left. On the new page you should see the account where you install the app. Click the "gear" icon on the right. When the next page loads, find its URL and copy the number behind `https://github.com/settings/installations/`. That's the installation ID.
3. The private key needs to be generated from the "Private keys" section. Clicking the "Generate private key" button will download a `*.pem` file on your computer. Save that file for the following step.

</details>

<details><summary>4. <b>Create repo secrets</b></summary><br/>

Create repo secrets for the private key, the app id and the installation ID in the repository from where you want to run this action.

1. To do so, from the repo's page, click the "Settings" tab. There, select "Secrets" at the sidebar, and click "Actions" at the dropdown menu. Click "New repository secret".
2. At the "Name" field, enter `APP_PRIVATE_KEY`. Then, open the ".pem" file you downloaded at step (3.3) with a text editor, and copy the contents. Make sure to copy everything, including the first line `-----BEGIN RSA PRIVATE KEY-----` and the last line `-----END RSA PRIVATE KEY-----`. Paste it at the "Value" text area. Click "Add Secret".
3. Repeat the previous steps (4.1) to add a secret for the app id you recover on step (3.1). Specify `APP_ID` as the name.
4. Repeat the previous steps (4.1) to add a secret for the installation id you recover on step (3.2). Specify `APP_INSTALLATION_ID` as the name.

</details>

<details><summary>5. <b>Create a new GitHub Actions Workflow</b></summary><br/>

Create a new GitHub Actions Workflow file, e.g. `.github/workflows/scala-steward.yml`, in the repo where you're installing this Action. Paste the following content into that file:

```yaml
on:
  schedule:
    - cron: '0 0 * * 0'

name: Launch Scala Steward

jobs:
  scala-steward:
    runs-on: ubuntu-22.04
    name: Launch Scala Steward
    steps:
      - name: Launch Scala Steward
        uses: scala-steward-org/scala-steward-action@v2
        with:
          github-app-id: ${{ secrets.APP_ID }}
          github-app-installation-id: ${{ secrets.APP_INSTALLATION_ID }}
          github-app-key: ${{ secrets.APP_PRIVATE_KEY }}
```

</details>

<details><summary>6. <b>Scala Steward does its magic :tada:</b></summary><br/>

If you have used the default cron expression the workflow will launch at 00:00 every Sunday. If you want to change it to a different schedule, you can check [this page](https://crontab.guru).

When it launches it will send PR to update all the repos selected in step (2.2).

</details>

## Usage

<!-- start usage -->
```yaml
- uses: scala-steward-org/scala-steward-action@v2
  with:
    # Artifact migrations for newer versions of artifacts with
    # different group Ids, artifact ids, or both different.
    # 
    # Expects the path to HOCON file with migration/s.
    # 
    # See https://github.com/scala-steward-org/scala-steward/blob/main/docs/artifact-migrations.md
    artifact-migrations: ''

    # Author email address to use in commits. If set it will
    # override any email retrieved from GitHub.
    author-email: ''

    # Author name to use in commits. If set it will override
    # any name retrieved from GitHub.
    author-name: ''

    # A comma-separated list of branches to update (if not
    # provided, the repository's default branch will be
    # updated instead).
    # 
    # This option only has effect if updating the current
    # repository or using the `github-repository` input.
    branches: ''

    # TTL of cache for fetching dependency versions and
    # metadata, set it to 0s to disable it.
    #
    # Default: 2hours
    cache-ttl: ''

    # Size of the buffer for the output of an external process
    # in lines.
    #
    # Default: 16384
    max-buffer-size: ''

    # Url to download the coursier linux CLI from.
    #
    # Default: https://github.com/coursier/launchers/raw/master/cs-x86_64-pc-linux.gz
    coursier-cli-url: ''

    # The URL of the GitHub API, only use this input if
    # you are using GitHub Enterprise.
    #
    # Default: https://api.github.com
    github-api-url: ''

    # If set to `true` the GitHub App information will
    # only be used for authentication.
    # 
    # Repositories to update will be read from either
    # the `repos-file` or the `github-repository` inputs.
    #
    # Default: false
    github-app-auth-only: ''

    # GitHub App ID. See the "Installation" section of the
    # README to learn how to set up the app and how to fill this input.
    github-app-id: ''

    # GitHub App Installation ID. See the "Installation"
    # section of the README to learn how to set up the app
    # and how to fill this input.
    github-app-installation-id: ''

    # GitHub App Private Key. See the "Installation" section
    # of the README to learn how to set up the app and how to
    # fill this input.
    github-app-key: ''

    # Repository to update. Will be ignored if either
    # `repos-file` is provided or the `github-app-*`
    # inputs are and `github-app-auth-only` is not `true`.
    #
    # Default: ${{ github.repository }}
    github-repository: ''

    # GitHub Personal Access Token with permission to create
    # branches on repo.
    # 
    # If `github-app-*` inputs are provided an App's
    # installation token will be used instead of this one.
    #
    # Default: ${{ github.token }}
    github-token: ''

    # Whether to ignore "opts" files (such as `.jvmopts`
    # or `.sbtopts`) when found on repositories or not.
    #
    # Default: true
    ignore-opts-files: ''

    # Mill version to install. Take into account this will
    # just affect the global `mill` executable. Scala 
    # Steward will still respect the version specified in
    # your repository while updating it.
    #
    # Default: 0.10.9
    mill-version: ''

    # Other Scala Steward arguments not yet supported by
    # this action as a separate argument.
    other-args: ''

    # Location of a `.scala-steward.conf` file with default
    # values.
    # 
    # If the provided file is missing the action will fail.
    #
    # Default: .github/.scala-steward.conf
    repo-config: ''

    # Path to a file containing the list of repositories
    # to update in markdown format:
    # 
    # - owner/repo1
    # - owner/repo2
    # 
    # This input will be ignored if the `github-app-*`
    # inputs are provided and `github-app-auth-only` is
    # not `true`.
    repos-file: ''

    # Scala Steward version to use. If not provided it
    # will use the last one published.
    scala-steward-version: ''

    # Scalafix rules for version updates to run after
    # certain updates.
    # 
    # Expects the path to HOCON file with migration/s.
    # 
    # See https://github.com/scala-steward-org/scala-steward/blob/main/docs/scalafix-migrations.md
    scalafix-migrations: ''

    # Whether to sign commits or not.
    #
    # Default: false
    sign-commits: ''

    # Key ID of GPG key to use for signing commits. See the
    # "Signing commits with GPG" section to learn how to
    # prepare the environment and fill this input.
    signing-key: ''

    # Timeout for external process invocations.
    #
    # Default: 20min
    timeout: ''
```
<!-- end usage -->

## Guides

<details><summary><b>Manually triggering a run</b></summary><br/>

You can manually trigger workflow runs using the [workflow_dispatch](https://docs.github.com/en/free-pro-team@latest/actions/reference/events-that-trigger-workflows#workflow_dispatch) event:

```diff
 on:
+  workflow_dispatch:
   schedule:
     - cron: '0 0 * * 0'
 
 name: Launch Scala Steward
 
 jobs:
   scala-steward:
     runs-on: ubuntu-latest
     name: Launch Scala Steward
     steps:
       - name: Launch Scala Steward
         uses: scala-steward-org/scala-steward-action@v2
         with:
           github-app-id: ${{ secrets.APP_ID }}
           github-app-installation-id: ${{ secrets.APP_INSTALLATION_ID }}
           github-app-key: ${{ secrets.APP_PRIVATE_KEY }}
```
Once you've added this trigger GitHub will show a "Run workflow" button at the workflow page.

<br/>
</details>

<details><summary><b>Specify JVM version</b></summary><br/>

If you would like to specify a specific Java version (e.g Java 11) please add the following step before `Launch Scala Steward` step:

```yaml
- name: Set up JDK 11
  uses: actions/setup-java@v3
  with:
    java-version: 11
    distribution: temurin
```

<br/>
</details>

<details><summary><b>Add JVM options to the running JVM</b></summary><br/>

If you would like to add JVM options (such as `-Xmx`) to the Scala Steward JVM process please add the following to the main `Launch Scala Steward` step:

```yaml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  env:
    JAVA_OPTS: "-XX:+UseG1GC -Xms4G -Xmx4G -Xss2M -XX:MetaspaceSize=512M"
```

<br/>
</details>

<details><summary><b>Updating a specific repository</b></summary><br/>

When using the `github-app-*` inputs, Scala Steward will always retrieve the list of repositories to update from the App's installation. You can override this by setting `github-app-auth-only` to `'true'`. This way the action will only use the app credentials to authenticate and will update the repository set on the `github-repository` input (defaults to the current repository).

```yaml
 on:
+  workflow_dispatch:
   schedule:
     - cron: '0 0 * * 0'
 
 name: Launch Scala Steward
 
 jobs:
   scala-steward:
     runs-on: ubuntu-latest
     name: Launch Scala Steward
     steps:
       - name: Launch Scala Steward
         uses: scala-steward-org/scala-steward-action@v2
         with:
           github-app-id: ${{ secrets.APP_ID }}
           github-app-installation-id: ${{ secrets.APP_INSTALLATION_ID }}
           github-app-key: ${{ secrets.APP_PRIVATE_KEY }}
           github-app-auth-only: 'true'
```

To update a repository other than the one where the Action runs, we can override the `github-repository` input. Just set it to the name (owner/repo) of the repository you would like to update.

```yaml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-app-id: ${{ secrets.APP_ID }}
    github-app-installation-id: ${{ secrets.APP_INSTALLATION_ID }}
    github-app-key: ${{ secrets.APP_PRIVATE_KEY }}
    github-app-auth-only: 'true'
    github-repository: owner/repo
```

<br/>
</details>

<details><summary><b>Update specific repositories (listed on a file)</b></summary><br/>

When using the `github-app-*` inputs, Scala Steward will always retrieve the list of repositories to update from the App's installation. You can override this by setting `github-app-auth-only` to `'true'`. This way the action will only use the app credentials to authenticate and will allow other mechanisms for selecting which repository should be updated. For example, you can specify a list of repositories in a markdown file.

1. Create a file containing the list of repositories in markdown format:
```markdown
# repos.md
- owner/repo_1
- owner/repo_2
```
2. Put that file inside the repository directory (so it is accessible to Scala Steward's action).
3. Provide it to the action using `repos-file`:
```yaml
- name: Checkout repository so `repos.md` is available
  uses: actions/checkout@v2

- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-app-id: ${{ secrets.APP_ID }}
    github-app-installation-id: ${{ secrets.APP_INSTALLATION_ID }}
    github-app-key: ${{ secrets.APP_PRIVATE_KEY }}
    github-app-auth-only: 'true'
    repos-file: 'repos.md'
```

> 

> This input (if present) will always take precedence over `github-repository`.

<br/>
</details>

<details><summary><b>Update one or more specific branches</b></summary><br/>

> **Important!** This input is only used when using the `github-repository` input (see the "Updating a specific repository" guide). For cases where the `repos-file` input is used (see the "Update specific repositories (listed on a file)" guide), you should follow the instructions [here](https://github.com/scala-steward-org/scala-steward/blob/main/docs/faq.md#can-scala-steward-update-multiple-branches-in-a-repository).

> **This input won't have any effect when using a GitHub App for listing the repositories to update.**

By default, Scala Steward uses the repository's default branch to make the updates. If you want to customize that behavior, you can use the `branches` input:

```yml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-app-id: ${{ secrets.APP_ID }}
    github-app-installation-id: ${{ secrets.APP_INSTALLATION_ID }}
    github-app-key: ${{ secrets.APP_PRIVATE_KEY }}
    github-app-auth-only: 'true'
    github-repository: owner/repo
    branches: main,0.1.x,0.2.x
```

<br/>
</details>

<details><summary><b>Disable ignoring OPTS files</b></summary><br/>

By default, Scala Steward will ignore "opts" files (such as `.jvmopts` or `.sbtopts`) when found on repositories, if you want to disable this feature, use the `ignore-opts-files` input:

```yaml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-app-id: ${{ secrets.APP_ID }}
    github-app-installation-id: ${{ secrets.APP_INSTALLATION_ID }}
    github-app-key: ${{ secrets.APP_PRIVATE_KEY }}
    ignore-opts-files: false
```

<br/>
</details>

<details><summary><b>Run Scala Steward with step debug logging</b></summary><br/>

You just need to enable [GitHub Actions' "step debug logging"](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/enabling-debug-logging#enabling-step-debug-logging) and Scala Steward will start automatically in debug mode too.

For this you must set the following secret in the repository that contains the workflow: `ACTIONS_STEP_DEBUG` to `true` (as stated in GitHub's documentation).

> Alternatively, if you are re-running a failed job and want to re-run it in debug
> mode, follow this tutorial and check `Enable debug logging` before clicking on
> `Re-run jobs`.
>
> ![](https://docs.github.com/assets/cb-11530/images/help/repository/enable-debug-logging.png)

<br/>
</details>

<details><summary><b>Running locally to attach a JVM debugger</b></summary><br/>

When debugging the behaviour of Scala Steward, it can be helpful to run Scala Steward
locally, while mimicking the settings used by the Scala Steward GitHub Action, so that
a debugger can be attached - [the Guardian have notes on how they do that](https://github.com/guardian/scala-steward-public-repos/blob/main/running-locally.md),
which may provide a helpful example if you need to do that in your own organisation. 

<br/>
</details>


<details><summary><b>Using the default GitHub Action Token (instead of the GitHub App)</b></summary><br/>

If for any reason you want to use the default GitHub Token available in GitHub Actions, you won't be able to use the `github-app-*` inputs. Also beware that if you use the default github-token [no workflows will run](https://docs.github.com/en/free-pro-team@latest/actions/reference/authentication-in-a-workflow#using-the-github_token-in-a-workflow) on Scala Steward PRs. If you still want to use it you just need to remove all the `github-app-*` inputs and follow either the `Updating a specific repository` or the `Update specific repositories (listed on a file)` guides to provide a repository to update.

**Example updating the current repository with the default GitHub Token**

```yaml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
```

**Example updating a specific repository with the default GitHub Token**

```yaml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-repository: owner/repo
```

**Example updating a list of repositories (from a file) with the default GitHub Token**

```yaml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-repository: owner/repo
    repos-file: 'repos.md'
```

<br/>
</details>

<details><summary><b>Using a Personal Access Token (instead of the GitHub App)</b></summary><br/>

If for any reason you want to use the default GitHub Token available in GitHub Actions, you won't be able to use the `github-app-*` inputs. If you still want to use it you just need to remove all the `github-app-*` inputs and follow these steps:

1. Generate a [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` permissions for reading/writing in the repository/repositories you wish to update.
2. Add it as a repository secret.
3. Follow either the `Updating a specific repository` or the `Update specific repositories (listed on a file)` guides to provide a repository to update.
3. Provide the token to the action using the `github-token` input.

**Example updating the current repository with the default GitHub Token**

```yaml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-token: ${{ secrets.REPO_GITHUB_TOKEN }}
```

**Example updating a specific repository with the default GitHub Token**

```yaml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-repository: owner/repo
    github-token: ${{ secrets.REPO_GITHUB_TOKEN }}
```

**Example updating a list of repositories (from a file) with the default GitHub Token**

```yaml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-repository: owner/repo
    github-token: ${{ secrets.REPO_GITHUB_TOKEN }}
    repos-file: 'repos.md'
```

Beware that using the Personal Access Token will make it look like it's you who submitted all the PRs. The workaround for this is to create a separate GitHub account for the Action and give it the [Collaborator](https://help.github.com/en/github/setting-up-and-managing-your-github-user-account/inviting-collaborators-to-a-personal-repository) permission in the repository or repositories you wish to update.

Make sure the account you choose has *Name* and *Public email* fields defined in its [Public Profile](https://github.com/settings/profile), as they will be used by Scala Steward to make commits.

If the account has [personal email address protection](https://help.github.com/en/github/setting-up-and-managing-your-github-user-account/blocking-command-line-pushes-that-expose-your-personal-email-address) enabled, then you will need to explicitly specify an email to use in commits:

```yaml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-token: ${{ secrets.REPO_GITHUB_TOKEN }}
    author-email: 12345+octocat@users.noreply.github.com
```

<br/>
</details>

<details><summary><b>Sign commits created by Scala Steward</b></summary><br/>

> Signing commits only take place when using a GitHub Personal Access Token (see the "Using a Personal Access Token (instead of the GitHub App)" guide).

If you want commits created by Scala Steward to be automatically signed with a GPG key, follow these steps:

1. Generate a new GPG key following [GitHub's own tutorial](https://help.github.com/en/github/authenticating-to-github/generating-a-new-gpg-key).
2. Add your new GPG key to your [user's GitHub account](https://github.com/settings/keys) following [GitHub's own tutorial](https://help.github.com/en/github/authenticating-to-github/adding-a-new-gpg-key-to-your-github-account).
3. Export the GPG private key as an ASCII armored version to your clipboard (change `joe@foo.bar` with your key email address):

```bash
# macOS
gpg --armor --export-secret-key joe@foo.bar | pbcopy

# Ubuntu (assuming GNU base64)
gpg --armor --export-secret-key joe@foo.bar -w0 | xclip

# Arch
gpg --armor --export-secret-key joe@foo.bar | sed -z 's;\n;;g' | xclip -selection clipboard -i

# FreeBSD (assuming BSD base64)
gpg --armor --export-secret-key joe@foo.bar | xclip
```

4. Paste your clipboard as a new `GPG_PRIVATE_KEY` repository secret.
5. If the key is passphrase protected, add the passphrase as another repository secret called `GPG_PASSPHRASE`.
6. Import it to the workflow using an action such us [crazy-max/ghaction-import-gpg](https://github.com/crazy-max/ghaction-import-gpg):

```yaml
- name: Import GPG key
  uses: crazy-max/ghaction-import-gpg@v2
  with:
    git_user_signingkey: true
  env:
    GPG_PRIVATE_KEY: ${{ secrets.GPG_PRIVATE_KEY }}
    PASSPHRASE:      ${{ secrets.GPG_PASSPHRASE }}
```

7. Obtain the key ID for the key that should be used. For instance, in the following example, the GPG key ID is `3AA5C34371567BD2`:

```
$ gpg --list-secret-keys --keyid-format=long

~/.gnupg/secring.gpg
------------------------------------
sec   4096R/3AA5C34371567BD2 2022-01-01
uid                          My Name
ssb   4096R/42B317FD4BA89E7A 2022-01-01
```

8. Copy the key ID and paste it as the content of a new repository secret, named `GPG_SIGNING_KEY_ID`.

9. Tell Scala Steward to sign commits using the `sign-commits` input. Use as well the `signing-key` parameter to allow Scala Steward to use the correct key:

```yaml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-token: ${{ secrets.REPO_GITHUB_TOKEN }}
    signing-key: ${{ secrets.GPG_SIGNING_KEY_ID }}
    sign-commits: true
```

10. **Optional**. By default, Scala Steward will use the email/name of the user that created the token added in `github-token`, if you want to override that behavior, you can use `author-email`/`author-name` inputs, for example with the values extracted from the imported private key:

```yaml
- name: Import GPG key
  id: import_gpg
  uses: crazy-max/ghaction-import-gpg@v2
  with:
    git_user_signingkey: true
  env:
    GPG_PRIVATE_KEY: ${{ secrets.GPG_PRIVATE_KEY }}
    PASSPHRASE:      ${{ secrets.GPG_PASSPHRASE }}

- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-token: ${{ secrets.REPO_GITHUB_TOKEN }}
    signing-key: ${{ secrets.GPG_SIGNING_KEY_ID }}
    sign-commits: true
    author-email: ${{ steps.import_gpg.outputs.email }}
    author-name: ${{ steps.import_gpg.outputs.name }}
```

<br/>
</details>

## Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="16.66%"><a href="http://www.warski.org/"><img src="https://avatars.githubusercontent.com/u/60503?v=4?s=100" width="100px;" alt="Adam Warski"/><br /><sub><b>Adam Warski</b></sub></a><br /><a href="#question-adamw" title="Answering Questions">💬</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://alejandrohdezma.com/"><img src="https://avatars.githubusercontent.com/u/9027541?v=4?s=100" width="100px;" alt="Alejandro Hernández"/><br /><sub><b>Alejandro Hernández</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=alejandrohdezma" title="Code">💻</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/laughedelic"><img src="https://avatars.githubusercontent.com/u/766656?v=4?s=100" width="100px;" alt="Alexey Alekhin"/><br /><sub><b>Alexey Alekhin</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=laughedelic" title="Code">💻</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/arashi01"><img src="https://avatars.githubusercontent.com/u/1921493?v=4?s=100" width="100px;" alt="Ali Salim Rashid"/><br /><sub><b>Ali Salim Rashid</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=arashi01" title="Code">💻</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://akmetiuk.com/"><img src="https://avatars.githubusercontent.com/u/2614813?v=4?s=100" width="100px;" alt="Anatolii Kmetiuk"/><br /><sub><b>Anatolii Kmetiuk</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=anatoliykmetyuk" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://toniogela.dev/"><img src="https://avatars.githubusercontent.com/u/41690956?v=4?s=100" width="100px;" alt="Antonio Gelameris"/><br /><sub><b>Antonio Gelameris</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=TonioGela" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/armanbilge"><img src="https://avatars.githubusercontent.com/u/3119428?v=4?s=100" width="100px;" alt="Arman Bilge"/><br /><sub><b>Arman Bilge</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/issues?q=author%3Aarmanbilge" title="Bug reports">🐛</a> <a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=armanbilge" title="Code">💻</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://chris-kipp.io/"><img src="https://avatars.githubusercontent.com/u/13974112?v=4?s=100" width="100px;" alt="Chris Kipp"/><br /><sub><b>Chris Kipp</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/issues?q=author%3Ackipp01" title="Bug reports">🐛</a> <a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=ckipp01" title="Code">💻</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://k1nd.ltd/"><img src="https://avatars.githubusercontent.com/u/36158087?v=4?s=100" width="100px;" alt="Elias Court"/><br /><sub><b>Elias Court</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=wunderk1nd-e" title="Code">💻</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/EwoutH"><img src="https://avatars.githubusercontent.com/u/15776622?v=4?s=100" width="100px;" alt="Ewout ter Hoeven"/><br /><sub><b>Ewout ter Hoeven</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=EwoutH" title="Code">💻</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://regadas.dev/"><img src="https://avatars.githubusercontent.com/u/163899?v=4?s=100" width="100px;" alt="Filipe Regadas"/><br /><sub><b>Filipe Regadas</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=regadas" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/fmeriaux"><img src="https://avatars.githubusercontent.com/u/16759768?v=4?s=100" width="100px;" alt="Florian Meriaux"/><br /><sub><b>Florian Meriaux</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/issues?q=author%3Afmeriaux" title="Bug reports">🐛</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/francisdb"><img src="https://avatars.githubusercontent.com/u/161305?v=4?s=100" width="100px;" alt="Francis De Brabandere"/><br /><sub><b>Francis De Brabandere</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/issues?q=author%3Afrancisdb" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/fthomas"><img src="https://avatars.githubusercontent.com/u/141252?v=4?s=100" width="100px;" alt="Frank Thomas"/><br /><sub><b>Frank Thomas</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=fthomas" title="Code">💻</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://infernus.org/"><img src="https://avatars.githubusercontent.com/u/1030482?v=4?s=100" width="100px;" alt="Jamie Shiell"/><br /><sub><b>Jamie Shiell</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/issues?q=author%3Ajshiell" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/jeffboutotte"><img src="https://avatars.githubusercontent.com/u/6991403?v=4?s=100" width="100px;" alt="Jeff Boutotte"/><br /><sub><b>Jeff Boutotte</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=jeffboutotte" title="Code">💻</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/jyrkih"><img src="https://avatars.githubusercontent.com/u/2580851?v=4?s=100" width="100px;" alt="Jyrki Hokkanen"/><br /><sub><b>Jyrki Hokkanen</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/issues?q=author%3Ajyrkih" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://leobenkel.com/"><img src="https://avatars.githubusercontent.com/u/4960573?v=4?s=100" width="100px;" alt="Leo Benkel"/><br /><sub><b>Leo Benkel</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/issues?q=author%3Aleobenkel" title="Bug reports">🐛</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/marcelocarlos"><img src="https://avatars.githubusercontent.com/u/16080771?v=4?s=100" width="100px;" alt="Marcelo Carlos"/><br /><sub><b>Marcelo Carlos</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/issues?q=author%3Amarcelocarlos" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://www.tovbin.com/"><img src="https://avatars.githubusercontent.com/u/629845?v=4?s=100" width="100px;" alt="Matthew Tovbin"/><br /><sub><b>Matthew Tovbin</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=tovbinm" title="Code">💻</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/michele-pinto-kensu"><img src="https://avatars.githubusercontent.com/u/69146696?v=4?s=100" width="100px;" alt="Michele Pinto"/><br /><sub><b>Michele Pinto</b></sub></a><br /><a href="#ideas-michele-pinto-kensu" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/milanvdm"><img src="https://avatars.githubusercontent.com/u/5628925?v=4?s=100" width="100px;" alt="Milan van der Meer"/><br /><sub><b>Milan van der Meer</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/issues?q=author%3Amilanvdm" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="16.66%"><a href="http://ca.linkedin.com/in/pboldyrev/"><img src="https://avatars.githubusercontent.com/u/627562?v=4?s=100" width="100px;" alt="Pavel Boldyrev"/><br /><sub><b>Pavel Boldyrev</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=bpg" title="Code">💻</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/spliakos"><img src="https://avatars.githubusercontent.com/u/15560159?v=4?s=100" width="100px;" alt="Stefanos Pliakos"/><br /><sub><b>Stefanos Pliakos</b></sub></a><br /><a href="#ideas-spliakos" title="Ideas, Planning, & Feedback">🤔</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="16.66%"><a href="https://www.exoego.net/"><img src="https://avatars.githubusercontent.com/u/127635?v=4?s=100" width="100px;" alt="TATSUNO Yasuhiro"/><br /><sub><b>TATSUNO Yasuhiro</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=exoego" title="Code">💻</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://www.nomadblacky.dev/"><img src="https://avatars.githubusercontent.com/u/3215961?v=4?s=100" width="100px;" alt="Takumi Kadowaki"/><br /><sub><b>Takumi Kadowaki</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=NomadBlacky" title="Code">💻</a></td>
      <td align="center" valign="top" width="16.66%"><a href="http://victor.sollerhed.se/"><img src="https://avatars.githubusercontent.com/u/62675?v=4?s=100" width="100px;" alt="Victor Sollerhed"/><br /><sub><b>Victor Sollerhed</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=MPV" title="Code">💻</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/ybasket"><img src="https://avatars.githubusercontent.com/u/2632023?v=4?s=100" width="100px;" alt="Yannick Heiber"/><br /><sub><b>Yannick Heiber</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=ybasket" title="Code">💻</a> <a href="https://github.com/scala-steward-org/scala-steward-action/issues?q=author%3Aybasket" title="Bug reports">🐛</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://twitter.com/xuwei_k"><img src="https://avatars.githubusercontent.com/u/389787?v=4?s=100" width="100px;" alt="kenji yoshida"/><br /><sub><b>kenji yoshida</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=xuwei-k" title="Code">💻</a> <a href="#question-xuwei-k" title="Answering Questions">💬</a></td>
      <td align="center" valign="top" width="16.66%"><a href="https://github.com/ryota0624"><img src="https://avatars.githubusercontent.com/u/11390724?v=4?s=100" width="100px;" alt="ryota0624"/><br /><sub><b>ryota0624</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=ryota0624" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="16.66%"><a href="https://qiita.com/yokra9"><img src="https://avatars.githubusercontent.com/u/53964890?v=4?s=100" width="100px;" alt="yokra"/><br /><sub><b>yokra</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=yokra9" title="Documentation">📖</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

[github-app-personal]: https://github.com/settings/apps/new?name=scala-steward&description=Github%20App%20to%20facilitate%20running%20Scala%20Steward%20against%20my%20repositories&url=https://github.com/scala-steward-org/scala-steward&public=false&webhook_active=false&pull_requests=write&contents=write
[github-app-organization]: https://github.com/organizations/my_org/settings/apps/new?name=scala-steward&description=Github%20App%20to%20facilitate%20running%20Scala%20Steward%20against%20my%20repositories&url=https://github.com/scala-steward-org/scala-steward&public=false&webhook_active=false&pull_requests=write&contents=write
