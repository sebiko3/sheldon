#!/bin/bash
# sheldon SubagentStop checkpoint hook: snapshot the in-flight mission state to
# .missions/<id>/checkpoints/<NNN>.json so the Orchestrator can resume after a
# Claude Code crash. Companion to mcp__plugin_sheldon_missions__resume, which
# reads the highest-numbered snapshot and tells the Orchestrator what to do
# next.
#
# Hook input arrives on stdin as JSON (the SubagentStop payload).
# Mission id is resolved in priority order:
#   1. SHELDON_CHECKPOINT_MISSION_ID env (used by the contract's own assertions)
#   2. .mission_id field on stdin
#   3. .missions/.active.json mission_id field
# If none resolve, the script exits 0 silently — hooks MUST NOT block Claude Code.

set -uo pipefail

input="$(cat 2>/dev/null || true)"
repo_root="${SHELDON_REPO_ROOT:-$PWD}"

mission_id="${SHELDON_CHECKPOINT_MISSION_ID:-}"

if [ -z "$mission_id" ] && [ -n "$input" ]; then
  mission_id="$(printf '%s' "$input" | /usr/bin/env jq -r '.mission_id // empty' 2>/dev/null || true)"
fi

if [ -z "$mission_id" ]; then
  active_file="$repo_root/.missions/.active.json"
  if [ -f "$active_file" ]; then
    mission_id="$(/usr/bin/env jq -r '.mission_id // empty' "$active_file" 2>/dev/null || true)"
  fi
fi

# Nothing to checkpoint — exit cleanly.
if [ -z "$mission_id" ]; then
  exit 0
fi

mission_dir="$repo_root/.missions/$mission_id"
state_file="$mission_dir/state.json"

if [ ! -f "$state_file" ]; then
  printf 'sheldon checkpoint: state.json missing for mission %s — skipping\n' "$mission_id" >&2
  exit 0
fi

phase="$(/usr/bin/env jq -r '.phase // "unknown"' "$state_file" 2>/dev/null || echo unknown)"
last_verdict="$(/usr/bin/env jq -r '.validation_runs[-1].verdict // empty' "$state_file" 2>/dev/null || true)"
timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

checkpoints_dir="$mission_dir/checkpoints"
mkdir -p "$checkpoints_dir"

# Monotonic numbering: count existing *.json files and add 1.
existing_count=$(/bin/ls -1 "$checkpoints_dir"/*.json 2>/dev/null | wc -l | tr -d ' ')
next_n=$((existing_count + 1))
padded=$(printf '%03d' "$next_n")
out_file="$checkpoints_dir/$padded.json"

if [ -n "$last_verdict" ]; then
  /usr/bin/env jq -n \
    --arg mission_id "$mission_id" \
    --arg phase "$phase" \
    --arg timestamp "$timestamp" \
    --arg last_validator_verdict "$last_verdict" \
    '{mission_id: $mission_id, phase: $phase, timestamp: $timestamp, last_validator_verdict: $last_validator_verdict}' \
    > "$out_file" 2>/dev/null || true
else
  /usr/bin/env jq -n \
    --arg mission_id "$mission_id" \
    --arg phase "$phase" \
    --arg timestamp "$timestamp" \
    '{mission_id: $mission_id, phase: $phase, timestamp: $timestamp}' \
    > "$out_file" 2>/dev/null || true
fi

exit 0
