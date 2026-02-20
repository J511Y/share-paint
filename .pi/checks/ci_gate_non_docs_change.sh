#!/usr/bin/env bash
set -euo pipefail

# PAI-16 gate: fail when a changeset contains only documentation/notes files.
# Intended for PR validation and release-gate sanity checks.

BASE_REF="${1:-origin/develop}"
HEAD_REF="${2:-HEAD}"

# Safety policy: never auto-unblock release gates for PAI-16.
# Any unblock must be done manually by jhyou.
is_truthy() {
  local value
  value="$(printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | xargs)"
  case "$value" in
    1|true|yes|on)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

auto_unblock_vars=(
  "PAI16_AUTO_UNBLOCK"
  "RELEASE_GATE_AUTO_UNBLOCK"
  "CI_AUTO_UNBLOCK"
)
for var_name in "${auto_unblock_vars[@]}"; do
  var_value="${!var_name:-0}"
  if is_truthy "$var_value"; then
    echo "[PAI-16] FAIL: auto-unblock is prohibited by policy (${var_name}=${var_value})."
    echo "[PAI-16] action required: jhyou must perform manual unblock."
    exit 1
  fi
done

# Follow-up hardening: reject any truthy env var that semantically means auto-unblock.
# This catches newly introduced aliases without requiring script updates.
while IFS='=' read -r env_name env_value; do
  env_name_upper="$(printf '%s' "$env_name" | tr '[:lower:]' '[:upper:]')"
  if [[ "$env_name_upper" =~ (AUTO_UNBLOCK|AUTOUNBLOCK|UNBLOCK_AUTO|AUTO_RELEASE_GATE|RELEASE_GATE_AUTO) ]]; then
    if is_truthy "$env_value"; then
      echo "[PAI-16] FAIL: auto-unblock alias is prohibited by policy (${env_name}=${env_value})."
      echo "[PAI-16] action required: jhyou must perform manual unblock."
      exit 1
    fi
  fi
done < <(env)

if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "[PAI-16] base ref '$BASE_REF' not found locally."
  echo "[PAI-16] hint: fetch base branch before running this check."
  exit 2
fi

changed_files=()
while IFS= read -r line; do
  changed_files+=("$line")
done < <(git diff --name-only "$BASE_REF...$HEAD_REF")

if [[ ${#changed_files[@]} -eq 0 ]]; then
  echo "[PAI-16] no changed files detected between $BASE_REF and $HEAD_REF"
  exit 1
fi

non_doc_count=0
for f in "${changed_files[@]}"; do
  case "$f" in
    *.md|*.txt|memory/*|docs/*)
      ;;
    *)
      non_doc_count=$((non_doc_count + 1))
      ;;
  esac
done

if [[ $non_doc_count -eq 0 ]]; then
  echo "[PAI-16] FAIL: docs-only change detected. At least one code/pipeline change is required."
  printf '%s\n' "[PAI-16] changed files:" "${changed_files[@]}"
  exit 1
fi

echo "[PAI-16] PASS: non-doc changes detected ($non_doc_count file(s))."
