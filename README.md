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

## Install (development)

```bash
npm install
npm run build
claude --plugin-dir /Users/sebiko83/code/sheldon
```

Inside Claude Code:
```
/sheldon:mission-new "your goal here"
```

## Layout

| Path | Purpose |
|------|---------|
| `.claude-plugin/plugin.json` | Plugin manifest |
| `settings.json`              | Activates Orchestrator as the main thread |
| `agents/`                    | Orchestrator/Worker/Validator definitions |
| `skills/`                    | Slash commands (`/sheldon:mission-*`) |
| `hooks/hooks.json`           | PreToolUse (contract immutability) + SubagentStop (state transitions) |
| `.mcp.json`                  | Registers the missions MCP server |
| `mcp/missions-server/`       | The shared-state MCP server (stdio, TypeScript) |
| `tui/`                       | Mission Control terminal UI (Slice 2) |
| `scripts/hooks/`             | Shell scripts called by the hook config |

## Platform

macOS only. Uses `fs.watch` (APFS-friendly), POSIX paths, optional `osascript` notifications.

## Environment variables

| Var | Default | Purpose |
|-----|---------|---------|
| `SHELDON_REPO_ROOT` | `process.cwd()` (which Claude Code sets to the project directory) | Override the directory the MCP server treats as the project root. Unexpanded `${...}` placeholders and non-existent paths are ignored and the fallback is used. |

## Auth note

This plugin runs *inside* Claude Code, which uses the user's Claude Pro/Max/Team/Enterprise subscription for inference — ToS-compliant first-party use. Sheldon never handles OAuth tokens itself.
