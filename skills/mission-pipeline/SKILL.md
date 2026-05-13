---
description: "Run a full mission pipeline end-to-end: create, write_contract, approve, worker, validator, merge, brain-learn — halting on first failure with validator findings surfaced. Use when the user says 'run the full mission', 'pipeline this', or wants the happy path executed end-to-end."
argument-hint: "<goal> [max_reworks=N]"
---

# /sheldon:mission-pipeline

Chain every step of the Sheldon mission lifecycle into a single
Orchestrator-driven flow. The pipeline composes the existing per-step skills
(`/sheldon:mission-new`, `/sheldon:mission-approve`, `/sheldon:brain-learn`)
plus the MCP state-transition tools into one happy-path command. It is the
stream-chain pattern adapted to Sheldon: each phase consumes the prior
phase's output, and the first hard failure halts the chain with the
validator's findings surfaced to the user.

## When to invoke

Reach for this skill when the user says some variant of:

- "run the full mission pipeline for `<goal>`"
- "pipeline this: `<goal>`"
- "do the whole thing end-to-end for `<goal>`"
- "run the happy path on `<goal>`"
- "create, work, validate, and merge `<goal>` in one go"

Skip this skill when:

- the user wants to **review the contract before approval** — use
  `/sheldon:mission-new` instead, then `/sheldon:mission-approve` once they
  have eyeballed the assertions
- the user is resuming an in-flight mission — pipeline starts at `create`;
  resume by jumping into `/sheldon:mission-approve <mission_id>` or by
  re-spawning the worker / validator directly
- the goal is high-ambiguity or load-bearing — run
  `/sheldon:brainstorming` first to lock down scope, then either pipeline
  or step manually

## Relationship to the per-step skills

The per-step skills still exist and still work standalone. Pipeline mode is
opt-in. Use the table below when deciding:

| Want                                     | Reach for                       |
| ---------------------------------------- | ------------------------------- |
| Author + approve contract manually       | `/sheldon:mission-new`          |
| Approve a contract already drafted       | `/sheldon:mission-approve`      |
| Distill lessons from a terminated mission| `/sheldon:brain-learn`          |
| Run the whole lifecycle in one shot      | `/sheldon:mission-pipeline`     |

Pipeline mode **does not replace** any standalone skill — it sequences
them. If anything in the chain fails, the user can drop back to standalone
mode at the failing phase and continue manually.

## The chain

Each step in the pipeline corresponds to an MCP tool call or a per-step
skill invocation. The Orchestrator is the only role that drives these
transitions; subagents (Worker, Validator) yield via fenced `intent` blocks
that the Orchestrator parses and dispatches.

Pipeline phases, in order:

1. **`create`** — call `mcp__plugin_sheldon_missions__create({ goal })`.
   Captures `mission_id`, `branch`, `base_commit`, `contract_path`.
2. **`write_contract`** — author the validation contract per
   `agents/orchestrator.md` rules, run `scripts/contract-lint.py` until
   clean, then call
   `mcp__plugin_sheldon_missions__write_contract({ mission_id, contract })`.
   Transitions phase to `contract_review`.
3. **`approve`** — call
   `mcp__plugin_sheldon_missions__approve({ mission_id })`. Transitions to
   `implementing`.
4. **Worker spawn → `handoff`** — spawn the Worker subagent with only the
   `mission_id`, a one-line goal, and an instruction to read
   `.missions/<mission_id>/contract.md`. The Worker emits a fenced `intent`
   block when done; the Orchestrator parses it and calls
   `mcp__plugin_sheldon_missions__handoff({ mission_id, summary })`.
   Phase becomes `handed_off`.
5. **`start_validation`** — call
   `mcp__plugin_sheldon_missions__start_validation({ mission_id })`. Phase
   becomes `validating`.
6. **Validator spawn → `validate`** — first call
   `mcp__plugin_sheldon_missions__run_assertions({ mission_id })` and
   `mcp__plugin_sheldon_missions__diff({ mission_id })` to pre-fetch
   structured assertion results and the diff. Spawn the Validator with
   `mission_id`, the stringified assertion results, the diff, and the
   instruction to read the contract. The Validator emits an `intent` block;
   parse it and call
   `mcp__plugin_sheldon_missions__validate({ mission_id, verdict, findings })`.
7. **`merge`** — on `verdict: pass`, call
   `mcp__plugin_sheldon_missions__merge({ mission_id })`. Phase becomes
   `done`; the mission branch is merged into the default branch.
8. **`brain-learn`** — immediately invoke `/sheldon:brain-learn
   <mission_id>` to distill conventions, lessons, proposals, and
   agent-improvements into `.sheldon/brain/entries.jsonl` so the next
   mission inherits what this one taught.

The full chain in one line:

```
create -> write_contract -> approve -> handoff -> start_validation -> validate -> merge -> brain-learn
```

## Validator-failure feedback loop

