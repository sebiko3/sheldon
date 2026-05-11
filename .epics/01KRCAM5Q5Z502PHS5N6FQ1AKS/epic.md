---
id: 01KRCAM5Q5Z502PHS5N6FQ1AKS
brief: "investigate why validator subagents never load MCP tools despite correct configuration"
created_at: "2026-05-11T20:11:58.000Z"
issues:
  - id: 1
    title: "Commit a project-level .claude/settings.json allow-listing all 17 plugin MCP tools"
    rationale: "Today only the gitignored per-user .claude/settings.local.json carries the allow list, so every new contributor hits the silent-suppression wall. A committed project-level settings.json fixes the out-of-the-box subagent experience without touching plugin internals."
    acceptance_sketch:
      - ".claude/settings.json exists in the repo root and is tracked by git"
      - "Its permissions.allow array contains all 17 mcp__plugin_sheldon_missions__* tool names that match those registered in mcp/missions-server/src/index.ts"
      - "A fresh clone (no settings.local.json) can run /sheldon:mission-new through validate+merge without permission errors"
      - ".gitignore does NOT exclude .claude/settings.json (only settings.local.json)"
    status: proposed
    promoted_mission_id: null
  - id: 2
    title: "Declare required subagent permissions inside .claude-plugin/plugin.json"
    rationale: "Even a committed project-level settings.json only helps users running sheldon from this repo. To make the plugin self-sufficient when installed elsewhere via claude --plugin-dir, the plugin manifest itself should declare the MCP tool permissions its bundled subagents need."
    acceptance_sketch:
      - ".claude-plugin/plugin.json gains a permissions (or equivalent) field that pre-allows the 17 plugin tools"
      - "Manual verification: installing the plugin into an empty test project lets the worker/validator subagents call MCP tools without per-user allow-list edits"
      - "Schema validation passes (Claude Code does not warn about unknown plugin.json fields)"
    status: proposed
    promoted_mission_id: null
  - id: 3
    title: "Add a sheldon-doctor diagnostic command that detects missing subagent permissions"
    rationale: "Even with project-level defaults, contributors may drift or overwrite settings. A `/sheldon:doctor` (or `npm run doctor`) command that cross-references registered MCP tools against the active allow list catches the failure mode upfront instead of mid-validation."
    acceptance_sketch:
      - "New skill or script that reads the 17 tool names from the MCP server (or a generated manifest) and compares against the merged settings.json + settings.local.json allow list"
      - "Prints a clear diff: 'Missing: mcp__plugin_sheldon_missions__validate' with a one-line copy-paste fix"
      - "Exits non-zero when the allow list is incomplete; zero when complete"
      - "Documented in README under 'Troubleshooting'"
    status: proposed
    promoted_mission_id: null
  - id: 4
    title: "Document the subagent permissions gotcha in README and walkthrough"
    rationale: "The root cause is invisible (silent tool_use suppression). A short, scannable section in README + docs/walkthrough.md telling contributors what to check first when 'validation_runs stays []' saves hours per occurrence."
    acceptance_sketch:
      - "README gains a 'Troubleshooting / Subagent permissions' subsection with at least one paragraph and a code snippet of the allow list"
      - "docs/walkthrough.md links to that section from the validator step"
      - "The section references issue 1's committed settings.json so the doc lines up with the shipped fix"
    status: proposed
    promoted_mission_id: null
  - id: 5
    title: "Generate the MCP tool allow list from the server registration to prevent drift"
    rationale: "Today the 17 tool names live in three places (mcp/missions-server/src/index.ts, .claude/settings.local.json, and any future committed settings.json). A small build script that emits the allow list from a single source of truth eliminates the 'we added epic_promote_issue but forgot to allow it' failure mode."
    acceptance_sketch:
      - "scripts/ (or mcp/missions-server/scripts/) contains a generator that lists all registered tools from index.ts (or a small manifest module)"
      - "The generator can write/update the permissions.allow array in .claude/settings.json"
      - "npm run build (or a dedicated npm run gen:permissions) wires it in, and the result is idempotent"
      - "A vitest spec asserts: 'every server.registerTool call has a matching allow entry'"
    status: proposed
    promoted_mission_id: null
  - id: 6
    title: "Add a lint check that subagent tools: frontmatter uses fully-qualified mcp__plugin_sheldon_missions__* names"
    rationale: "Renaming from mcp__missions__* to the fully-qualified plugin form was a prerequisite of the fix. Without a lint, a future agent file edit could silently regress to the short form (which Claude Code accepts in narration but never resolves), reintroducing the bug."
    acceptance_sketch:
      - "Script or vitest spec scans agents/*.md frontmatter and fails on any mcp__missions__* (non-qualified) reference"
      - "Same lint also fails if an agent declares an MCP tool that is not actually registered by the server"
      - "Wired into CI / npm test so PRs catch regressions"
    status: proposed
    promoted_mission_id: null
