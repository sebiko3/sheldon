# sheldon

A Claude Code plugin that runs **Missions** — a multi-agent workflow with three roles:

- **Orchestrator** (opus): plans the feature, writes a validation contract, drives the loop. Runs as the main Claude Code thread.
- **Worker** (sonnet): implements the feature on a dedicated `mission/<id>` branch, in a fresh-context subagent.
- **Validator** (haiku): adversarially verifies the implementation against the contract, in a fresh-context subagent. Read-only.

Inspired by the "Missions" architecture from Factory.ai's Alvoeiro talk. Serial execution per feature, validation-contract-first, branch-per-mission, fresh worker contexts.

## How it works

```
User: /sheldon:mission-new "add user profile editing"
  │
  ▼
Orchestrator (main thread)
  ├─ creates .missions/<id>/, branches mission/<id>
  ├─ writes contract.md (numbered, executable assertions)
  └─ waits for /sheldon:mission-approve
       │
       ▼
   spawns Worker subagent  ──► implements + commits + missions.handoff(...)
       │
       ▼
   spawns Validator subagent ──► reads contract + diff, runs assertions, missions.validate(...)
       │
       ▼
   pass → merge mission/<id> → main
   fail → re-spawn Worker with findings
```

Mission state lives in plain files under `.missions/<id>/` (state.json, contract.md, handoffs/, validations/) — git-friendly, easy to inspect, easy for the TUI to watch.

## Install

### For users

Clone Sheldon to any directory of your choice, then run `npm install`. The `postinstall` hook builds the MCP server automatically — no separate `npm run build` step is needed.

```bash
git clone https://github.com/your-org/sheldon <sheldon-checkout>
cd <sheldon-checkout>
npm install
claude --plugin-dir <sheldon-checkout>
```

Replace `<sheldon-checkout>` with the actual path where you cloned the repo (e.g. `$HOME/tools/sheldon`).

### For development

```bash
git clone https://github.com/your-org/sheldon $SHELDON_DIR
cd $SHELDON_DIR
npm install        # postinstall builds the MCP server automatically
claude --plugin-dir "$(pwd)"
```

`npm install` is sufficient — the `postinstall` hook compiles the MCP server so there is no need to run `npm run build` separately.

Inside Claude Code:
```
/sheldon:mission-new "your goal here"
```

## Usage

A full mission has six beats. You drive two of them; the agents drive the rest.

1. **You: start a mission.** Run `/sheldon:mission-new "<one-sentence goal>"`. The Orchestrator (the main Claude Code thread) creates `.missions/<id>/`, branches `mission/<id>` off `main`, and asks any clarifying questions it needs to write the validation contract.

2. **Orchestrator: writes the contract.** A YAML frontmatter block listing numbered, executable assertions — each one a `bash -c` one-liner whose exit code 0 means the assertion holds. The contract is the spec; the implementation will be validated against it strictly.

3. **You: approve.** Skim the contract, then run `/sheldon:mission-approve` (or `/sheldon:mission-approve <id>` if you have more than one mission in `contract_review`). This transitions the phase to `implementing` and the Orchestrator spawns the Worker.

4. **Worker: implements.** A fresh-context subagent that only sees the mission id, reads the contract, edits code on `mission/<id>`, commits atomically, and hands off.

5. **Validator: verifies.** Another fresh-context subagent, read-only. Runs every `check:` command from the contract, looks at the diff, and returns either `pass` (everything green) or `fail` with concrete findings. On fail, the Orchestrator re-spawns the Worker once with the findings; a second fail aborts.

6. **Orchestrator: merges.** On `pass`, `mission/<id>` merges into `main` and the brain learns. You're done.

While a mission is running, you can check progress with:

```
/sheldon:mission-status [id]          # phase + diff summary
/sheldon:mission-list                 # everything still in flight
/sheldon:mission-retro <id>           # one-paragraph postmortem (after termination)
```

A few power tools worth knowing:

- `/sheldon:epic-new "<vague brief>"` — when the work is exploratory ("look at this repo and pull useful ideas"), the Epic Planner decomposes it into 3–7 candidate sub-missions you can selectively promote with `/sheldon:epic-promote <epic_id> <issue_id>`.
- `/sheldon:brain-recall [topic]` — surfaces what the brain has learned about this project (conventions, lessons, capability proposals). The Orchestrator and Worker consult it automatically before planning and implementing; you can read it directly too.
- `/sheldon:contract-lint <path>` — lint a draft contract before approval. The Orchestrator runs this automatically; you can run it manually if you're hand-editing a contract.
- `/sheldon:missions-report` — health snapshot of the mission loop (throughput, rework rate, time-to-merge percentiles).
- `bin/sheldon doctor` — diagnose install issues (Node version, MCP server build, plugin manifest, git availability) without launching Claude Code.

