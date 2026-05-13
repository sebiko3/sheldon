---
name: "sheldon:pair-brainstorming"
description: Invoke from the Orchestrator BEFORE writing a mission's validation contract for high-ambiguity missions when a single-voice brainstorm would miss edge cases; runs a driver/navigator pair-programming loop where the driver proposes each assertion and the navigator critiques, with roles swapping after every proposed assertion. Triggered by phrasings like "pair brainstorm", "driver navigator", "high-ambiguity contract", or "I want a second voice on this mission". Outputs design context directly into the contract.md body via write_contract, not into a separate design doc.
---

# /sheldon:pair-brainstorming

Turn a high-ambiguity mission goal into a fully-formed mission validation contract by running a structured driver/navigator pair-programming loop instead of a single-voice brainstorm.

This skill is a variant of [`skills/brainstorming/`](../brainstorming/SKILL.md). Use the original when the goal is moderately ambiguous and a single line of reasoning suffices. Reach for this pair variant when the mission has high architectural ambiguity, multiple plausible decompositions, or load-bearing edge cases that a solo brainstorm will likely miss.

<HARD-GATE>
Do NOT call mcp__plugin_sheldon_missions__write_contract until the user has approved the design. The contract IS the design document in sheldon — there is no separate design doc. The output must be a write_contract call.
</HARD-GATE>

## When to invoke

Invoke this skill only for **high-ambiguity** missions, where any of the following compound:

- Scope spans multiple modules or crosses a public interface
- Two or more plausible decompositions exist and the wrong choice is expensive
- The mission has load-bearing edge cases that a single-voice pass tends to miss
- The user explicitly asks for a "pair brainstorm", "driver/navigator" pass, or a "second voice"

Otherwise prefer the lighter [`/sheldon:brainstorming`](../brainstorming/SKILL.md). High-ambiguity is the gate — do not pair-brainstorm well-specified goals.

## The two roles

The skill runs in a single Orchestrator thread but explicitly alternates between two named cognitive stances. State the active role at the top of every message during steps 2-4.

### Driver

Responsibilities:

- Proposes the **concrete text** of the next contract assertion (id, description, check command).
- Names files, signatures, and command lines. Commits to specifics — no "we could maybe".
- Types the assertion as it will appear in the final contract YAML.

The driver thinks forward — "given what we have, here is the next assertion".

### Navigator

Responsibilities:

- Questions the driver's assumptions before they cement.
- Surfaces edge cases, failure modes, and scope creep the driver missed.
- Applies YAGNI: pushes back on anything that does not serve the stated goal.
- Sanity-checks the `check:` command — does exit 0 actually mean the property holds?

The navigator thinks sideways — "what would make this assertion wrong, weak, or unnecessary?".

### Role-switch trigger

**Roles swap after each proposed assertion.** The moment the navigator signs off on an assertion (or the pair revises and lands it), the two roles rotate: the previous navigator becomes the driver for the next assertion, and vice versa. This switch is mandatory and per-assertion — do not stay in one role across multiple assertions.

In a single-thread context, "swap" means the Orchestrator explicitly relabels its stance and pivots its reasoning style. Announce the switch with a one-line marker (e.g. `--- switch: driver -> navigator ---`) so the user can follow the rotation.

## The 5 steps

### 1. Explore (joint)

Both roles read codebase context together using Bash, Read, Grep, and Glob:

- Existing files and patterns in the area being changed
- Recent commits touching related code
- Any current contracts or docs that constrain the work

Goal: ground proposals in what exists. No role split yet — exploration is shared input.

### 2. Clarify (navigator-led)

Navigator asks the user 1-3 sharp clarifying questions — one at a time — focused on the answers that materially change which assertions appear in the contract. Driver stays silent until clarifications land.

Do not ask cosmetic questions. If scope is large enough to decompose, flag that first: "This looks like multiple independent sub-missions. Should we split?"

### 3. Propose approaches (driver opens, navigator critiques)

Driver sketches 2-3 candidate approaches with explicit trade-offs and a recommended option. Navigator then attacks each option: failure modes, hidden coupling, YAGNI violations. The pair converges on a single approach.

### 4. Iterate assertions (rotation loop)

This is the heart of the pair variant. For each candidate assertion:

1. **Driver** proposes the assertion: id, description, and a concrete `check:` command.
2. **Navigator** critiques: is this mechanically checkable? Does exit 0 truly mean the property holds? Is anything missing? Is this redundant with an earlier assertion?
3. Revise until the navigator signs off.
4. **Switch roles** before the next assertion. Announce the rotation.

Continue until the pair agrees the assertion set is complete and minimal. Keep the list tight — YAGNI applies to assertions too.

### 5. Write contract (joint, then HARD-GATE)

Present the consolidated design summary and assertion set to the user for approval. Cover:

- What changes and what doesn't
- Key boundaries and interfaces
- Scope limits (what is explicitly out of scope)

Once the user approves, call `mcp__plugin_sheldon_missions__write_contract` with the full frontmatter + body. The output must be a write_contract call — there is no separate design doc.

Each mechanically checkable assertion MUST include a `check:` field — a bash one-liner whose exit 0 means the assertion holds. Example:

```yaml
assertions:
  - id: file-exists
    description: src/foo.ts exists and is non-empty
    check: test -s src/foo.ts
  - id: no-internal-refs
    description: no internal cross-references remain
    check: |
      if grep -rq 'internal-thing' src/; then exit 1; fi
```

Reserve prose-only assertions (no `check:`) for things that genuinely require judgment.

## Key principles

- Announce the active role at the top of every message during steps 2-4.
- Rotate roles after **every** proposed assertion. No exceptions.
- Driver commits to specifics; navigator hunts for what would break them.
- One question per message in step 2.
- YAGNI: ruthlessly trim assertions and scope.
- The contract IS the spec — write it to stand alone.
- If the pair stays stuck on a single assertion across two rotations, escalate to the user with the disagreement framed explicitly rather than spinning.

## Relationship to `/sheldon:brainstorming`

This skill is a sibling variant of [`skills/brainstorming/`](../brainstorming/SKILL.md), not a replacement. Both share:

- The same 5-step skeleton
- The same HARD-GATE: terminal action is `write_contract`
- The same output destination: the mission's `contract.md`

What differs is the cognitive mode: the original runs as a single voice; this variant enforces a driver/navigator split with a per-assertion role-switch trigger. Pick the one that matches the mission's ambiguity level.
