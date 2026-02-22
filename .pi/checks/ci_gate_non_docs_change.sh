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
  value="$(printf '%s' "$1" | xargs)"
  # Normalize wrappers often seen in CI secrets/vars, e.g. '"true"' or "'yes'".
  while [[ "$value" =~ ^[\"\'].*[\"\']$ ]] && [[ ${#value} -ge 2 ]]; do
    value="${value:1:${#value}-2}"
    value="$(printf '%s' "$value" | xargs)"
  done
  value="$(printf '%s' "$value" | tr '[:upper:]' '[:lower:]')"

  case "$value" in
    1|true|yes|on|y|t)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

# Hardening: CI execution must remain manual-only.
# Reject any non-workflow_dispatch trigger in GitHub Actions.
if [[ "${GITHUB_ACTIONS:-}" == "true" ]]; then
  event_name="${GITHUB_EVENT_NAME:-unknown}"
  if [[ "$event_name" != "workflow_dispatch" ]]; then
    echo "[PAI-16] FAIL: manual-only policy violation (GITHUB_EVENT_NAME=${event_name})."
    echo "[PAI-16] action required: run this gate via workflow_dispatch only."
    exit 1
  fi
  echo "[PAI-16] policy check: manual-only trigger verified (event=${event_name})."
fi

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

# Hardening: manual unblock owner must remain jhyou; reject owner overrides.
while IFS='=' read -r env_name env_value; do
  env_name_upper="$(printf '%s' "$env_name" | tr '[:lower:]' '[:upper:]')"
  if [[ "$env_name_upper" =~ (MANUAL_UNBLOCK_OWNER|UNBLOCK_OWNER|RELEASE_GATE_OWNER|GATE_UNBLOCK_OWNER) ]]; then
    owner_normalized="$(printf '%s' "$env_value" | xargs | tr '[:upper:]' '[:lower:]')"
    if [[ -n "$owner_normalized" ]] && [[ "$owner_normalized" != "jhyou" ]]; then
      echo "[PAI-16] FAIL: manual unblock owner override is prohibited (${env_name}=${env_value})."
      echo "[PAI-16] action required: manual unblock owner must remain jhyou."
      exit 1
    fi
  fi
done < <(env)

# Hardening: block bypass/skip switches for this gate.
# Policy requires gate enforcement + manual unblock by jhyou only.
while IFS='=' read -r env_name env_value; do
  env_name_upper="$(printf '%s' "$env_name" | tr '[:lower:]' '[:upper:]')"
  if [[ "$env_name_upper" =~ (PAI16|PAI_16|RELEASE_GATE|CI_GATE) ]] && [[ "$env_name_upper" =~ (SKIP|BYPASS|DISABLE) ]] && [[ "$env_name_upper" =~ (GATE|CHECK|BLOCK) ]]; then
    if is_truthy "$env_value"; then
      echo "[PAI-16] FAIL: gate bypass switch is prohibited (${env_name}=${env_value})."
      echo "[PAI-16] action required: keep gate enabled; manual unblock remains jhyou-only."
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
  f_lower="$(printf '%s' "$f" | tr '[:upper:]' '[:lower:]')"
  case "$f_lower" in
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
echo "[PAI-16] policy check: manual-only trigger + auto-unblock prohibited; manual unblock owner=jhyou."
