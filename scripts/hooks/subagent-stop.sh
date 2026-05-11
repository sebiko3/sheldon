#!/bin/bash
# sheldon SubagentStop hook: lightweight observability for now.
# Logs subagent exits to .missions/.hook-log so we can correlate with state
# transitions during debugging. The MCP server is the authoritative driver of
# phase transitions (worker/validator call handoff/validate); this hook does
# not enforce anything in slice 1.

set -euo pipefail

input="$(cat)"
log_dir="${SHELDON_REPO_ROOT:-$PWD}/.missions"
mkdir -p "$log_dir"
ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
agent_type="$(printf '%s' "$input" | /usr/bin/env jq -r '.agent_type // .subagent_type // "unknown"' 2>/dev/null || echo unknown)"
printf '[%s] SubagentStop agent=%s\n' "$ts" "$agent_type" >> "$log_dir/.hook-log"
exit 0
