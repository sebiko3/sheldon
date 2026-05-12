# Contributing to Sheldon

Thanks for your interest in contributing! Sheldon is a Claude Code plugin that runs **Missions** — a multi-agent workflow with an Orchestrator, a Worker, and a Validator. The same workflow is used to develop Sheldon itself.

## Quick start

```bash
git clone https://github.com/sebiko3/sheldon $SHELDON_DIR
cd $SHELDON_DIR
npm install        # postinstall builds the MCP server
bin/sheldon doctor # sanity-check your install
```

See [README.md → Install](README.md#install) for the full setup, and [docs/walkthrough.md](docs/walkthrough.md) for a step-by-step mission example.

## How changes get in

Sheldon's own development follows the mission loop. For non-trivial changes you have two paths:

1. **Run a mission** (preferred for new capabilities). Inside Claude Code:

   ```
   /sheldon:mission-new "your goal in one sentence"
   ```

   The Orchestrator drafts a validation contract, you approve it with `/sheldon:mission-approve <id>`, then the Worker + Validator drive the implementation to a clean diff. Open a PR with the merge commit when it's done. See [README.md → How it works](README.md#how-it-works).

2. **Open a PR directly** (fine for small fixes, docs, typos, README polish). Fork the repo, make your branch off `main`, push, and open a PR through the normal GitHub UI. The CI workflow (`.github/workflows/ci.yml`) will run `npm run build` and `npm test` on Ubuntu / Node 20.

Either way, before submitting:

- [ ] `npm run build` is clean.
- [ ] `npm test` passes (`mcp/missions-server` has a vitest suite).
- [ ] Your branch is based on the latest `main`.
- [ ] Commit messages explain *why*, not just *what*.

## Repository layout

| Path | Purpose |
|------|---------|
| `agents/`             | Orchestrator / Worker / Validator / Epic Planner agent definitions |
| `skills/`             | Slash commands (`/sheldon:*`) |
| `hooks/`              | Lifecycle hooks (contract immutability, scope tracking, scope-creep advisory) |
| `mcp/missions-server/`| Shared-state MCP server (TypeScript, stdio) |
| `scripts/`            | Stdlib Python helpers (missions-report, contract-lint, mission-retro, brain-dedup, missions-gc, …) |
| `tui/`                | Mission Control terminal UI |
| `bin/sheldon`         | Plugin launcher + `doctor` subcommand |
| `.sheldon/brain/`     | Persistent learning layer (`seed.jsonl` tracked, `entries.jsonl` per-environment / gitignored) |
| `.missions/<id>/`     | Per-mission state (gitignored) |
| `.epics/<id>/`        | Per-epic proposals (tracked, audit trail) |

## Coding conventions

- **TypeScript everywhere it applies.** New code in `mcp/`, `tui/`, and `agents/`/`skills/` MCP-touching paths should be TypeScript.
- **Stdlib-only Python in `scripts/`.** No `pip install`. argparse strict mode for flags. `#!/usr/bin/env python3` shebang.
- **No comments by default.** Add one only when the WHY is non-obvious (a hidden constraint, a workaround for a specific bug). Don't explain WHAT the code does — names should do that.
- **Don't mutate protected signatures.** `mcp/missions-server/src/schema.ts` and the existing exported handlers in `src/tools.ts` are load-bearing — additive changes (new exports, new tools) are fine; changing existing exports is not.

## Platform support

macOS is the primary target today. The MCP server, hooks, brain, and CLI scripts work on Linux; the TUI's notification path is macOS-only (silently no-ops elsewhere) and the TUI's recursive watcher falls back to non-recursive on Linux. See [docs/PLATFORM.md](docs/PLATFORM.md).

## Releasing

If you have commit access, see [docs/RELEASING.md](docs/RELEASING.md) for the version-bump-and-tag procedure.

## Privacy note

For your own commits, consider setting your git author email to GitHub's noreply address:

```bash
git config user.email "<your-id>+<your-username>@users.noreply.github.com"
```

This keeps your real email out of the public commit log.

## Code of Conduct

By participating in this project you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Contributions are licensed under the [MIT License](LICENSE) — the same as the rest of the project.
