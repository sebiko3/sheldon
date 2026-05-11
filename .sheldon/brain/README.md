# Sheldon brain

Auto-generated from `.sheldon/brain/entries.jsonl`. Do not edit by hand — use the `brain_observe` MCP tool or `/sheldon:brain-learn`.

## Project conventions

Project-specific facts Sheldon has learned while working here (build tools, test runners, style rules, layout).

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

_(none yet)_
