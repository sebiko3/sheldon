#!/bin/bash
# sheldon PreToolUse hook: block Write/Edit on protected mission files when the
# call originates from a subagent (worker/validator). The Orchestrator (main
# thread) is allowed.
#
# Hook input arrives on stdin as JSON: { tool_name, tool_input, parent_tool_use_id, ... }
# - parent_tool_use_id is non-null/non-empty when the call comes from inside a subagent.
# - Output JSON to stdout with hookSpecificOutput.permissionDecision = "deny"
#   to block; or exit 0 with no output to allow.

set -euo pipefail

input="$(cat)"

# Extract file path from tool input. Both Write and Edit use `file_path`.
file_path="$(printf '%s' "$input" | /usr/bin/env jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"

# Whether we're inside a subagent.
parent_id="$(printf '%s' "$input" | /usr/bin/env jq -r '.parent_tool_use_id // empty' 2>/dev/null || true)"

# Allow everything from the main thread (Orchestrator).
if [ -z "$parent_id" ]; then
  exit 0
fi

# Protected paths: anything under .missions/ matching contract.md or state.json.
case "$file_path" in
  *".missions/"*"/contract.md"|*".missions/"*"/state.json")
    /usr/bin/env jq -n \
      --arg path "$file_path" \
      '{
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: ("sheldon: subagents (Worker/Validator) cannot modify protected mission files. Path blocked: " + $path + ". Use the missions MCP tools instead.")
        }
      }'
    exit 0
    ;;
esac

exit 0
