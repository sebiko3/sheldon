# Sheldon brain

Auto-generated from `.sheldon/brain/entries.jsonl`. Do not edit by hand — use the `brain_observe` MCP tool or `/sheldon:brain-learn`.

## Project conventions

Project-specific facts Sheldon has learned while working here (build tools, test runners, style rules, layout).

- **mission-state-json:validation-tallies** [high] _(evidence: 01KRDG9FQ1RDVNWCV0EFKW1BCJ)_
  .missions/<id>/state.json validation_runs[] contains verdict pre-extracted by the orchestrator. Scripts reading mission outcomes can use it as the authoritative tally source — no need to also parse validations/*.md, which contain only the findings prose.

- **orchestrator:lint-before-write** [high] _(evidence: 01KRDG1DKFK3W5F2EAMZCXY8W4)_
  When writing a contract, the Orchestrator writes the draft to .missions/<id>/contract.md, runs python3 ${CLAUDE_PLUGIN_ROOT:-.}/scripts/contract-lint.py on it via Bash, and refuses to proceed to write_contract if it exits non-zero. This is now codified in agents/orchestrator.md step 5 of the /sheldon:mission-new flow.

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

- **epic-promote:dirty-tree** [high] _(evidence: 01KRDF1MCBK80KMCM2BXPSE9M3)_
  mcp__plugin_sheldon_missions__epic_promote_issue branches the new mission off main and THEN flips the issue status to promoted in .epics/<epic>/epic.md, leaving that file dirty on the mission branch without an entry in touched.list. Worker handoff refuses with contamination error. Mitigation: as Orchestrator, commit the epic.md edit on the mission branch BEFORE calling handoff (it is legitimate mission state — the promotion is the point of the mission). The gray-matter serializer reformats the YAML into folded block scalars, which is cosmetic but expected.

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

_(none yet)_

## Capability proposals

Net-new capabilities (skills, hooks, scripts, agents) the brain has identified as worth shipping. Fed into the cowork loop.

- **mission-retro:full-handoff-paragraph** [medium] _(evidence: 01KRDG9FQ1RDVNWCV0EFKW1BCJ)_
  scripts/mission-retro.py summarise_handoffs() extracts only the first paragraph of each handoff. When handoffs begin with a bare title line (e.g., "# Worker handoff — ID"), the synthesis field shows only that title. Improve by skipping leading heading-only paragraphs or by extracting from the first prose paragraph. Caught on mission 01KRDG9FQ1RDVNWCV0EFKW1BCJ.

- **cowork-singleton-check:parse_iso-non-string** [medium] _(evidence: 01KRDF1MCBK80KMCM2BXPSE9M3)_
  scripts/cowork-singleton-check.py parse_iso() crashes with AttributeError when state.json has a non-string created_at (e.g., integer timestamp), producing exit 1 + traceback. Add an isinstance(ts, str) guard. Caught by validator on mission 01KRDF1MCBK80KMCM2BXPSE9M3 — non-blocking, but worth a 1-line follow-on.

- **cowork-singleton-check:negative-max-age** [medium] _(evidence: 01KRDF1MCBK80KMCM2BXPSE9M3)_
  scripts/cowork-singleton-check.py accepts negative --max-age-minutes silently; the cutoff moves into the future and the guard becomes a no-op. Add a > 0 argparse validator. Caught by validator on mission 01KRDF1MCBK80KMCM2BXPSE9M3.

- **cowork:singleton-guard** [high] _(evidence: 01KRCR9GG78PM3KNHZ0JSPQC2Z)_
  Ship a scripts/cowork-singleton-check.py helper invoked at Step 1 of the hourly routine: scans .missions/*/state.json for any mission in a non-terminal phase whose created_at is within --max-age-minutes (default 10). Exit 0 = no peer detected, exit 2 = skip-signal. Routine treats exit 2 as a clean skip with reason=concurrent-run. Prevents the race observed at 2026-05-12T00:11Z (two sessions both picked /sheldon:contract-lint, one was wasted, one struggled with git lock contention on FUSE).
