#!/usr/bin/env bash
# Helper script to push MrudugandhaAppServices code to GitHub
# Usage:
#   ./scripts/push-to-github.sh YOUR_GITHUB_PERSONAL_ACCESS_TOKEN
# Or set env var:
#   GITHUB_TOKEN="ghp_xxx" ./scripts/push-to-github.sh

set -e

TOKEN="${1:-$GITHUB_TOKEN}"

if [ -z "$TOKEN" ]; then
  echo "Error: GitHub Personal Access Token (PAT) not provided."
  echo "Usage: ./scripts/push-to-github.sh <YOUR_GITHUB_TOKEN>"
  echo "Or create a token at: https://github.com/settings/tokens (select 'repo' scope)"
  exit 1
fi

echo "Pushing code to https://github.com/patrahul2020-max/MrudugandhaAppServices.git on branch 'main'..."
git push "https://${TOKEN}@github.com/patrahul2020-max/MrudugandhaAppServices.git" main

echo "Successfully pushed code to MrudugandhaAppServices!"
