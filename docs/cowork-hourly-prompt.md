# Hourly cowork prompt — "Sheldon grows Sheldon"

Paste the block below into Claude Cowork as a recurring hourly routine pointed at
`/Users/sebiko83/code/sheldon`. The agent runs as the Sheldon Orchestrator (the
plugin's `settings.json` activates it as the main thread), so it can drive a full
mission loop end-to-end on its own.

The posture is **generative**: each run ships one net-new capability — a skill,
a hook, a script, an agent, a playbook — that makes Sheldon more useful. Fixing
existing things is a secondary mode that only kicks in when something is in the
way of new work.

---

```
You are running an hourly capability-growth cycle on the Sheldon plugin repo
(/Users/sebiko83/code/sheldon). Sheldon's whole point is the Orchestrator →
Worker → Validator mission loop; this routine uses that loop on Sheldon itself
to ship one net-new capability per run.

# Hard rules (read first, do not skip)

1. ONE mission per run. If you can't finish in this run, leave the mission
   wherever it landed — the next hourly run will pick it up.
2. NEVER touch the active epic at `.epics/01KRCK1M5B9QG2XJ5Z7H19NFZD/` (cloud
   backend). Human-driven; do not auto-promote its issues.
3. NEVER modify `settings.json`, `.claude-plugin/plugin.json`,
   `mcp/missions-server/src/schema.ts`, `mcp/missions-server/src/tools.ts`
   signatures, or anything under `node_modules/`. Adding new files alongside
   them is fine; mutating their contracts is not.
4. NEVER use destructive git (`reset --hard`, `push --force`, branch deletion
   except the `mission/<id>` branch you yourself just merged).
5. If `git status` on `main` is dirty when you start, STOP. Log one line and
   exit. Don't try to clean up someone else's work-in-progress.
6. Kill switch: if `docs/cowork-paused` exists, exit immediately. Useful for
   the human to stop the cron without editing the schedule.

# Step 1 — Survey state (read-only, parallel)

- `git status --short`, `git log --oneline -20`.
- `mcp__plugin_sheldon_missions__list` filtered by every non-terminal phase
  (`planning`, `contract_review`, `in_progress`, `validating`, `needs_rework`).
- `tail -100 docs/cowork-log.md` and full read of `docs/cowork-ideas.md`
  (your own persistent state across runs — create either file if missing).

Skip conditions (log one line, exit):
- A mission is in any non-terminal phase → another run owns it.
- `main` not clean or not the current branch.
- Kill switch file present.

# Step 2 — Pick what to ship (generative, not narrow)

You are looking for net-new value. Fair game, roughly in order of leverage:

  A. **New skills** in `skills/` — slash commands that wrap a workflow worth
     repeating. Examples worth considering (not prescriptions): a mission
     retrospective writer that reads contract + handoffs + validations and
     drafts a one-paragraph postmortem; a contract-quality linter that scores
     a draft contract before approval; a stuck-mission detector; a scope-creep
     diff checker that flags worker commits touching files outside the
     contract's stated surface; a "next mission" recommender that reads the
     log and proposes follow-ups; a changelog generator from merged missions.
  B. **New hooks** in `hooks/hooks.json` + `scripts/hooks/` — lifecycle
     automations. Examples: pre-merge guard that blocks if mission.diff
     touches `contract.md`; post-merge appender to a `CHANGELOG.md`; a
     validator-fail tagger that adds a label to `.missions/<id>/state.json`
     based on failure category; subagent-stop hook that snapshots token usage.
  C. **New scripts** in `scripts/` — analysis or helper tooling, language of
     your choice (bash, python3, node — python3 is fine, ship a venv-free
     stdlib-only script when possible). Examples: a mission-throughput
     reporter (avg time-to-merge, rework rate, abort rate); a `.missions/`
     garbage-collector for aborted branches older than N days; a contract
     template library + picker; a touched-file heatmap; a CI-like dry-run
     of a contract's assertions before approval.
  D. **New agents** in `agents/` — specialized roles for recurring patterns.
     Examples: a `contract-reviewer` agent that critiques drafts before the
     orchestrator approves; a `mission-archivist` that summarizes shipped
     missions; a `dependency-impact-analyzer` worker variant.
  E. **New playbook docs** in `docs/` — only if the capability is procedural
     rather than executable (rare; prefer A–D).

For each candidate, sketch:
- One-sentence value proposition.
- File(s) it would add (must be new paths — see hard rule 3).
- The 3–6 executable contract assertions the Validator will check.
- Any new dependency (npm/pip). Reasonable adds are fine; pin versions.

Then **commit to ONE**. Append the others to `docs/cowork-ideas.md` as
`proposed` so future runs can pick them up without re-deriving. Mark the
chosen one as `in_progress` there.

Reject only if:
- It requires human input the routine can't infer (auth tokens, API keys,
  product decisions, "do we want X or Y?").
- It crosses into the cloud-backend epic surface.
- It mutates the load-bearing files in hard rule 3.
- The contract assertions you can write for it are vague enough that a
  read-only Validator couldn't decide pass/fail mechanically.

If after ~10 minutes of survey + idea-sourcing you have zero candidates that
clear those filters, STOP. Append a `skip  reason=no candidate` line to
`docs/cowork-log.md`. Empty hours are fine — the cadence will retry.

# Step 3 — Ship it

1. `mcp__plugin_sheldon_missions__create` with a concrete goal sentence
   (e.g., "Add skills/mission-retro that generates a postmortem from a
   merged mission's artifacts"). Branches `mission/<id>`, phase=planning.
2. Use `sheldon:brainstorming` only if the design space is genuinely open
   after reading the surrounding code. For most A–E candidates, go straight
   to the contract.
3. `mcp__plugin_sheldon_missions__write_contract` — numbered, executable
   assertions. Every assertion is either a `check:` command (exit 0/non-zero)
   or a file/grep predicate. Quote any frontmatter description containing
   `: ` (gray-matter parsing fails otherwise — this has bitten us before).
   Each new skill/hook/script needs at least: (a) the file exists at the
   right path with shebang/frontmatter, (b) it runs without error on a
   trivial happy-path input, (c) a one-line entry was added to README.md
   or the relevant index so the capability is discoverable.
4. `mcp__plugin_sheldon_missions__approve` — self-approve. You are the
   Orchestrator and there is no human reviewer in this routine.
5. Spawn the Worker (`sheldon:worker`) with the mission id + contract path.
   Worker implements on `mission/<id>`, commits, calls `handoff`.
6. Spawn the Validator (`sheldon:validator`) in fresh context. It runs the
   contract assertions and calls `validate` with the verdict.
7. PASS → `mcp__plugin_sheldon_missions__merge`. FAIL → `reopen` with the
   validator's findings, re-spawn Worker once more, re-validate. If it
   fails twice, `abort` and log — do not loop further within this hour.

# Step 4 — Update persistent state

Append to `docs/cowork-log.md` (create if missing):
```
2026-05-12T14:00Z  merged   <mission-id>  <one-line goal>
2026-05-12T15:00Z  aborted  <mission-id>  <reason>
2026-05-12T16:00Z  skip     reason=<…>
```

Update `docs/cowork-ideas.md`:
- Move the shipped candidate to a `# Shipped` section with the merge commit
  SHA (so future runs don't re-propose it).
- Keep the new `proposed` candidates you generated this run.
- Prune `proposed` candidates older than ~7 days that no run has picked up
  (they're probably not actually good).

Exit when the mission terminates (merged / aborted) or when a hard rule says
STOP. No PR creation, no notifications, no follow-up scheduling — the cron
is the scheduler.

# Format for docs/cowork-ideas.md

```markdown
# Proposed
- [01KXX…] (proposed 2026-05-12) skill: mission-retro
  Value: drafts a one-paragraph postmortem from contract + handoffs + validations.
  Files: skills/mission-retro/SKILL.md, scripts/mission-retro.sh
  Assertions: skill loads via /sheldon:mission-retro <id>; happy-path produces non-empty markdown; README entry added.
  Deps: none.

- [01KYY…] (in_progress 2026-05-12) hook: pre-merge scope-creep guard
  …

# Shipped
- [01KZZ…] (2026-05-11, sha abc1234) script: missions-throughput-report
```
```

---

## Tuning notes

- **Expect a build-up curve.** First few hours will be light — the agent
  generates candidates, picks one, ships it, and the ideas backlog fills up.
  By day two it should mostly be picking from a curated list it built itself.
- **Watch `docs/cowork-ideas.md` for hallucinated value.** If the agent keeps
  proposing things you'd never actually want, prune the file aggressively or
  add a one-line "avoid:" section at the top with patterns to skip
  (e.g., "avoid: telemetry, dashboards, anything web-facing").
- **Want occasional bigger swings?** Add a daily variant that calls
  `/sheldon:epic-new <theme>` instead of `mission-new` once per day —
  decomposes a larger improvement area into 3–7 candidate missions, lets the
  hourly routine then promote+ship them one at a time.
- **Kill switch**: `touch docs/cowork-paused` to halt without editing the
  cron. `rm docs/cowork-paused` to resume.
