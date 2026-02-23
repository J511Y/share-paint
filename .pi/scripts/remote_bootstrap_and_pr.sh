#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./remote_bootstrap_and_pr.sh --check
#   ./remote_bootstrap_and_pr.sh --apply --remote-url git@github.com:OWNER/REPO.git
#   REMOTE_URL=https://github.com/OWNER/REPO.git ./remote_bootstrap_and_pr.sh --apply

MODE="check"
REMOTE_NAME="origin"
REMOTE_URL="${REMOTE_URL:-}"
BASE_BRANCH="develop"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check)
      MODE="check"
      shift
      ;;
    --apply)
      MODE="apply"
      shift
      ;;
    --remote-name)
      REMOTE_NAME="${2:?missing value for --remote-name}"
      shift 2
      ;;
    --remote-url)
      REMOTE_URL="${2:?missing value for --remote-url}"
      shift 2
      ;;
    --base)
      BASE_BRANCH="${2:?missing value for --base}"
      shift 2
      ;;
    -h|--help)
      sed -n '1,16p' "$0"
      exit 0
      ;;
    *)
      echo "[bootstrap] unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

branch="$(git rev-parse --abbrev-ref HEAD)"
head="$(git rev-parse --short HEAD)"
remote_count="$(git remote | wc -l | tr -d ' ')"

echo "[bootstrap] mode=$MODE"
echo "[bootstrap] branch=$branch head=$head"
echo "[bootstrap] remotes($remote_count):"
git remote -v || true

if [[ "$branch" == hotfix/* ]]; then
  BASE_BRANCH="main"
fi

echo "[bootstrap] PR base branch policy => $BASE_BRANCH"

if [[ "$MODE" == "check" ]]; then
  if [[ "$remote_count" -eq 0 ]]; then
    echo "[bootstrap] ACTION REQUIRED: no remote configured."
    echo "[bootstrap] rerun with --apply --remote-url <git-url>"
  else
    echo "[bootstrap] remote already configured."
  fi
  exit 0
fi

if [[ -z "$REMOTE_URL" ]]; then
  echo "[bootstrap] --remote-url (or REMOTE_URL env) is required in --apply mode" >&2
  exit 2
fi

if git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  current_url="$(git remote get-url "$REMOTE_NAME")"
  echo "[bootstrap] remote '$REMOTE_NAME' already exists: $current_url"
else
  echo "[bootstrap] adding remote '$REMOTE_NAME' => $REMOTE_URL"
  git remote add "$REMOTE_NAME" "$REMOTE_URL"
fi

echo "[bootstrap] pushing branch to remote"
git push -u "$REMOTE_NAME" "$branch"

repo_path=""
if [[ "$REMOTE_URL" =~ github.com[:/]([^/]+)/([^/.]+)(\.git)?$ ]]; then
  owner="${BASH_REMATCH[1]}"
  repo="${BASH_REMATCH[2]}"
  repo_path="$owner/$repo"
fi

if [[ -n "$repo_path" ]]; then
  compare_url="https://github.com/$repo_path/compare/$BASE_BRANCH...$branch?expand=1"
  echo "[bootstrap] compare URL: $compare_url"
  echo "[bootstrap] PR URL can be created from compare page above"
else
  echo "[bootstrap] pushed. open your git host and create PR: $BASE_BRANCH <- $branch"
fi

echo "[bootstrap] done"
