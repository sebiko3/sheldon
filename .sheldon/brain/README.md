# Sheldon brain

Auto-generated from `.sheldon/brain/entries.jsonl`. Do not edit by hand — use the `brain_observe` MCP tool or `/sheldon:brain-learn`.

## Project conventions

Project-specific facts Sheldon has learned while working here (build tools, test runners, style rules, layout).

- **missions-dir-gitignored** [high] _(evidence: 01KRCR9GG78PM3KNHZ0JSPQC2Z)_
  The plugin repo .gitignore lists .missions/ — per-mission state files (state.json, contract.md, handoffs/, validations/) live only in the working tree and never get committed. Mission artifacts on the mission branch are limited to the actual deliverables (scripts/, skills/, README.md, etc.). Do not git add .missions/<id>/ during the worker phase.

- **comments** [high]
  Default to writing no comments. Add one only when the WHY is non-obvious (hidden constraint, subtle invariant, workaround for a specific bug).

- **tests** [high]
  mcp/missions-server uses vitest. Spec files live under src/__tests__/*.test.ts and run via npm test --workspace mcp/missions-server.

- **agents:protected-files** [high]
  Cowork loop never modifies settings.json, .claude-plugin/plugin.json, or node_modules/. The brain inherits the same default: propose changes via missions, do not auto-edit.

- **build** [high]
  mcp/missions-server is built with tsc -p tsconfig.json. Run npm run build --workspace mcp/missions-server before declaring TypeScript changes complete.

- **agents:protected-signatures** [high]
  Do not mutate signatures of mcp/missions-server/src/schema.ts or src/tools.ts (existing exported handlers/schemas). Adding new files, new exports, and new tool registrations is fine; changing existing ones breaks downstream callers.

- **language** [high]
  Use TypeScript when possible. Plain JS modules are not added; existing JS is acceptable to leave alone.

## Lessons

Meta-rules distilled from past mission outcomes — apply these to future contracts and implementations.

- **fuse:unlink-prohibited** [high] _(evidence: 01KRCR9GG78PM3KNHZ0JSPQC2Z)_
  The cowork session mounts /Users/.../code/sheldon via virtiofs/FUSE with default_permissions, which allows write+rename but prohibits unlink for files created by other sandboxes (and sometimes for files created by git within the same sandbox). Git commands that need to remove .git/index.lock, .git/HEAD.lock, or tmp_obj_* fail with Operation not permitted, leaving stale locks. Workaround: wrap git invocations in a script that python-renames any stale .git/*.lock files out of the way before and after each call. checkout/restore that need to remove worktree files also fail; merging via low-level commit-tree + update-ref + manual .git/HEAD write is reliable.

- **cowork:concurrency** [high] _(evidence: 01KRCR9GG78PM3KNHZ0JSPQC2Z)_
  Two cowork sessions can race past Step 1 if they both survey state within the same few seconds — both will see zero non-terminal missions and proceed. The second-to-mark mission is wasted work. Mitigation: add a singleton-guard check at the very top of the routine that re-checks .missions/*/state.json for a non-terminal mission younger than ~10 minutes and exits with skip if found. ULID order is the natural tie-breaker (older ULID wins).

- **yaml-frontmatter** [high]
  Contract YAML frontmatter descriptions containing the substring `: ` must be double-quoted; gray-matter parsing fails silently otherwise and run_assertions returns empty.

- **skill-attribution** [high]
  Attribution for ported skills lives in README.md, not in SKILL.md footers. Trailing metadata inside a skill body competes with its instructions for the model attention and degrades skill performance.

- **subagent-permissions** [high]
  Subagent MCP tool calls require explicit allow-list entries in the agent frontmatter tools list. Missing entries cause tool_use to be silently dropped — the subagent appears to skip the call with no error.

## Agent improvements

Proposed or applied tweaks to `agents/*.md`. Workers/Validators should not auto-apply; the Orchestrator promotes these into missions.

- **agent:orchestrator** [medium] _(evidence: 01KRCR9GG78PM3KNHZ0JSPQC2Z)_
  After writing a draft contract and before calling write_contract, the Orchestrator should run /sheldon:contract-lint on the draft and refuse to proceed on a non-zero exit. This mechanically enforces the yaml-frontmatter lesson and the no-zero-executable-assertions invariant, instead of trusting the Orchestrator to remember both. Promote to a mission that edits agents/orchestrator.md once contract-lint is settled.

## Capability proposals

Net-new capabilities (skills, hooks, scripts, agents) the brain has identified as worth shipping. Fed into the cowork loop.

- **cowork:singleton-guard** [high] _(evidence: 01KRCR9GG78PM3KNHZ0JSPQC2Z)_
  Ship a scripts/cowork-singleton-check.py helper invoked at Step 1 of the hourly routine: scans .missions/*/state.json for any mission in a non-terminal phase whose created_at is within --max-age-minutes (default 10). Exit 0 = no peer detected, exit 2 = skip-signal. Routine treats exit 2 as a clean skip with reason=concurrent-run. Prevents the race observed at 2026-05-12T00:11Z (two sessions both picked /sheldon:contract-lint, one was wasted, one struggled with git lock contention on FUSE).
