#!/bin/bash
# sheldon PreToolUse hook: advisory scope-creep check before merge.
# Reads the contract.md for the mission being merged and warns to stderr if the
# mission diff touches files outside the contract's stated surface. Exit 0 always.

set -euo pipefail

input="$(cat)"

tool_name="$(printf '%s' "$input" | /usr/bin/env jq -r '.tool_name // empty' 2>/dev/null || true)"

if [ "$tool_name" != "mcp__plugin_sheldon_missions__merge" ]; then
  exit 0
fi

mission_id="$(printf '%s' "$input" | /usr/bin/env jq -r '.tool_input.mission_id // empty' 2>/dev/null || true)"

if [ -z "$mission_id" ]; then
  exit 0
fi

repo_root="${SHELDON_REPO_ROOT:-$PWD}"
contract="$repo_root/.missions/$mission_id/contract.md"

if [ ! -f "$contract" ]; then
  exit 0
fi

if [ -n "${SHELDON_DIFF_FILES:-}" ]; then
  diff_files="$SHELDON_DIFF_FILES"
else
  diff_files="$(git -C "$repo_root" diff --name-only main...HEAD 2>/dev/null || true)"
fi

if [ -z "$diff_files" ]; then
  exit 0
fi

scope_paths="$(grep -oE '[A-Za-z0-9_./-]+\.(py|sh|ts|tsx|md|json|yaml|yml)' "$contract" 2>/dev/null || true)"

raw_dirs="$(grep -oE '(^|[[:space:]])([A-Za-z0-9_/-]+/)' "$contract" 2>/dev/null | sed 's/^[[:space:]]*//' || true)"

scope_dirs=""
while IFS= read -r d; do
  [ -z "$d" ] && continue
  is_file_prefix=0
  while IFS= read -r p; do
    [ -z "$p" ] && continue
    case "$p" in
      "$d"*) is_file_prefix=1; break ;;
    esac
  done <<< "$scope_paths"
  if [ "$is_file_prefix" -eq 0 ]; then
    scope_dirs="${scope_dirs}${d}"$'\n'
  fi
done <<< "$raw_dirs"

while IFS= read -r f; do
  [ -z "$f" ] && continue
  in_scope=0

  while IFS= read -r p; do
    [ -z "$p" ] && continue
    if [ "$f" = "$p" ]; then
      in_scope=1
      break
    fi
  done <<< "$scope_paths"

  if [ "$in_scope" -eq 0 ]; then
    while IFS= read -r d; do
      [ -z "$d" ] && continue
      case "$f" in
        "$d"*) in_scope=1; break ;;
      esac
    done <<< "$scope_dirs"
  fi

  if [ "$in_scope" -eq 0 ]; then
    printf 'sheldon: scope-creep advisory: %s\n' "$f" >&2
  fi
done <<< "$diff_files"

exit 0