---

# Epic 01KRCAM5Q5Z502PHS5N6FQ1AKS

## Brief

> investigate why validator subagents never load MCP tools despite correct configuration

## Root cause (already established — see project memory)

When a Sheldon Worker or Validator subagent attempts to invoke an MCP tool such as `mcp__plugin_sheldon_missions__validate`, Claude Code's auto-mode permission classifier checks the tool name against the merged `permissions.allow` list from `.claude/settings.json` + `.claude/settings.local.json`. If the tool is not allow-listed, the `tool_use` block is silently filtered before emission — the subagent narrates "I will now call validate" and ends its turn with no error surface. The mission ends up stuck in `validating` with `validation_runs: []`.

The orchestrator (main thread) is unaffected because auto-mode evaluates its calls with full session context and can prompt interactively. Subagents have no interactive surface, so dropped calls are invisible.

## Current state (verified)

- **`.claude/settings.local.json`** exists and correctly allow-lists all 17 `mcp__plugin_sheldon_missions__*` tools. However this file is per-user and gitignored — it does not protect new contributors.
- **`.claude/settings.json`** does NOT exist. There is no committed, project-level allow list.
- **`.claude-plugin/plugin.json`** is minimal (`name`, `description`, `version`, `author`). It declares no permissions, so installing the plugin elsewhere via `claude --plugin-dir` yields the same broken-by-default subagent behaviour.
- **`agents/orchestrator.md`, `agents/worker.md`, `agents/validator.md`, `agents/epic-planner.md`** all use the fully-qualified `mcp__plugin_sheldon_missions__*` form in their `tools:` frontmatter. This is correct but not enforced — a future edit could regress.
- **17 MCP tools registered** in `mcp/missions-server/src/index.ts`: `create`, `read`, `list`, `write_contract`, `approve`, `handoff`, `start_validation`, `validate`, `reopen`, `merge`, `abort`, `run_assertions`, `diff`, `epic_create`, `epic_read`, `epic_list`, `epic_promote_issue`. The local allow list matches exactly.
- **`README.md` and `docs/walkthrough.md`** make no mention of permissions or `settings.local.json`. A contributor hitting silent suppression has no documented entry point for diagnosis.

## Decomposition rationale

Six issues, each independently shippable:

1. **Ship a project-level `.claude/settings.json`** — the smallest, most direct fix. Solves the "every new contributor hits the wall" problem for anyone working in this repo.
2. **Declare permissions in `plugin.json`** — solves the same problem for users who install the plugin via `claude --plugin-dir` from outside this repo. Complementary to issue 1, not redundant.
3. **A `sheldon-doctor` diagnostic** — defence in depth. Detects the failure mode before mission start instead of after a silent validator stall.
4. **Documentation in README + walkthrough** — cheapest possible mitigation; pairs with issues 1 and 3 so the docs match shipped behaviour.
5. **Generate the allow list from server registration** — prevents future drift when the 18th tool is added. Single source of truth.
6. **Lint that agent frontmatter uses the fully-qualified form** — prevents the *other* prerequisite regression (short-form `mcp__missions__*` names that never resolve in subagents).

Each issue is independently promotable. Suggested ordering for highest impact: 1 → 4 → 3 → 5 → 6 → 2 (issue 2 last because the plugin.json permissions field shape may need investigation against Claude Code's plugin schema before implementation).
