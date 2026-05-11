# sheldon walkthrough — running a mission end-to-end

This walks through a real mission with the post-slice-4 system: structured contracts, deterministic `run_assertions`, scope-discipline guards, and the active-mission mutex. Two scenarios — a clean happy path and a forced rejection — show what each phase looks like in practice.

## Prerequisites

- macOS (sheldon is macOS-only).
- Claude Code installed and authenticated against a Pro/Max/Team/Enterprise subscription.
- This repo cloned and built:
  ```bash
  cd /path/to/sheldon
  npm install
  npm run build
  ```
- Sheldon loaded into Claude Code:
  ```bash
  claude --plugin-dir /path/to/sheldon
  ```
- Optionally, in another terminal pane:
  ```bash
  node /path/to/sheldon/tui/dist/index.js --repo .
  ```

## Happy path: add a small utility module

### 1. Kick off the mission

In the Claude Code session:

```
/sheldon:mission-new add cube(n:number):number to mcp/missions-server/src/util.ts plus a vitest spec
```

The Orchestrator (main thread, Opus) runs `mcp__missions__create`, branches `mission/<id>` off main, then drafts a **structured contract** and writes it via `mcp__missions__write_contract`. The contract file ends up at `.missions/<id>/contract.md` and looks something like:

```yaml
---
assertions:
  - id: file-exists
    description: mcp/missions-server/src/util.ts exists and is non-empty
    check: test -s mcp/missions-server/src/util.ts
  - id: export-shape
    description: cube is exported with signature (n: number) => number
    check: grep -E "export function cube\\(n: number\\): number" mcp/missions-server/src/util.ts
  - id: behavior-positive
    description: cube(3) returns 27 when imported at runtime
    check: node --input-type=module -e "import { cube } from './mcp/missions-server/dist/util.js'; if (cube(3) !== 27) process.exit(1)"
  - id: behavior-zero
    description: cube(0) returns 0
    check: node --input-type=module -e "import { cube } from './mcp/missions-server/dist/util.js'; if (cube(0) !== 0) process.exit(1)"
  - id: tests-pass
    description: the new vitest spec passes alongside existing tests
    check: npm test --workspace mcp/missions-server
    timeout: 120
  - id: build-clean
    description: tsc still emits without errors
    check: npm run build:mcp
    timeout: 120
  - id: scope-discipline
    description: only files inside mcp/missions-server are modified
    # no `check:` — manual; validator must confirm via diff
---

# Validation contract — mission 01XYZ…

Goal: add `cube(n: number): number` plus a colocated vitest spec.

## Notes
- `util.ts` is a new file; tests live in `util.test.ts` next to it (vitest default discovery).
- No package.json changes expected (vitest already wired).
```

The Orchestrator returns the mission_id and contract for your review.

### 2. Approve

```
/sheldon:mission-approve
```

This transitions phase `contract_review → implementing`, writes `.missions/.active.json` (the mutex), and spawns the **Worker** subagent with only `mission_id` + a one-line goal in its prompt. The worker reads the contract via MCP, implements on the mission branch, commits atomically. On `mcp__missions__handoff`:

- The **PostToolUse hook** has been recording every `Write`/`Edit`/`MultiEdit` into `.missions/<id>/touched.list`.
- `handoff` reads that list, calls `scopeCheck()`, and refuses if anything dirty in the working tree isn't on the list (slice 3 contamination guard).
- If clean, it stages **only** those files and commits.

Worker's final message is the handoff summary.

### 3. Validation

The Orchestrator calls `mcp__missions__start_validation` (phase → `validating`, mutex transfers to validator) and spawns the **Validator** subagent (Haiku). Validator's first action:

```
mcp__missions__run_assertions({ mission_id: "01XYZ…" })
```

The server reads contract.md, runs every `check:` via `bash -c`, and returns structured results. Example response:

```json
{
  "results": [
    { "id": "file-exists",      "passed": true,  "exit_code": 0,   "duration_ms": 5,   "manual": false, "stdout": "", "stderr": "" },
    { "id": "export-shape",     "passed": true,  "exit_code": 0,   "duration_ms": 8,   "manual": false, "stdout": "export function cube(n: number): number {", "stderr": "" },
    { "id": "behavior-positive","passed": true,  "exit_code": 0,   "duration_ms": 41,  "manual": false, "stdout": "", "stderr": "" },
    { "id": "behavior-zero",    "passed": true,  "exit_code": 0,   "duration_ms": 39,  "manual": false, "stdout": "", "stderr": "" },
    { "id": "tests-pass",       "passed": true,  "exit_code": 0,   "duration_ms": 1742,"manual": false, "stdout": "✓ util.test.ts (2)", "stderr": "" },
    { "id": "build-clean",      "passed": true,  "exit_code": 0,   "duration_ms": 982, "manual": false, "stdout": "", "stderr": "" },
    { "id": "scope-discipline", "passed": null,  "manual": true,   "exit_code": null,  "duration_ms": 0, "stdout": "", "stderr": "" }
  ],
  "summary": { "passed_count": 6, "failed_count": 0, "manual_count": 1 },
  "log_path": "/…/.missions/01XYZ…/validations/001-checks.log"
}
```