When the Validator returns `verdict: fail`, the pipeline does NOT
immediately halt. Instead:

1. Call `mcp__plugin_sheldon_missions__reopen({ mission_id })`. Phase
   transitions `rejected` → `implementing`.
2. **Re-spawn the Worker**: inject the validator findings verbatim into the next worker spawn prompt.
   The next worker brief must include the findings markdown the validator
   emitted, framed as "Previous validation failed. Address every finding
   below before handing off:".
3. Increment a local `rework_count` counter.
4. Loop back to step 5 of the chain (`start_validation`) once the Worker
   re-hands-off.

Each iteration of this loop is one "rework". Validator findings feed the
next worker spawn so the implementation converges instead of thrashing.

## Loop cap

The rework loop is bounded by `max_reworks` (default: **2**). The cap is
configurable per-invocation: parse it from the user's arguments
(`max_reworks=3`, `--max-reworks 3`, or a trailing integer) or fall back to
the default. Two reworks means a mission gets at most three total worker
attempts before the pipeline halts.

When `rework_count >= max_reworks` and the latest verdict is still `fail`:

- **Halt** the chain immediately.
- **Surface** the latest validator findings to the user verbatim (the
  findings markdown), prefixed with a clear "Pipeline halted after
  `max_reworks` reworks." header.
- Do **NOT** auto-abort the mission. Leave it in the `rejected` phase so
  the user can inspect the diff, fix it manually, and either re-approve
  via `/sheldon:mission-approve` or abort via
  `mcp__plugin_sheldon_missions__abort`.
- Still run `/sheldon:brain-learn <mission_id>` afterwards — a twice-failed
  contract is itself a lesson worth preserving (per `agents/orchestrator.md`
  guidance on consecutive failures).

## Halt-on-failure: other phases

Any non-validator phase that fails halts the pipeline immediately (no
rework loop applies):

- **`create` fails** — surface the MCP error; do not proceed. No mission
  exists to clean up.
- **`write_contract` fails contract-lint** — fix the draft in place and
  re-run `scripts/contract-lint.py` until clean (this is an in-pipeline
  retry, not a rework). If the draft is fundamentally broken, halt and
  ask the user.
- **`approve`, `handoff`, `start_validation`, `merge` MCP calls error** —
  halt, surface the error and the current phase from
  `mcp__plugin_sheldon_missions__read`. Do not retry — these errors mean
  the state machine is out of sync and need user inspection.
- **Worker emits no `intent` block** — treat as protocol violation per
  `agents/orchestrator.md`. Halt the pipeline and report.

In every halt case, the user gets:

1. The current mission `mission_id` and phase.
2. The error or validator findings, surfaced verbatim.
3. A suggested next command (e.g., re-run a specific per-step skill,
   abort, or inspect the diff).

## Steps (for the Orchestrator)

1. Parse `$ARGUMENTS`: split off `max_reworks=N` / `--max-reworks N` /
   trailing integer if present; the remainder is the goal. Default
   `max_reworks` to 2.
2. Run phase 1 (`create`) and capture `mission_id`.
3. Run phase 2 (`write_contract`) per the contract-authorship rules in
   `agents/orchestrator.md`. Run `contract-lint` until clean. If
   contract-lint cannot be made clean, halt.
4. Run phase 3 (`approve`).
5. **Worker → Validator loop:**
   - Spawn the Worker (phase 4); parse intent; call `handoff`.
   - Run phases 5–6 (`start_validation`, `run_assertions`, `diff`,
     Validator spawn, parse intent, `validate`).
   - On `verdict: pass`: break out of the loop and continue.
   - On `verdict: fail` and `rework_count < max_reworks`: `reopen`,
     increment `rework_count`, re-spawn the Worker with the prior
     validator findings included verbatim, and loop.
   - On `verdict: fail` and `rework_count >= max_reworks`: halt per the
     "Loop cap" section above.
6. Run phase 7 (`merge`).
7. Run phase 8 (`brain-learn`).
8. Report to the user: `mission_id`, total reworks, final phase, and a
   one-line summary of what shipped.

## Notes

- Pipeline mode is purely an **Orchestrator-side** concern. No changes are
  needed in `agents/worker.md` or `agents/validator.md`; the Worker and
  Validator behave identically whether spawned via pipeline or via
  `/sheldon:mission-approve`.
- The pipeline does not bypass `contract-lint` or `skill-lint`. Both gates
  apply exactly as in standalone mode.
- See `agents/orchestrator.md`'s "Pipeline mode" section for the
  Orchestrator-side cross-reference and the same chain at a higher level.
- Sheldon-local skill conventions still apply to this file:
  - One directory per skill (`skills/<kebab-name>/`) containing a single
    `SKILL.md`.
  - YAML frontmatter between `---` fences; required key is `description`.
  - Quote frontmatter values that contain the substring `": "`
    (gray-matter colon-space gotcha).
  - No emojis anywhere in the body.
  - No footer attribution.
