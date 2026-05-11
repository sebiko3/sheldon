#!/bin/bash
# sheldon PostToolUse hook: record file paths the active Worker writes/edits
# into .missions/<active>/touched.list. The MCP server uses this on handoff
# to detect contamination (files modified outside the worker's tool log).
#
# Records only when:
#   - tool is Write, Edit, or MultiEdit
#   - the call comes from inside a subagent (parent_tool_use_id non-empty)
#   - .missions/.active.json exists AND role == "worker"
# Validator writes are blocked by tool allowlist already; if any slip through
# they're ignored here (validator should not modify the tree).

set -euo pipefail

input="$(cat)"
tool_name="$(printf '%s' "$input" | /usr/bin/env jq -r '.tool_name // empty' 2>/dev/null || true)"

case "$tool_name" in
  Write|Edit|MultiEdit) ;;
  *) exit 0 ;;
esac

parent_id="$(printf '%s' "$input" | /usr/bin/env jq -r '.parent_tool_use_id // empty' 2>/dev/null || true)"
[ -z "$parent_id" ] && exit 0

file_path="$(printf '%s' "$input" | /usr/bin/env jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"
[ -z "$file_path" ] && exit 0

repo_root="${SHELDON_REPO_ROOT:-$PWD}"
active_file="$repo_root/.missions/.active.json"
[ -f "$active_file" ] || exit 0

mission_id="$(/usr/bin/env jq -r '.mission_id // empty' "$active_file" 2>/dev/null || true)"
role="$(/usr/bin/env jq -r '.role // empty' "$active_file" 2>/dev/null || true)"
[ -n "$mission_id" ] || exit 0
[ "$role" = "worker" ] || exit 0

mission_dir="$repo_root/.missions/$mission_id"
mkdir -p "$mission_dir"
printf '%s\n' "$file_path" >> "$mission_dir/touched.list"

exit 0