For a worked end-to-end example covering the happy path, a validator rejection, a contamination event, and an abort-with-cleanup, see **[docs/walkthrough.md](docs/walkthrough.md)**.

## Slash commands

| Command | What it does |
|---------|--------------|
| `/sheldon:mission-new <goal>` | Orchestrator creates a mission, branches `mission/<id>`, writes a validation contract, and waits for approval. |
| `/sheldon:mission-approve [id]` | Approve the contract → spawn Worker → Validator loop → merge on pass / reopen on fail. |
| `/sheldon:mission-status [id]` | Show mission phase, contract, handoffs, validation runs, and diff summary. |
| `/sheldon:mission-list [--phase=<phase>]` | List all missions, optionally filtered by phase. |
| `/sheldon:mission-abort <id> [reason] [--delete-branch]` | Cancel an in-flight mission (destructive; requires confirmation). |
| `/sheldon:epic-new <brief>` | Decompose a vague brief into 3–7 candidate sub-missions; Epic Planner researches the codebase in parallel and writes `.epics/<id>/epic.md` for review. |
| `/sheldon:epic-list [--status=<status>]` | List all epics and their proposed issues. |
| `/sheldon:epic-promote <epic_id> <issue_id>` | Promote one epic issue into a real mission (creates a mission in `planning` phase). |
| `/sheldon:missions-report` | Print a one-screen health snapshot of the mission loop — phase breakdown, throughput, time-to-merge percentiles, rework + abort rate, recently merged. Pure stdlib Python; safe to run any time. |
| `/sheldon:missions-gc [--days <N>] [--apply]` | List (or delete with `--apply`) stale `mission/<id>` branches whose phase is `aborted`/`done` and `updated_at` is older than `--days` days (default 14). Never deletes the currently checked-out branch. |
| `/sheldon:contract-lint <path>` | Lint a draft mission contract before approval — flags the gray-matter colon-space gotcha, missing executable assertions, duplicate or non-kebab-case ids, and prints assertion counts. Stdlib Python; non-zero exit on errors. |
| `/sheldon:brain-recall [topic]` | Surface what Sheldon has learned about this project — conventions, lessons, agent improvements, and capability proposals from past missions. |
| `/sheldon:brain-learn <mission_id>` | After a mission terminates (merge/abort/twice-fail), distill its contract + handoffs + validations into durable brain entries the next mission inherits. |
| `/sheldon:brain-list` | Dump every active brain entry plus per-type counts; pointer to the human-readable digest at `.sheldon/brain/README.md`. |
| `/sheldon:brain-dedup [--threshold <float>] [--type <type>]` | Scan the brain for near-duplicate entries within each type group and report candidate pairs above the overlap threshold (default 0.6). Read-only; to retire a duplicate use `brain_observe` with `supersedes`. |
| `/sheldon:mission-retro <mission_id>` | Print a one-paragraph narrative postmortem for a terminated mission — what was built, validator outcome, time-to-terminal. |

## The brain: how Sheldon learns

Sheldon keeps a small persistent learning layer at `.sheldon/brain/` (per project, JSONL-backed). It stores four kinds of entries:

- **Conventions** — project-specific facts (build tool, test runner, style rules, file layout).
- **Lessons** — meta-rules distilled from past mission failures or near-misses (e.g., "quote contract YAML descriptions containing `: `").
- **Capability proposals** — net-new skills/hooks/scripts/agents the brain has identified as worth shipping; surfaced via `/sheldon:brain-recall --type proposal` and ready for promotion into missions.
- **Agent improvements** — proposed tweaks to `agents/*.md` that would have prevented a prior defect. These never auto-apply; the Orchestrator promotes them into normal missions.

The Orchestrator calls `brain_recall` before writing each contract and `/sheldon:brain-learn <id>` after each mission terminates. The Worker calls `brain_recall` before implementing. The Validator does NOT consult the brain — it validates strictly against the contract, so pass/fail stays mechanically reproducible.

Tools exposed by the MCP server: `mcp__plugin_sheldon_missions__brain_observe`, `mcp__plugin_sheldon_missions__brain_recall`, `mcp__plugin_sheldon_missions__brain_list`. The brain is per-repo; `.sheldon/brain/entries.jsonl` is the source of truth, `.sheldon/brain/README.md` is a regenerated digest for humans.

