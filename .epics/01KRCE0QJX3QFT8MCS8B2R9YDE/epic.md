---
id: 01KRCE0QJX3QFT8MCS8B2R9YDE
brief: >-
  borrow ideas from https://github.com/obra/superpowers/tree/main and implement
  them into sheldon wisely. Be it scripts, hooks, skills or agents. Do it
  without bloating sheldon too much.
created_at: '2026-05-11T21:10:17.950Z'
issues:
  - id: 1
    title: Port systematic-debugging skill from obra/superpowers
    rationale: >-
      Worker has zero built-in guidance for non-trivial bugs today. A
      pure-content skill port gives the Worker a disciplined debugging procedure
      (Phase 1 understand → Phase 2 isolate → Phase 3 fix) with zero
      infrastructure risk. Independent and standalone — lowest blast radius,
      highest leverage.
    acceptance_sketch:
      - >-
        skills/systematic-debugging/SKILL.md exists with frontmatter `name:
        sheldon:systematic-debugging` and a sheldon-flavored description
      - >-
        All superpowers-internal cross-references (e.g. 'see writing-plans') are
        removed or replaced with sheldon equivalents
      - >-
        agents/worker.md gains one sentence pointing the Worker to
        `/sheldon:systematic-debugging` when a non-trivial bug is encountered
      - >-
        SKILL.md body contains NO attribution footer. Attribution lives ONLY in
        the plugin root `README.md` (centralized `## Credits` section) —
        trailing metadata in skill content degrades LLM skill usage.
      - >-
        No changes to hooks/, mcp/, or any agent system prompt besides the
        worker.md cross-reference
    status: promoted
    promoted_mission_id: 01KRCFYJ7D74KM2YZ9SSHH8K8W
  - id: 2
    title: Port verification-before-completion skill and add handoff cross-reference
    rationale: >-
      Pairs with the existing `run_assertions` MCP tool — the skill is the
      human-discipline layer, `run_assertions` is the machine layer. Highest
      leverage for mission quality since it guards the Worker→Validator handoff.
      The optional pre-tool-use hook tweak
      (warn-on-handoff-without-run_assertions) is in scope but conditional on
      hook-detection feasibility; drop if fragile.
    acceptance_sketch:
      - >-
        skills/verification-before-completion/SKILL.md exists with frontmatter
        `name: sheldon:verification-before-completion`
      - >-
        agents/worker.md gains a sentence: before emitting the `handoff` intent
        block, run the contract's assertion checks and verify their output, per
        `/sheldon:verification-before-completion`
      - >-
        SKILL.md body contains NO attribution footer. Attribution lives ONLY in
        the plugin root `README.md` (centralized `## Credits` section) —
        trailing metadata in skill content degrades LLM skill usage.
      - >-
        OPTIONAL: scripts/hooks/pre-tool-use.sh detects an imminent `handoff`
        intent emission with no prior `run_assertions` call for the current
        mission and emits a stderr warning (not a block). If detection is not
        reliable from hook context, document the decision in the mission notes
        and ship skill-only.
      - No changes to mcp/ tools or schema
    status: promoted
    promoted_mission_id: 01KRCGGPS9D8DWTZAXV582847C
  - id: 3
    title: Port test-driven-development skill from obra/superpowers
    rationale: >-
      Worker-side TDD discipline as pure documentation. Zero infrastructure
      beyond a worker.md cross-reference. High value when missions involve
      feature work whose contract includes test-coverage assertions. Smallest
      scope of the four.
    acceptance_sketch:
      - >-
        skills/test-driven-development/SKILL.md exists with frontmatter `name:
        sheldon:test-driven-development`
      - Any obra-internal cross-references are removed or sheldon-mapped
      - >-
        agents/worker.md gains one sentence pointing to
        `/sheldon:test-driven-development` for missions whose contract includes
        test-coverage assertions
      - >-
        SKILL.md body contains NO attribution footer. Attribution lives ONLY in
        the plugin root `README.md` (centralized `## Credits` section) —
        trailing metadata in skill content degrades LLM skill usage.
      - 'No changes to hooks/, mcp/, or non-worker agent prompts'
    status: promoted
    promoted_mission_id: 01KRCGV2HDC4ZW3PBNF0KADC75
  - id: 4
    title: >-
      Port brainstorming skill (Orchestrator-invokable, outputs into
      contract.md)
    rationale: >-
      Adds an upstream design-discovery gate so the validation contract reflects
      real requirements rather than first-pass guesses. Adapted from the
      superpowers 9-step flow (which writes a separate design doc) down to a
      ~5-step flow whose output flows directly into the mission's contract.md
      body. Targets the Orchestrator's pre-contract phase in
      `/sheldon:mission-new`.
    acceptance_sketch:
      - >-
        skills/brainstorming/SKILL.md exists with frontmatter `name:
        sheldon:brainstorming`
      - >-
        Skill body explicitly states the final output destination is the mission
        `contract.md` body (via `mcp__plugin_sheldon_missions__write_contract`),
        NOT a separate `docs/...-design.md` file
      - >-
        Step count is reduced to ~5 (e.g. explore → clarify → propose approaches
        → present design → write contract); the 9-step superpowers structure is
        collapsed but the principles preserved
      - >-
        agents/orchestrator.md gains one sentence: before writing the validation
        contract for a non-trivial mission, consider invoking
        `/sheldon:brainstorming`
      - >-
        skills/mission-new/SKILL.md is optionally updated to mention
        `/sheldon:brainstorming` as a tool for step 4 (when scope is ambiguous)
      - >-
        SKILL.md body contains NO attribution footer. Attribution lives ONLY in
        the plugin root `README.md` (centralized `## Credits` section) —
        trailing metadata in skill content degrades LLM skill usage.
    status: promoted
    promoted_mission_id: 01KRCH4HBT085PECWPD52ZX02G
---

# Epic 01KRCE0QJX3QFT8MCS8B2R9YDE
