# Scala Steward Github Action

[![Scala Steward badge](https://img.shields.io/badge/Scala_Steward-helping-blue.svg?style=flat&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAQCAMAAAARSr4IAAAAVFBMVEUAAACHjojlOy5NWlrKzcYRKjGFjIbp293YycuLa3pYY2LSqql4f3pCUFTgSjNodYRmcXUsPD/NTTbjRS+2jomhgnzNc223cGvZS0HaSD0XLjbaSjElhIr+AAAAAXRSTlMAQObYZgAAAHlJREFUCNdNyosOwyAIhWHAQS1Vt7a77/3fcxxdmv0xwmckutAR1nkm4ggbyEcg/wWmlGLDAA3oL50xi6fk5ffZ3E2E3QfZDCcCN2YtbEWZt+Drc6u6rlqv7Uk0LdKqqr5rk2UCRXOk0vmQKGfc94nOJyQjouF9H/wCc9gECEYfONoAAAAASUVORK5CYII=)](https://scala-steward.org)

A Github Action to launch [Scala Steward](https://github.com/fthomas/scala-steward) in your repository.

<p align="center">
  <a href="https://github.com/fthomas/scala-steward" target="_blank">
    <img src="https://github.com/fthomas/scala-steward/raw/master/data/images/scala-steward-logo-circle-0.png" height="180px">
  </a>
</p>

---

* [What does this action do?](#what-does-this-action-do)
* [Usage](#usage)
  * [How can I trigger a run?](#how-can-i-trigger-a-run)
* [Configuration](#configuration)
  * [Github Token](#github-token)
  * [Updating one repository](#updating-one-repository)
  * [Updating multiple repositories](#updating-multiple-repositories)
  * [GPG](#gpg)
  * [Ignoring OPTS files](#ignoring-opts-files)
* [Credit](#credit)
* [License](#license)

## What does this action do?

When added, this action will launch [Scala Steward](https://github.com/fthomas/scala-steward) on your own repository and create PRs to update your Scala dependencies using your own user:

![PR example](./data/images/example-pr.png)

## Usage

Create a new `.github/workflows/scala-steward.yml` file:

```yaml
# This workflow will launch at 00:00 every Sunday
on:
  schedule:
    - cron: '0 0 * * 0'

jobs:
  scala-steward:
    runs-on: ubuntu-latest
    name: Launch Scala Steward
    steps:
      - name: Launch Scala Steward
        uses: scala-steward-org/scala-steward-action@v2
        with:
          github-token: ${{ secrets.ADMIN_GITHUB_TOKEN }}
```

### How can I trigger a run?

If you want to be able to trigger the action manually, you make it respond to [`repository_dispatch`](https://help.github.com/en/actions/reference/events-that-trigger-workflows#external-events-repository_dispatch) events:

```yaml
on:
  schedule:
    - cron: '0 0 * * 0'
  repository_dispatch:
    types: [scala-steward]
```

Then, you can call the trigger from your local machine with:

```bash
# Change `owner/repo` to your own repository
curl -d "{\"event_type\": \"scala-steward\"}" \
    -H "Content-Type: application/json" \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    "https://api.github.com/repos/owner/repo/dispatches"
```

> Remember to have a valid github token exported as GITHUB_TOKEN in your local environment:
>
> ```bash
> export GITHUB_TOKEN="your_github_token"
> ```

## Configuration

The following inputs are available:

| Input                   | Allowed values                                                                     | Required | Default                       | Description                                                                                         |
|-------------------------|------------------------------------------------------------------------------------|----------|-------------------------------|-----------------------------------------------------------------------------------------------------|
| `repos-file`            | File paths                                                                         | no       | ''                            | Path to a file containing the list of repositories to update in markdown format (- owner/repo)      |
| `github-repository`     | {{owner}}/{{repo}}                                                                 | no       | $GITHUB_REPOSITORY            | Repository to update. The current repository will be used by default                                |
| `github-token`          | Valid [Github Token](https://github.com/settings/tokens)                           | yes      | ''                            | Github Personal Access Token with permission to create branches on repo                             |
| `author-email`          | Email address                                                                      | no       | Github user's *Public email*  | Author email address to use in commits                                                         |
| `author-name`           | String                                                                             | no       | Github user's *Name*          | Author name to use in commits                                                                  |
| `scala-steward-version` | Valid [Scala Steward's version](https://github.com/fthomas/scala-steward/releases) | no       | 0.5.0-385-e5e4789c-SNAPSHOT   | Scala Steward version to use                                                                        |
| `ignore-opts-files`     | true/false                                                                         | no       | true                          | Whether to ignore "opts" files (such as `.jvmopts` or `.sbtopts`) when found on repositories or not |
| `sign-commits`          | true/false                                                                         | no       | false                         | Whether to sign commits or not                                                                      |

### Github Token

1. You will need to generate a [Github Personal Access Token](https://github.com/settings/tokens) with permissions for reading/writing in the repository/repositories you wish to update.
2. Add it as a secret repository.
3. Provide it to the action using `github-token` input:

```yaml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-token: ${{ secrets.ADMIN_GITHUB_TOKEN }}
```

#### Note on Github User account

The [Github Personal Access Token](https://github.com/settings/tokens) can be created under your own Github account, or under a separate account that has [Collaborator](https://help.github.com/en/github/setting-up-and-managing-your-github-user-account/inviting-collaborators-to-a-personal-repository) permission in the repository/repositories you wish to update.

Make sure the account you choose has *Name* and *Public email* fields defined in [Public Profile](https://github.com/settings/profile) -- they will be using by Scala Steward to make commits.
If the account has [personal email address protection](https://help.github.com/en/github/setting-up-and-managing-your-github-user-account/blocking-command-line-pushes-that-expose-your-personal-email-address) enabled, you will need to explicitly specify email to use in commits:
  
```yaml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-token: ${{ secrets.ADMIN_GITHUB_TOKEN }}
    author-email: 12345+octocat@users.noreply.github.com
```


### Updating one repository

To update only one repository we can use the `github-repository` input. Just set it to the name (owner/repo) of the repository you would like to update.

```yaml
- name: Launch Scala Steward
  uses: scala-steward-org/scala-steward-action@v2
  with:
    github-token: ${{ secrets.ADMIN_GITHUB_TOKEN }}
    github-repository: owner/repository
```

> This input isn't required if the workflow launches from the same repository that you wish to update.

### Updating multiple repositories

To update multiple repositories you would need to perform the following steps:

1. Create a markdown file containing the list of repositories in markdown format:

    ```markdown
    # repos.md
    - owner/repo_1
    - owner/repo_2
    ```

2. Put that file inside the repository directory (so it is accessible to Scala Steward's action).
3. Provide it to the action using `repos-file`:

    ```yaml
    - name: Launch Scala Steward
      uses: scala-steward-org/scala-steward-action@v2
      with:
        github-token: ${{ secrets.ADMIN_GITHUB_TOKEN }}
        repos-file: 'repos.md'
    ```

> This input (if present) will always take precedence over `github-repository`.

### GPG

If you want commits created by Scala Steward to be automatically signed with a GPG key, follow this steps:

1. Generate a new GPG key following [Github's own tutorial](https://help.github.com/en/github/authenticating-to-github/generating-a-new-gpg-key).
2. Add your new GPG key to your [user's Github account](https://github.com/settings/keys) following [Github's own tutorial](https://help.github.com/en/github/authenticating-to-github/adding-a-new-gpg-key-to-your-github-account).
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

7. Tell Scala Steward to sign commits using the `sign-commits` input, and to use commit author details from the imported private key:

    ```yaml
    - name: Launch Scala Steward
      uses: scala-steward-org/scala-steward-action@v2
      with:
        github-token: ${{ secrets.ADMIN_GITHUB_TOKEN }}
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
    github-token: ${{ secrets.ADMIN_GITHUB_TOKEN }}
    ignore-opts-files: false
```

## Credit

All the credit goes to [fthomas](https://github.com/fthomas) for creating such an awesome tool as Scala Steward

## License

Scala Steward Action is licensed under the Apache License, Version 2.0.
