---
description: "Distill a terminated mission (merged or aborted) into brain entries — conventions, lessons, proposals."
argument-hint: "<mission_id>"
---

# /sheldon:brain-learn

Mission to learn from: **$ARGUMENTS**

This is how Sheldon grows. After a mission terminates, read its artifacts and extract durable knowledge into the brain so future missions inherit it without re-learning.

## Step 1 — Read the mission

1. Call `mcp__plugin_sheldon_missions__read({ mission_id: "$ARGUMENTS" })`. Confirm `state.phase` is one of `done`, `aborted`, `validated`, or `rejected`. If it's still active, refuse and tell the user.
2. Read these files with the `Read` tool:
   - `.missions/$ARGUMENTS/contract.md`
   - Each `.missions/$ARGUMENTS/handoffs/*.md` (newest matters most)
   - Each `.missions/$ARGUMENTS/validations/*.md` — both the run logs (checks output) and the verdict findings

## Step 2 — Extract candidate entries

For each piece of durable knowledge you find, classify it into ONE of:

- **`convention`** — a stable fact about THIS project (build tool, test runner, naming pattern, file layout, style rule). Triggered by: the worker had to discover it before writing code; or the validator dinged the worker for missing it.
- **`lesson`** — a meta-rule for FUTURE missions (e.g., "always quote frontmatter descriptions with `: `"). Triggered by: a validator failure, a contamination event, a rework loop, a near-miss the worker called out.
- **`proposal`** — a net-new capability worth shipping (skill, hook, script, agent improvement). Triggered by: the mission's handoff or your own reading reveals a repeated chore that could be automated. When the Orchestrator later promotes such a proposal into a real skill, use `/sheldon:skill-builder` to scaffold the SKILL.md with the right conventions baked in.
- **`agent-improvement`** — a tweak to `agents/orchestrator.md`, `agents/worker.md`, or `agents/validator.md` that would have prevented an issue in this mission. Triggered by: the worker followed instructions and still produced a defect, or the validator missed something a sharper rubric would catch.

Be ruthless. Aim for 0–3 high-signal entries, not a dump. Skip anything you already see in `mcp__plugin_sheldon_missions__brain_recall` output (call it first to dedupe). Anything that's just "the worker did the right thing" is not knowledge — it's noise.

## Step 3 — Observe

For each surviving entry, call:

```
mcp__plugin_sheldon_missions__brain_observe({
  type: "<convention|lesson|proposal|agent-improvement>",
  topic: "<short kebab-or-colon tag, e.g. yaml-frontmatter, agent:worker, tests>",
  text: "<one paragraph, present tense, actionable>",
  evidence: "$ARGUMENTS",   // mission_id
  confidence: "<low|medium|high>",
  supersedes: "<id of an older entry this replaces>"  // only if applicable
})
```

`confidence: high` only when the evidence is unambiguous (e.g., a failed check that wouldn't have passed without the rule). `low` when it's a hunch from one data point.

## Step 4 — Report

Print a compact summary:

```
Mission <id> (<phase>): <goal>
  + N convention(s):  …
  + N lesson(s):      …
  + N proposal(s):    …
  + N agent-imp(s):   …
  Brain now: <active> active entries.
```

If you extracted nothing, say so plainly — empty learnings are fine, especially for clean happy-path missions.

## What NOT to do

- Do not write to `.sheldon/brain/` files directly. Use `brain_observe`; it appends atomically and regenerates the digest.
- Do not modify agent files in this skill. `agent-improvement` entries are PROPOSALS; the Orchestrator promotes them into real missions via the normal loop.
- Do not invent evidence. If you can't point to a concrete artifact in this mission, the entry is probably a `lesson` from your priors, not from this mission — and the brain only wants entries grounded in this repo.