## Epics: turning vague briefs into missions

Not every request is a single well-scoped mission. When the work is exploratory — "look at this repo and pull useful ideas," "refactor this subsystem," "design feature X" — start with `/sheldon:epic-new <brief>`. The Epic Planner agent:

1. Researches the codebase in parallel via Explore sub-agents.
2. Decomposes the brief into 3–7 candidate sub-missions (each independently scope-able and assertable).
3. Writes `.epics/<id>/epic.md` with rationale + acceptance sketches per issue.
4. Returns the table for you to review.

You then promote any subset via `/sheldon:epic-promote <epic_id> <issue_id>`. Each promoted issue becomes a normal mission in `planning` phase, ready for the standard Orchestrator → Worker → Validator loop. Issues you don't promote stay as `proposed` for later.

## Layout

| Path | Purpose |
|------|---------|
| `.claude-plugin/plugin.json` | Plugin manifest |
| `settings.json`              | Activates Orchestrator as the main thread |
| `agents/`                    | Orchestrator / Worker / Validator / Epic Planner definitions |
| `skills/`                    | Slash commands (`/sheldon:mission-*`, `/sheldon:epic-*`) |
| `hooks/hooks.json`           | PreToolUse (contract immutability) + PostToolUse (touched-file tracking) + SubagentStop (state-transition log) |
| `mcp/missions-server/`       | The shared-state MCP server (stdio, TypeScript) — bundled by the plugin install |
| `tui/`                       | Mission Control terminal UI (Slice 2) |
| `scripts/hooks/`             | Shell scripts invoked by the hook config |
| `.missions/<id>/`            | Per-mission state files (state.json, contract.md, handoffs/, validations/, touched.list) |
| `.epics/<id>/`               | Per-epic proposal files (epic.md with candidate sub-missions) |
| `.sheldon/brain/`            | Persistent learning layer (entries.jsonl + regenerated README.md digest) |

## Platform

macOS supported today; see [docs/PLATFORM.md](docs/PLATFORM.md) for Linux compatibility status.

## Environment variables

| Var | Default | Purpose |
|-----|---------|---------|
| `SHELDON_REPO_ROOT` | `process.cwd()` (which Claude Code sets to the project directory) | Override the directory the MCP server treats as the project root. Unexpanded `${...}` placeholders and non-existent paths are ignored and the fallback is used. |

## Auth note

This plugin runs *inside* Claude Code, which uses the user's Claude Pro/Max/Team/Enterprise subscription for inference — ToS-compliant first-party use. Sheldon never handles OAuth tokens itself.

## Community

- **Contributing**: [CONTRIBUTING.md](CONTRIBUTING.md) — fork/branch/PR workflow, coding conventions, testing expectations.
- **Code of conduct**: [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) — adopts the Contributor Covenant 2.1.
- **Security**: [SECURITY.md](SECURITY.md) — please report vulnerabilities via private GitHub security advisory, not public issues.
- **Changelog**: [CHANGELOG.md](CHANGELOG.md) — release notes, Keep-a-Changelog format.
- **Releasing**: [docs/RELEASING.md](docs/RELEASING.md) — maintainer reference for cutting a release.

## Credits

- **Architectural inspiration**: the "Missions" architecture from Factory.ai's Alvoeiro talk — serial execution per feature, validation-contract-first, branch-per-mission, fresh worker contexts.
- **Borrowed skills** (planned via [epic 01KRCE0QJX3QFT8MCS8B2R9YDE](.epics/01KRCE0QJX3QFT8MCS8B2R9YDE/epic.md)): the following skills are being ported into `skills/` from [obra/superpowers](https://github.com/obra/superpowers) (MIT-licensed). Per project convention, attribution is centralized here rather than in SKILL.md footers (trailing metadata inside a skill body competes with its instructions for the model's attention).
  - `systematic-debugging` — adapted from [obra/superpowers/skills/systematic-debugging](https://github.com/obra/superpowers/tree/main/skills/systematic-debugging) (MIT).
  - `verification-before-completion` — adapted from [obra/superpowers/skills/verification-before-completion](https://github.com/obra/superpowers/tree/main/skills/verification-before-completion) (MIT).
  - `test-driven-development` — adapted from [obra/superpowers/skills/test-driven-development](https://github.com/obra/superpowers/tree/main/skills/test-driven-development) (MIT).
  - `brainstorming` — adapted from [obra/superpowers/skills/brainstorming](https://github.com/obra/superpowers/tree/main/skills/brainstorming) (MIT).
