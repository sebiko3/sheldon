---
id: 01KRFCTF11E54FR98HESTZQNTA
brief: >-
  Evaluate ruflo's .claude directory
  (https://github.com/ruvnet/ruflo/tree/main/.claude) for agents/skills/commands
  worth porting or learning from for sheldon.
created_at: '2026-05-13T00:47:07.297Z'
issues:
  - id: 1
    title: Add skill-builder skill to standardize new skill authoring
    rationale: >-
      Ruflo's skill-builder codifies the Claude Skills spec (YAML frontmatter,
      name+description rules, progressive disclosure). Sheldon now has 22+
      skills but no template/lint for new ones — adding a skill-builder mirrors
      contract-lint's role for contracts and makes promoted brain `proposal`
      entries trivial to convert into real skills.
    acceptance_sketch:
      - >-
        skills/skill-builder/SKILL.md exists with frontmatter description that
        triggers on 'create a new skill', 'scaffold skill'
      - >-
        Skill body documents sheldon's local skill conventions (kebab-case dir,
        single SKILL.md, description that triggers on intent, no emojis, no
        footer attribution per MEMORY)
      - >-
        Skill walks through a template + a scripts/skill-new.py (or inline
        checklist) that writes the stub and runs a frontmatter linter analogous
        to contract-lint.py
      - >-
        Add an allow-list entry / wire-up so the Orchestrator can invoke
        /sheldon:skill-builder during brain proposal promotion
    status: promoted
    promoted_mission_id: 01KRFD6X1EPWJ0HN4DRSCN68D2
  - id: 2
    title: >-
      Port verification-quality's tool-description audit to sheldon's MCP
      surface
    rationale: >-
      Ruflo's verification-quality skill enforces a monotone-decreasing baseline
      audit so every MCP tool description must answer 'use this over native
      when?'. Sheldon already has 16 MCP tools and contract-lint; adding the
      same audit catches the exact drift ruflo guards against without adopting
      their full truth-score / Ed25519-witness stack.
    acceptance_sketch:
      - >-
        scripts/audit-tool-descriptions.py walks mcp/missions-server tool
        registrations and counts violations (noGuidance / tooShort / duplicates)
      - >-
        verification/mcp-tool-baseline.json locks a monotone-decreasing floor;
        --update-baseline flag to lower it after a fix
      - >-
        CI step or pre-publish hook runs the audit; failure surfaces the
        offending tool names
      - >-
        Seed a brain convention: 'every MCP tool description must explain when
        to prefer it over the native equivalent'
    status: promoted
    promoted_mission_id: 01KRFDQAR6ETGSSAD7B0WAYZ4Q
  - id: 3
    title: 'Add stream-chain-style /sheldon:mission-pipeline to the Orchestrator'
    rationale: >-
      Ruflo's stream-chain runs sequential prompt steps where each gets the
      prior output as context. Sheldon's mission lifecycle is the same shape
      (create → approve → worker → validator → merge → brain-learn) but happens
      via separate user-driven slash commands. A pipeline command would compress
      the happy path while still halting on failure with validator findings
      surfaced.
    acceptance_sketch:
      - >-
        agents/orchestrator.md gains a 'Pipeline mode' section documenting chain
        semantics
      - >-
        /sheldon:mission-pipeline <goal> creates → approves → worker → validator
        → on-pass merges → brain-learn; halts on first failure with verdict
        findings
      - Existing single-step commands still work — pipeline is opt-in
      - >-
        Validator findings on intermediate failures feed back into the next
        worker spawn automatically, with a configurable loop cap
    status: promoted
    promoted_mission_id: 01KRFZVRDS8RM3KJ3Y2CY5FYN8
  - id: 4
    title: >-
      Adopt pair-programming's driver/navigator pattern as a brainstorming
      variant
    rationale: >-
      Ruflo's pair-programming exposes driver/navigator/switch modes with
      verification at role-switch boundaries. Sheldon's brainstorming skill is
      single-turn. A pair-brainstorm variant (user as navigator, Orchestrator as
      driver, swap every N exchanges) catches contracts where one party would
      have under-specified.
    acceptance_sketch:
      - >-
        skills/pair-brainstorming/SKILL.md added as a variant of
        skills/brainstorming/, gated to high-ambiguity missions
      - >-
        Skill defines role-switch trigger (e.g., after each proposed assertion)
        and per-role responsibilities
      - >-
        Output is still a write_contract call — no separate design doc, matching
        brainstorming's HARD-GATE
      - >-
        agents/orchestrator.md cross-links the variant from its existing
        brainstorming reference
    status: proposed
    promoted_mission_id: null
  - id: 5
    title: Add a sheldon statusline.mjs (mission/phase/brain at a glance)
    rationale: >-
      Ruflo's statusline.mjs is a self-contained statusline plugin with
      TTL-cached reads showing model/tokens/cost/swarm. Sheldon has a TUI but no
      Claude Code statusline integration — surfacing active mission_id, phase,
      brain-entry count, and last validator verdict makes the Orchestrator's
      state legible during long sessions.
    acceptance_sketch:
      - >-
        scripts/statusline.mjs reads .missions/*/state.json +
        .sheldon/brain/digest to render a single-line summary
      - Caches expensive reads with a 5s TTL (mirrors ruflo's CACHE_TTL pattern)
      - >-
        Output format: 'sheldon | mission:<id-short> phase:<phase> brain:<n>
        last:<pass|fail|—>'
      - >-
        Wired via .claude/settings.json statusline config and documented in
        README
    status: proposed
    promoted_mission_id: null
  - id: 6
    title: >-
      Learn from ReasoningBank: add 'strategy' entries (approach→outcome) to the
      brain
    rationale: >-
      Ruflo's ReasoningBank records {task, approach, outcome} tuples and
      recommends approaches for new tasks. Sheldon's brain stores
      conventions/lessons/proposals/agent-improvements but no approach→outcome
      empirical record. A new 'strategy' entry type (recorded on merged
      missions, surfaced during contract authoring) gives the Orchestrator
      empirical guidance on patterns that historically passed validation on the
      first worker round.
    acceptance_sketch:
      - >-
        New brain entry type 'strategy' with fields {approach,
        outcome:{validator_passes_first_try, rework_loops, mission_id}}
      - >-
        brain-learn skill extracts a strategy entry when a mission validated on
        the first worker round
      - >-
        brain_recall ranks strategies by first-try pass rate when queried with a
        topic
      - MCP tool surface unchanged for non-strategy entries; backward compatible
    status: proposed
    promoted_mission_id: null
  - id: 7
    title: Add a checkpoint primitive so mission state survives Claude Code crashes
    rationale: >-
      Ruflo's .claude/checkpoints/ + checkpoint-manager.sh let an interrupted
      session resume from the last good state. Sheldon's mission lifecycle has
      no checkpoint primitive — if Claude Code crashes mid-validation, the
      Orchestrator reconstructs state from state.json + git log. A SubagentStop
      hook that snapshots {phase, last-intent-block, run_assertions result}
      makes resume deterministic.
    acceptance_sketch:
      - >-
        scripts/hooks/checkpoint.sh writes a numbered snapshot on each
        SubagentStop and on every state-transition MCP call
      - >-
        New MCP tool mcp__plugin_sheldon_missions__resume({mission_id}) reads
        the latest checkpoint and tells the Orchestrator what to do next
      - >-
        Hook entry added to hooks/hooks.json; allow-list updated in
        .claude/settings.json
      - >-
        Documented in agents/orchestrator.md under a new 'Resuming after a
        crash' section
    status: proposed
    promoted_mission_id: null
---

# Epic 01KRFCTF11E54FR98HESTZQNTA
