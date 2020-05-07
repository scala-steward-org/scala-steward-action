# Scala Steward Github Action

[![Scala Steward badge](https://img.shields.io/badge/Scala_Steward-helping-blue.svg?style=flat&logo=data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAQCAMAAAARSr4IAAAAVFBMVEUAAACHjojlOy5NWlrKzcYRKjGFjIbp293YycuLa3pYY2LSqql4f3pCUFTgSjNodYRmcXUsPD/NTTbjRS+2jomhgnzNc223cGvZS0HaSD0XLjbaSjElhIr+AAAAAXRSTlMAQObYZgAAAHlJREFUCNdNyosOwyAIhWHAQS1Vt7a77/3fcxxdmv0xwmckutAR1nkm4ggbyEcg/wWmlGLDAA3oL50xi6fk5ffZ3E2E3QfZDCcCN2YtbEWZt+Drc6u6rlqv7Uk0LdKqqr5rk2UCRXOk0vmQKGfc94nOJyQjouF9H/wCc9gECEYfONoAAAAASUVORK5CYII=)](https://scala-steward.org)

A Github Action to launch [Scala Steward](https://github.com/fthomas/scala-steward) in your repository.

<p align="center">
  <a href="https://github.com/fthomas/scala-steward" target="_blank">
    <img src="https://github.com/fthomas/scala-steward/raw/master/data/images/scala-steward-logo-circle-0.png" height="180px">
  </a>
</p>

## What does this action do?

When added, this action will launch [Scala Steward](https://github.com/fthomas/scala-steward) on your own repository and create PRs to update your Scala dependencies using your own user:

![](./data/images/example-pr.png)

## Usage

Create a new `.github/workflows/scala-steward.yml` file:

```yaml
# This workflow will launch at 00:00 every Sunday
on:
  schedule:    
    - cron:  '0 0 * * 0'

jobs:
  scala-steward:
    runs-on: ubuntu-latest
    name: Launch Scala Steward
    steps:
      - name: Launch Scala Steward
        uses: alejandrohdezma/scala-steward-action@v1
        with:
          github-repository: owner/repo
          github-token: ${{ secrets.ADMIN_GITHUB_TOKEN }}
          gpg-secret-key: ${{ secrets.GPG_SCALA_STEWARD }}
```

If you want to be able to trigger the action manually, you can add a `repository_dispatch` event:

```yaml
on:
  schedule:    
    - cron:  '0 0 * * 0'
  repository_dispatch:
    types: [scala-steward]
```

Finally, call the trigger from your local machine with:

```bash
# Change `owner/repo` to your own repository
curl -d "{\"event_type\": \"scala-steward\"}" \
    -H "Content-Type: application/json" \
    -H "Authorization: token ${GITHUB_TOKEN}" \
    "https://api.github.com/repos/owner/repo/dispatches"
```

> Remember to have a valid github token exported as GITHUB_TOKEN in your local environment:
> ```bash
> export GITHUB_TOKEN="your_github_token"
> ```

## Configuration

### Repository

The `github-repository` setting isn't required if the workflow launches from the same repository that you wish to update.

Otherwise, set it to the name of the repository to update in the form `owner/repository`.

### Github Token

1. You will need to generate a [Github Personal Access Token](https://github.com/settings/tokens).
2. Add it as a secret repository.
3. Provide it to the action using `github-token`.

### GPG

1. Create a fresh GPG key:

    ```bash
    gpg --gen-key
    ```

    > :exclamation: Do not add a passphrase to the GPG key, since you won't be able to add it when Scala Steward writes a commit.

2. Annotate the key ID from the previous command.
3. Export the base64 encoded secret of your private key to the clipboard:
    
    ```bash
    # macOS
    gpg --armor --export-secret-keys $LONG_ID | base64 | pbcopy
    # Ubuntu (assuming GNU base64)
    gpg --armor --export-secret-keys $LONG_ID | base64 -w0 | xclip
    # Arch
    gpg --armor --export-secret-keys $LONG_ID | base64 | sed -z 's;\n;;g' | xclip -selection clipboard -i
    # FreeBSD (assuming BSD base64)
    gpg --armor --export-secret-keys $LONG_ID | base64 | xclip
    ```
4. Add it as a new `GPG_SCALA_STEWARD` repository secret.
5. Provide it to the action using `gpg-secret-key`.
6. Add your GPG key to the [user's Github Account](https://github.com/settings/keys)

## Credit

All the credit goes to [fthomas](https://github.com/fthomas) for creating such an awesome tool as Scala Steward

## License

Scala Steward Action is licensed under the Apache License, Version 2.0.
