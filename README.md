# Scala Steward GitHub Action

[![Scala Steward badge](https://img.shields.io/badge/Scala_Steward-helping-blue.svg?style=flat&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAQCAMAAAARSr4IAAAAVFBMVEUAAACHjojlOy5NWlrKzcYRKjGFjIbp293YycuLa3pYY2LSqql4f3pCUFTgSjNodYRmcXUsPD/NTTbjRS+2jomhgnzNc223cGvZS0HaSD0XLjbaSjElhIr+AAAAAXRSTlMAQObYZgAAAHlJREFUCNdNyosOwyAIhWHAQS1Vt7a77/3fcxxdmv0xwmckutAR1nkm4ggbyEcg/wWmlGLDAA3oL50xi6fk5ffZ3E2E3QfZDCcCN2YtbEWZt+Drc6u6rlqv7Uk0LdKqqr5rk2UCRXOk0vmQKGfc94nOJyQjouF9H/wCc9gECEYfONoAAAAASUVORK5CYII=)](https://scala-steward.org)

A GitHub Action to launch [Scala Steward](https://github.com/scala-steward-org/scala-steward) in your repository.

<p align="center">
  <a href="https://github.com/scala-steward-org/scala-steward" target="_blank">
    <img src="https://github.com/scala-steward-org/scala-steward/raw/main/data/images/scala-steward-logo-circle-0.png" height="180px">
  </a>
</p>

- [What does this action do?](#what-does-this-action-do)
- [Usage](#usage)
  * [How can I trigger a run?](#how-can-i-trigger-a-run)
- [Configuration](#configuration)
  * [Specify JVM version](#specify-jvm-version)
  * [Alternative Options for the GitHub Token](#alternative-options-for-the-github-token)
    + [Using the default GitHub Action Token](#using-the-default-github-action-token)
    + [Using a Personal Access Token](#using-a-personal-access-token)
  * [Update targets](#update-targets)
    + [Updating a different repository](#updating-a-different-repository)
    + [Using a file to list repositories](#using-a-file-to-list-repositories)
    + [Updating a custom branch](#updating-a-custom-branch)
  * [GPG](#gpg)
  * [Ignoring OPTS files](#ignoring-opts-files)
  * [Run Scala Steward in debug mode](#run-scala-steward-in-debug-mode)
- [Contributors](#contributors)
- [License](#license)

---

## What does this action do?

When added, this action will launch [Scala Steward](https://github.com/scala-steward-org/scala-steward) on your own repository and create PRs to update your Scala dependencies using your own user:

![PR example](./data/images/example-pr.png)

## Usage

To use the Action in your repo, you need to create a GitHub App. Then you need to create a new GitHub Actions workflow file to run this Action. Here is a step-by-step tutorial on how to do it:

1. **Create a new GitHub App**. To do so, follow the GitHub's [Creating a GitHub App](https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app) Guide.
    1. If you're setting up this Action for an organisation-owned repo, note that the step (1) of the "Creating a GitHub App" Guide tells you how to create an organization-level App.
    2. Step (7) of the Guide tells you to specify the homepage – you can write a random URL there.
    3. Step (13) of the Guide tells you to specify the Webhook URL - you don't need it. Uncheck the box.
    4. Step (15) of the Guide asks you which permissions you want your app to have. Specify the following:
        - Metadata: Read-only
        - Pull requests: Read and write
        - Contents: Read and write
    5. Optional: Upload a profile picture for the newly created App.
        1. Locate the newly created App's Settings. To do so, go to the settings of either your personal profile or of that of your organisation (depending on where you created the App), select "Developer Settings" from the side bar, then click "GitHub Apps". Find your app, and click "Edit" next to it.
            - To access your personal settings, click on your profile icon at the top-right corner of the GitHub interface, click "Settings".
            - To access the settings of an organisation, click on your profile icon at the top-right, select "Your organizations", find the organisation for which you created an App and click "Settings" for that organisation.
        2. In the settings, locate the "Display information" section and press the "Upload a logo" button.
2. **Install the App** for the repo in which you're setting up this Action.
    1. At the App Settings (see step 1.iv.a of this tutorial on how to access it), at the sidebar, click the "Public page" button, there, click the green "Install" button.
    2. Select whether you'd like to install it account-wide or only for selected repos. If you install it for your entire account (personal or organisation), you'll be able to use this App to power this Action with any repo which that account owns.
    3. Click "Install".
3. **Copy the App id and the App private key** into a text file for usage in the next step of this tutorial. Both of them can be accessed from your App's Settings (see step 1.iv.a of this tutorial).
    1. App id is available in the "About" section of the Settings.
    2. The private key needs to be generated from the "Private keys" section. Clicking the "Generate private key" button will download a `*.pem` file on your computer. Open that file with a text editor, and copy the contents. Make sure to copy everything, including the first line `-----BEGIN RSA PRIVATE KEY-----` and the last line `-----END RSA PRIVATE KEY-----`.
4. **Create repo secrets** for the private key and the app id in the repository where you're installing this Action.
    1. To do so, from the repo's page, click the "Settings" tab. There, select "Secrets" at the sidebar, and click "Actions" at the dropdown menu. Click "New repository secret".
    2. At the "Name" field, enter `APP_PRIVATE_KEY`. At the "Value" text area, paste the private key you copied at step (3.ii) of this tutorial. Click "Add Secret".
    3. Repeat the previous steps (4.i-4.ii) to add a secret for the app id. Specify `APP_ID` as the name. For the value, paste the app id you copied at the step (3.i) of this tutorial.
5. **Create a new GitHub Actions Workflow** file, e.g. `.github/workflows/scala-steward.yml`, in the repo where you're installing this Action. Paste the following content into that file:

```yaml
# This workflow will launch at 00:00 every Sunday
on:
  schedule:
    - cron: '0 0 * * 0'

name: Launch Scala Steward

jobs:
  scala-steward:
    runs-on: ubuntu-latest
    name: Launch Scala Steward
    steps:
      - name: Generate token
        id: generate-token
        uses: tibdex/github-app-token@v1
        with:
          app_id: ${{ secrets.APP_ID }}
          private_key: ${{ secrets.APP_PRIVATE_KEY }}

      - name: Launch Scala Steward
        uses: scala-steward-org/scala-steward-action@v2
        with:
          github-token: ${{ steps.generate-token.outputs.token }}
```

### How can I trigger a run?

You can manually trigger workflow runs using the [`workflow_dispatch` event](https://docs.github.com/en/free-pro-team@latest/actions/reference/events-that-trigger-workflows#workflow_dispatch):

```yaml
on:
  schedule:
    - cron: '0 0 * * 0'
  workflow_dispatch:
```

Once you added this trigger GitHub will show a "Run workflow" button at the workflow page.


## Configuration

The following inputs are available (all of them are optional):

| Input (click on name for description) | Allowed values | Default |
| :--- | :---: | :---: |
| <details><summary>`repos-file`</summary><br/>Path to a file containing the list of repositories to update in markdown format (- owner/repo)</details>| File paths | `''` |
| <details><summary>`github-repository`</summary><br/>Repository to update. The current repository will be used by default</details> | {{owner}}/{{repo}} | `$GITHUB_REPOSITORY` |
| <details><summary>`github-token`</summary><br/>GitHub Personal Access Token with permission to create branches on repo (or `${{ secrets.GITHUB_TOKEN }}`)</details> | Valid [GitHub Token](https://github.com/settings/tokens) | `''` |
| <details><summary>`author-email`</summary><br/>Author email address to use in commits</details> | Email address | GitHub user's *Public email* |
| <details><summary>`author-name`</summary><br/>Author name to use in commits</details> | String | GitHub user's *Name* |
| <details><summary>`scala-steward-version`</summary><br/>Scala Steward version to use</details> | Valid [Scala Steward's version](https://github.com/scala-steward-org/scala-steward/releases) | `''` |
| <details><summary>`ignore-opts-files`</summary><br/>Whether to ignore "opts" files (such as `.jvmopts` or `.sbtopts`) when found on repositories or not</details> | true/false | `true` |
| <details><summary>`sign-commits`</summary><br/>Whether to sign commits or not</details> | true/false | `false` |
| <details><summary>`signing-key`</summary><br/>Key ID of signing key to use for signing commits. Analogous to git's `user.signingkey` configuration setting.</details> | Signing key ID | ' ' |
| <details><summary>`cache-ttl`</summary><br/>TTL of cache for fetching dependency versions and metadata. Set it to `0s` to disable cache completely.</details> | like 24hours, 5min, 10s, or 0s | `2hours` |
| <details><summary>`timeout`</summary><br/>Timeout for external process invocations.</details> | like 2hours, 5min, 10s, or 0s | `20min` |
| <details><summary>`github-api-url`</summary><br/>The URL of the GitHub API, only use this input if you are using GitHub Enterprise</details> | https://git.yourcompany.com/api/v3 | `https://api.github.com` |
| <details><summary>`coursier-cli-url`</summary><br/>The Url to download the coursier CLI from.</details> | Valid Url to install coursier CLI from | `https://git.io/coursier-cli-linux` |
| <details><summary>`scalafix-migrations`</summary><br/>Scalafix migrations to run when updating dependencies. Check [here](https://github.com/scala-steward-org/scala-steward/blob/master/docs/scalafix-migrations.md) for more information.</details> | Path to HOCON file<br/>or remote URL<br/>with [migration](https://github.com/scala-steward-org/scala-steward/blob/master/docs/scalafix-migrations.md) | `''` |
| <details><summary>`artifact-migrations`</summary><br/>Artifact migrations to find newer dependency updates. Check [here](https://github.com/scala-steward-org/scala-steward/blob/master/docs/artifact-migrations.md) for more information.</details> | Path to HOCON file<br/>with [migration](https://github.com/scala-steward-org/scala-steward/blob/master/docs/artifact-migrations.md) | `''` |
| <details><summary>`github-app-id`</summary><br/>This input in combination with `github-app-key` allows you to use this action as a "backend" for your own Scala Steward GitHub App.</details> | A valid GitHub App ID | `''` |
| <details><summary>`github-app-key`</summary><br/>The private key for the GitHub App set with `github-app-id`. This value should be extracted from a secret. This input in combination with `github-app-id` allows you to use this action as a "backend" for your own Scala Steward GitHub App.</details> | A private key | `''` |
| <details><summary>`branches`</summary><br/>A comma-separated list of branches to update (if not provided, the repository's default branch will be updated instead). This option only has effect if updating the current repository or using the `github-repository` input. See ["Updating a custom branch"](#updating-a-custom-branch).</details>| A list of branches to update | `''` |
| <details><summary>`repo-config`</summary><br/>The path to a [`.scala-steward.conf`](https://github.com/scala-steward-org/scala-steward/blob/master/docs/repo-specific-configuration.md) file with default values for all repos updated with this action.</details> | Path to a<br/>[`.scala-steward.conf`](https://github.com/scala-steward-org/scala-steward/blob/master/docs/repo-specific-configuration.md)<br/>default file | `.github/.scala-steward.conf` |
| <details><summary>`other-args`</summary><br/>Other arguments to launch Scala Steward with</details> | String | `''` |

### Specify JVM version

If you would like to specify a specific Java version (e.g Java 11) please add the following step before `Launch Scala Steward`:
```
- name: Set up JDK 11
  uses: actions/setup-java@v3
  with:
    java-version: 11
    distribution: temurin
```

### Alternative Options for the GitHub Token

If for some reason the token provided by the GitHub App (as described in the [Usage](#usage) section) doesn't work for you, you can use a default GitHub Action token or a personal one.

#### Using the default GitHub Action Token

By default, the action will use the default GitHub Token if none is provided via `github-token`.

> Beware that if you use the default github-token [no workflows will run](https://docs.github.com/en/free-pro-team@latest/actions/reference/authentication-in-a-workflow#using-the-github_token-in-a-workflow) on Scala Steward PRs.

#### Using a Personal Access Token

1. You will need to generate a [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` permissions for reading/writing in the repository/repositories you wish to update.
2. Add it as a repository secret.
3. Provide it to the action using `github-token` input:

```yaml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-token: ${{ secrets.REPO_GITHUB_TOKEN }}
```

Beware that using the Personal Access Token will make it look like it's you who submitted all the PRs. The workaround for this is to create a separate GitHub account for the Action and give it the [Collaborator](https://help.github.com/en/github/setting-up-and-managing-your-github-user-account/inviting-collaborators-to-a-personal-repository) permission in the repository/repositories you wish to update.

Make sure the account you choose has *Name* and *Public email* fields defined in [Public Profile](https://github.com/settings/profile) -- they will be used by Scala Steward to make commits.
If the account has [personal email address protection](https://help.github.com/en/github/setting-up-and-managing-your-github-user-account/blocking-command-line-pushes-that-expose-your-personal-email-address) enabled, then you will need to explicitly specify a email to use in commits:

```yaml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-token: ${{ secrets.REPO_GITHUB_TOKEN }}
    author-email: 12345+octocat@users.noreply.github.com
```

### Update targets

By deafult, this GitHub Action updates the default branch of the repo where it runs. This, however, can be changed, as specified below.

#### Updating a different repository

To update a repository other than the one where the Action runs, we can use the `github-repository` input. Just set it to the name (owner/repo) of the repository you would like to update.

```yaml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-token: ${{ secrets.REPO_GITHUB_TOKEN }}
    github-repository: owner/repository
```

#### Using a file to list repositories

You can specify a list of multiple repositories to update in a markdown file.

1. Create a file containing the list of repositories in markdown format:

    ```markdown
    # repos.md
    - owner/repo_1
    - owner/repo_2
    ```

2. Put that file inside the repository directory (so it is accessible to Scala Steward's action).
3. Provide it to the action using `repos-file`:

    ```yaml
    # Need to checkout to read the markdown file
    - uses: actions/checkout@v2
    - name: Launch Scala Steward
      uses: scala-steward-org/scala-steward-action@v2
      with:
        github-token: ${{ secrets.REPO_GITHUB_TOKEN }}
        repos-file: 'repos.md'
    ```

> This input (if present) will always take precedence over `github-repository`.

#### Updating a custom branch

By default, Scala Steward uses the repository's default branch to make the updates. If you want to customize that behavior, you can use the `branches` input:

```yml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-token: ${{ github.token }}
    branches: main,0.1.x,0.2.x
```

Take into account that this input is only used if updating the repository where the action is
being run or using the `github-repository` input. For cases where the `repos-file` input is used, you
should follow the instructions [here](https://github.com/scala-steward-org/scala-steward/blob/master/docs/faq.md#can-scala-steward-update-multiple-branches-in-a-repository) and add multiple lines in the markdown file like:

```md
- repo/owner # updates default branch
- repo/owner:0.1.x # updates 0.1.x branch
- repo/owner:0.2.x # updates 0.2.x branch
```

> To know more about updating multiple repositories using Scala Steward and custom branches, check [this blog post](https://alejandrohdezma.com/blog/updating-multiple-repositories-with-scala-steward-and-github-actions).

### GPG

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

7. Tell Scala Steward to sign commits using the `sign-commits` input:

    ```yaml
    - name: Launch Scala Steward
      uses: scala-steward-org/scala-steward-action@v2
      with:
        github-token: ${{ secrets.REPO_GITHUB_TOKEN }}
        sign-commits: true
    ```

8. Tell Scala Steward the key ID of the key to be used for signing commits using the `signing-key` input:

   1. Obtain the key ID for the key that should be used. For instance, in the following example, the GPG key ID is
      3AA5C34371567BD2:

      ```
      $ gpg --list-secret-keys --keyid-format=long
      /Users/hubot/.gnupg/secring.gpg
      ------------------------------------
      sec   4096R/3AA5C34371567BD2 2016-03-10 [expires: 2017-03-10]
      uid                          Hubot
      ssb   4096R/42B317FD4BA89E7A 2016-03-10
      ```

   3. Copy the key ID and paste it as the content of a new repository secret, called for example `GPG_SIGNING_KEY_ID`.

   4. Use the `signing-key` parameter to allow Scala Steward to use the correct key:

      ```yaml
      - name: Launch Scala Steward
        uses: scala-steward-org/scala-steward-action@v2
        with:
          github-token: ${{ secrets.REPO_GITHUB_TOKEN }}
          sign-commits: true
          signing-key: ${{ secrets.GPG_SIGNING_KEY_ID }}
      ```


9. **Optional**. By default, Scala Steward will use the email/name of the user that created the token added in `github-token`, if you want to override that behavior, you can use `author-email`/`author-name` inputs, for example with the values extracted from the imported private key:

    ```yaml
    - name: Launch Scala Steward
      uses: scala-steward-org/scala-steward-action@v2
      with:
        github-token: ${{ secrets.REPO_GITHUB_TOKEN }}
        sign-commits: true
        author-email: ${{ steps.import_gpg.outputs.email }}
        author-name: ${{ steps.import_gpg.outputs.name }}
    ```

### Ignoring OPTS files

By default, Scala Steward will ignore "opts" files (such as `.jvmopts` or `.sbtopts`) when found on repositories, if you want to disable this feature, use the `ignore-opts-files` input:

```yaml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-token: ${{ secrets.REPO_GITHUB_TOKEN }}
    ignore-opts-files: false
```

### Run Scala Steward in debug mode

You just need to enable [GitHub Actions' "step debug logging"](https://docs.github.com/en/actions/monitoring-and-troubleshooting-workflows/enabling-debug-logging#enabling-step-debug-logging) and Scala Steward will start automatically in debug mode too.

> Alternatively, if you are re-running a failed job and want to re-run it in debug
> mode, follow this tutorial and check `Enable debug logging` before clicking on
> `Re-run jobs`.
>
> ![](https://docs.github.com/assets/cb-11530/images/help/repository/enable-debug-logging.png)

For this you must set the following secret in the repository that contains the workflow: `ACTIONS_STEP_DEBUG` to `true` (as stated in GitHub's documentation).

## Contributors

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://alejandrohdezma.com/"><img src="https://avatars.githubusercontent.com/u/9027541?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Alejandro Hernández</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=alejandrohdezma" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/laughedelic"><img src="https://avatars.githubusercontent.com/u/766656?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Alexey Alekhin</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=laughedelic" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/arashi01"><img src="https://avatars.githubusercontent.com/u/1921493?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Ali Salim Rashid</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=arashi01" title="Code">💻</a></td>
    <td align="center"><a href="https://akmetiuk.com/"><img src="https://avatars.githubusercontent.com/u/2614813?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Anatolii Kmetiuk</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=anatoliykmetyuk" title="Documentation">📖</a></td>
    <td align="center"><a href="https://toniogela.dev/"><img src="https://avatars.githubusercontent.com/u/41690956?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Antonio Gelameris</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=TonioGela" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/armanbilge"><img src="https://avatars.githubusercontent.com/u/3119428?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Arman Bilge</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/issues?q=author%3Aarmanbilge" title="Bug reports">🐛</a> <a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=armanbilge" title="Code">💻</a></td>
    <td align="center"><a href="https://k1nd.ltd/"><img src="https://avatars.githubusercontent.com/u/36158087?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Elias Court</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=wunderk1nd-e" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/EwoutH"><img src="https://avatars.githubusercontent.com/u/15776622?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Ewout ter Hoeven</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=EwoutH" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/francisdb"><img src="https://avatars.githubusercontent.com/u/161305?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Francis De Brabandere</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/issues?q=author%3Afrancisdb" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/fthomas"><img src="https://avatars.githubusercontent.com/u/141252?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Frank Thomas</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=fthomas" title="Code">💻</a></td>
    <td align="center"><a href="https://infernus.org/"><img src="https://avatars.githubusercontent.com/u/1030482?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Jamie Shiell</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/issues?q=author%3Ajshiell" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/jeffboutotte"><img src="https://avatars.githubusercontent.com/u/6991403?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Jeff Boutotte</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=jeffboutotte" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/jyrkih"><img src="https://avatars.githubusercontent.com/u/2580851?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Jyrki Hokkanen</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/issues?q=author%3Ajyrkih" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://leobenkel.com/"><img src="https://avatars.githubusercontent.com/u/4960573?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Leo Benkel</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/issues?q=author%3Aleobenkel" title="Bug reports">🐛</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/marcelocarlos"><img src="https://avatars.githubusercontent.com/u/16080771?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Marcelo Carlos</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/issues?q=author%3Amarcelocarlos" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://www.tovbin.com/"><img src="https://avatars.githubusercontent.com/u/629845?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Matthew Tovbin</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=tovbinm" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/michele-pinto-kensu"><img src="https://avatars.githubusercontent.com/u/69146696?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Michele Pinto</b></sub></a><br /><a href="#ideas-michele-pinto-kensu" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://github.com/milanvdm"><img src="https://avatars.githubusercontent.com/u/5628925?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Milan van der Meer</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/issues?q=author%3Amilanvdm" title="Bug reports">🐛</a></td>
    <td align="center"><a href="http://ca.linkedin.com/in/pboldyrev/"><img src="https://avatars.githubusercontent.com/u/627562?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Pavel Boldyrev</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=bpg" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/spliakos"><img src="https://avatars.githubusercontent.com/u/15560159?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Stefanos Pliakos</b></sub></a><br /><a href="#ideas-spliakos" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://www.exoego.net/"><img src="https://avatars.githubusercontent.com/u/127635?v=4?s=100" width="100px;" alt=""/><br /><sub><b>TATSUNO Yasuhiro</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=exoego" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://www.nomadblacky.dev/"><img src="https://avatars.githubusercontent.com/u/3215961?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Takumi Kadowaki</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=NomadBlacky" title="Code">💻</a></td>
    <td align="center"><a href="http://victor.sollerhed.se/"><img src="https://avatars.githubusercontent.com/u/62675?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Victor Sollerhed</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=MPV" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/ybasket"><img src="https://avatars.githubusercontent.com/u/2632023?v=4?s=100" width="100px;" alt=""/><br /><sub><b>Yannick Heiber</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=ybasket" title="Code">💻</a></td>
    <td align="center"><a href="https://twitter.com/xuwei_k"><img src="https://avatars.githubusercontent.com/u/389787?v=4?s=100" width="100px;" alt=""/><br /><sub><b>kenji yoshida</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=xuwei-k" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/ryota0624"><img src="https://avatars.githubusercontent.com/u/11390724?v=4?s=100" width="100px;" alt=""/><br /><sub><b>ryota0624</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=ryota0624" title="Code">💻</a></td>
    <td align="center"><a href="https://qiita.com/yokra9"><img src="https://avatars.githubusercontent.com/u/53964890?v=4?s=100" width="100px;" alt=""/><br /><sub><b>yokra</b></sub></a><br /><a href="https://github.com/scala-steward-org/scala-steward-action/commits?author=yokra9" title="Documentation">📖</a></td>
  </tr>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## License

Scala Steward Action is licensed under the Apache License, Version 2.0.
