#!/bin/bash

# Don't start if we can't reach Maven Central.
curl -sf https://repo1.maven.org/maven2/ >/dev/null || {
  echo 'ERROR: Unable to connect to Maven Central'
  exit 1
}

# Don't start if github-token is empty
[ -z "$2" ] && {
  echo 'ERROR: github-token is empty'
  exit 1
}

# Don't start if gpg-secret-key is empty
[ -z "$3" ] && {
  echo 'ERROR: gpg-secret-key is empty'
  exit 1
}

# Extract authenticated user information from Github API
currentUser=$(curl -sSf -H "Authorization: token $2" https://api.github.com/user)
login=$(echo "$currentUser" | jq .login)
email=$(echo "$currentUser" | jq .email)
name=$(echo "$currentUser" | jq .name)

# Don't start if any of the current user information is missing
[ -z "$login" ] && {
  echo 'Unable to get the login for the current authenticated user'
  exit 1
}

[ -z "$email" ] && {
  echo 'Unable to get the email for the current authenticated user. Go to https://github.com/settings/profile and ensure you have it set up.'
  exit 1
}

[ -z "$name" ] && {
  echo 'Unable to get the name for the current authenticated user. Go to https://github.com/settings/profile and ensure you have it set up.'
  exit 1
}

mkdir -p /opt/scala-steward

if [ -z "$1" ]; then
  # Create repos.md file with the contents of repository input
  echo "Using Github Actions repository"
  echo "- $GITHUB_REPOSITORY" >/opt/scala-steward/repos.md
else
  # Fallback to current Github Action repository if not provided
  echo "Setting github repository to $1"
  echo "- $1" >/opt/scala-steward/repos.md
fi

# Store Github Personal Access Token in an executable file (as requested by steward)
echo -e "#!/bin/sh\n\necho '$2'" >/opt/scala-steward/askpass.sh
chmod +x /opt/scala-steward/askpass.sh

# Add GPG secret key
echo -e "$3" | base64 -d | gpg --import | grep '^gpg: key'
read -r signingkey <<<"$(gpg --with-colons --list-secret-keys --keyid-format LONG | grep '^sec:-:4096:1:' | cut -d: -f5)"
git config --global user.signingkey "$signingkey"

/opt/docker/bin/scala-steward \
  --workspace "/opt/scala-steward/workspace" \
  --repos-file "/opt/scala-steward/repos.md" \
  --git-ask-pass "/opt/scala-steward/askpass.sh" \
  --git-author-email "$email" \
  --git-author-name "$name" \
  --vcs-login "$login" \
  --ignore-opts-files \
  --do-not-fork \
  --env-var "SBT_OPTS=-Xmx2048m -Xss8m -XX:MaxMetaspaceSize=512m" \
  --disable-sandbox \
  --process-timeout 20min \
  --whitelist "$HOME"/.cache/coursier \
  --whitelist "$HOME"/.cache/JNA \
  --whitelist "$HOME"/.ivy2 \
  --whitelist "$HOME"/.sbt \
  --whitelist "$HOME"/.scio-ideaPluginIC \
  --whitelist "$HOME"/.tagless-redux-ijextPluginIC \
  --whitelist "$JAVA_HOME" \
  --read-only "$JAVA_HOME" \
  --sign-commits
