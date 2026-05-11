---
name: sheldon:brainstorming
description: Invoke from the Orchestrator BEFORE writing a mission's validation contract when scope or acceptance criteria are ambiguous; outputs design context directly into the contract.md body via write_contract, not into a separate design doc.
---

# /sheldon:brainstorming

Turn an ambiguous goal into a fully-formed mission validation contract through structured collaborative dialogue.

<HARD-GATE>
Do NOT call mcp__plugin_sheldon_missions__write_contract until the user has approved the design. The contract IS the design document in sheldon — there is no separate design doc.
</HARD-GATE>

## When to invoke

Invoke this skill when `/sheldon:mission-new` receives a goal where any of the following apply:

- Acceptance criteria are unclear or unstated
- Multiple valid interpretations of scope exist
- The approach involves meaningful architectural trade-offs

Skip this skill for goals that are already well-specified. Jump directly to writing the contract.

## The 5 Steps

### 1. Explore

Read relevant codebase context using Bash, Read, Grep, and Glob. Check:

- Existing files and patterns in the area being changed
- Recent commits touching related code
- Any current contracts or docs that constrain the work

Goal: understand what already exists so proposals are grounded, not speculative.

### 2. Clarify

Ask the user 1-3 sharp clarifying questions — one at a time. Focus only on questions whose answers materially change the contract assertions.

Do not ask cosmetic questions. Do not ask about things you can infer from the codebase. If scope is large enough to decompose, flag that first: "This looks like multiple independent sub-missions. Should we split?"

### 3. Propose approaches

Sketch 2-3 candidate approaches with explicit trade-offs. Lead with your recommended option and explain the reasoning. Be concrete: name files, tools, data shapes, or sequencing that differs between options.

Apply YAGNI: remove anything from the options that doesn't serve the stated goal.

### 4. Present design and get approval

Present the agreed approach as a design summary. Cover:

- What changes and what doesn't
- Key boundaries and interfaces
- Scope limits (what is explicitly out of scope)

Ask the user to approve before proceeding. Revise if they push back.

### 5. Write contract

Translate the approved design into numbered, mechanically-checkable assertions and call `mcp__plugin_sheldon_missions__write_contract` with the full frontmatter + body.

The output destination is the mission's `contract.md`, populated via `mcp__plugin_sheldon_missions__write_contract`. This IS the design document — do not write a separate file.

Each assertion that can be checked mechanically MUST include a `check:` field — a bash one-liner whose exit 0 means the assertion holds. Example:

```yaml
assertions:
  - id: file-exists
    description: src/foo.ts exists and is non-empty
    check: test -s src/foo.ts
  - id: no-obra-refs
    description: no internal cross-references remain
    check: |
      if grep -rq 'internal-thing' src/; then exit 1; fi
```

Reserve prose-only assertions (no `check:`) for things that genuinely require judgment.

## Key principles

- One question per message in step 2
- Prefer multiple-choice questions when possible
- Always propose 2-3 approaches before settling on one
- YAGNI: ruthlessly remove unnecessary scope
- The contract IS the spec — write it to stand alone
