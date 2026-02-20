#!/usr/bin/env bash
set -euo pipefail

# PAI-16 gate: fail when a changeset contains only documentation/notes files.
# Intended for PR validation and release-gate sanity checks.

BASE_REF="${1:-origin/develop}"
HEAD_REF="${2:-HEAD}"

# Safety policy: never auto-unblock release gates for PAI-16.
# Any unblock must be done manually by jhyou.
if [[ "${PAI16_AUTO_UNBLOCK:-0}" == "1" ]]; then
  echo "[PAI-16] FAIL: auto-unblock is prohibited by policy."
  echo "[PAI-16] action required: jhyou must perform manual unblock."
  exit 1
fi

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