The validator then handles `scope-discipline` (the manual one) by reading `mcp__missions__diff` and confirming only `mcp/missions-server/src/util.ts` and `mcp/missions-server/src/util.test.ts` changed. All green → `mcp__missions__validate({ verdict: "pass", findings: "…" })`.

### 4. Merge

Orchestrator calls `mcp__missions__merge` which:
1. Switches to `main`,
2. `git merge --no-ff mission/<id> -m "merge mission/<id>"`,
3. Phase → `done`,
4. Clears `.missions/.active.json` and `touched.list`.

You can verify:
```
git log --oneline -3
# main
# *   merge mission/01XYZ…
# |\
# | * mission 01XYZ…: handoff   (only mcp/missions-server/src/util.ts + util.test.ts)
# | * worker's atomic commits…
# |/
# (previous main HEAD)
```

## Failure path: deliberately incomplete implementation

Suppose the Worker missed the `cube(0)` edge case. After handoff, `run_assertions` returns:

```
"results": [
  { "id": "behavior-zero", "passed": false, "exit_code": 1, ... }
],
"summary": { "passed_count": 5, "failed_count": 1, "manual_count": 1 }
```

Validator records the findings (including the `[FAIL] behavior-zero …` line from the checks log) and calls `validate({ verdict: "fail", findings: ... })`. Phase → `rejected`.

Orchestrator then:
1. `mcp__missions__reopen({ mission_id })` — phase `rejected → implementing`, mutex acquired for the worker again, touched.list cleared.
2. Re-spawns the Worker, injecting the validator's findings verbatim into the prompt.
3. Worker fixes (e.g. corrects the algorithm to handle 0), commits, hands off again.
4. Validator re-runs assertions. This time `failed_count: 0`. Verdict: pass.
5. Merge.

## Contamination path: parallel actor edits a file

While the Worker is running, you (or another Claude Code session, or a hook) accidentally edits `agents/orchestrator.md` outside the worker's tool log. When the Worker calls `handoff`:

```
sheldon: handoff refused — 1 file(s) dirty in the working tree that the Worker never touched via Write/Edit:
  - agents/orchestrator.md

This usually means another actor (a parallel Claude Code session, a hook, a manual edit) modified files during this mission. Fix:
  1. Inspect: git status
  2. Either commit those changes separately on another branch, or revert them.
  3. Then have the Worker re-run handoff.
```

The mutex stays held — no second mission can start until this one resolves. You either:
- `git stash` the unrelated change and have the worker retry,
- or `/sheldon:mission-abort <id>` and start fresh.

## Aborting with branch cleanup

```
/sheldon:mission-abort 01XYZ… mission was poorly scoped --delete-branch
```

The skill invokes `mcp__missions__abort({ mission_id, reason, delete_branch: true })` which:
1. Refuses if `mission/01XYZ…` is currently HEAD (asks you to switch off first).
2. Otherwise runs `git branch -D mission/01XYZ…`.
3. Phase → `aborted`, mutex released, touched.list cleared.

State files under `.missions/01XYZ…/` are preserved for audit.

## Cheat sheet

| File / location | What it is |
|---|---|
| `.missions/<id>/state.json`              | source of truth for phase + handoffs + validation runs |
| `.missions/<id>/contract.md`             | YAML frontmatter (assertions) + markdown body |
| `.missions/<id>/touched.list`            | Worker-touched paths (PostToolUse hook); cleared on approve/reopen |
| `.missions/<id>/handoffs/NNN.md`         | per-handoff summary written by the role exiting |
| `.missions/<id>/validations/NNN.md`      | verdict + findings written by validator |
| `.missions/<id>/validations/NNN-checks.log` | human-readable run_assertions output |
| `.missions/.active.json`                 | mutex marker; one mission at a time |
| `.missions/.hook-log`                    | SubagentStop log (observability) |
