---
id: 01KRDEA0DDB8SMSJEGX6DSTQG0
brief: >-
  further improve sheldon by adding new features such as hooks, agents and
  skills. Think about this deeply and only if it makes sense.
created_at: '2026-05-12T06:34:36.334Z'
issues:
  - id: 1
    title: Ship cowork singleton-guard script to prevent concurrent-run races
    rationale: >-
      The highest-confidence brain proposal (entry 01KRCS0BH41PKSWMQ8WAE2JZZW,
      evidence 01KRCR9GG78PM3KNHZ0JSPQC2Z) — two cowork sessions raced past Step
      1 on 2026-05-12T00:11Z, one mission was wasted, the other hit FUSE
      git-lock contention. Sheldon already learned this and proposed the fix in
      its own brain; promoting it closes the loop.
    acceptance_sketch:
      - >-
        scripts/cowork-singleton-check.py exists, is executable, stdlib-only
        Python
      - >-
        Exit 0 when no non-terminal mission in .missions/*/state.json is younger
        than --max-age-minutes (default 10); exit 2 when one is detected
      - >-
        Supports --max-age-minutes <N> flag; rejects unknown flags with non-zero
        exit
      - >-
        docs/cowork-hourly-prompt.md is updated to instruct the routine to honor
        exit 2 as a skip-signal
    status: promoted
    promoted_mission_id: 01KRDF1MCBK80KMCM2BXPSE9M3
  - id: 2
    title: >-
      Promote orchestrator brain-improvement: contract-lint before
      write_contract
    rationale: >-
      Brain entry 01KRCS0BH4KBWHV3WD6K8E2YJN (agent-improvement, medium
      confidence) — the orchestrator should mechanically run
      /sheldon:contract-lint on its draft contract before calling
      write_contract, instead of trusting itself to remember the colon-space
      lesson and the no-zero-executable-assertions invariant. Now that
      contract-lint is shipped, this is the right moment to wire it in. The
      brain explicitly tagged this as needing promotion.
    acceptance_sketch:
      - >-
        agents/orchestrator.md contains an explicit step after drafting the
        contract that runs scripts/contract-lint.py (or python3
        ${CLAUDE_PLUGIN_ROOT}/scripts/contract-lint.py) and refuses to proceed
        on non-zero exit
      - grep -q 'contract-lint' agents/orchestrator.md returns 0
      - >-
        The new step is placed BEFORE the
        mcp__plugin_sheldon_missions__write_contract call in the
        When-mission-new flow
      - No mutation to validator.md or worker.md (scope discipline)
    status: promoted
    promoted_mission_id: 01KRDG1DKFK3W5F2EAMZCXY8W4
  - id: 3
    title: 'Add /sheldon:mission-retro skill for one-paragraph postmortems'
    rationale: >-
      Proposed in docs/cowork-ideas.md (top of the Proposed list). Closes the
      mission with a structured postmortem that complements /sheldon:brain-learn
      — brain-learn captures durable rules, mission-retro captures the narrative
      of what happened. Useful for human review and for feeding cowork-log.md
      entries.
    acceptance_sketch:
      - >-
        skills/mission-retro/SKILL.md exists with valid gray-matter frontmatter
        (description quoted if it contains the substring ': ')
      - >-
        Body declares the header '# /sheldon:mission-retro' and accepts a
        mission_id from $ARGUMENTS
      - >-
        scripts/mission-retro.py exists (stdlib-only Python) and produces
        non-empty markdown on a happy-path merged mission already present in
        .missions/
      - 'README.md table has a new row for /sheldon:mission-retro'
    status: promoted
    promoted_mission_id: 01KRDG9FQ1RDVNWCV0EFKW1BCJ
  - id: 4
    title: 'Add /sheldon:missions-gc skill + script for aborted mission branch cleanup'
    rationale: >-
      Proposed in docs/cowork-ideas.md. The .missions/ tree and aborted
      mission/<id> branches accumulate; today nothing prunes them.
      Dry-run-by-default is safe for the cowork loop to run periodically without
      violating the destructive-git hard rule.
    acceptance_sketch:
      - 'scripts/missions-gc.py exists, stdlib-only Python, executable'
      - >-
        Dry-run is the default (no flag = no deletions); --apply triggers actual
        git branch -D
      - Supports --days <N> (default 14); prints a 'would delete' summary line
      - >-
        Never deletes the currently checked-out branch (refuses with non-zero
        exit if asked)
      - >-
        skills/missions-gc/SKILL.md exists with quoted frontmatter; README.md
        row added
    status: promoted
    promoted_mission_id: 01KRDH26YJSRHX6M6XCVK2DVDA
  - id: 5
    title: Add brain dedup utility to fold near-duplicate entries
    rationale: >-
      Recall today is plain substring AND-match over topic+text; nothing
      prevents the brain from accumulating semantic duplicates as missions
      accrue. A read-only dedup reporter that lists candidate duplicate pairs
      (same type plus token-overlap above a threshold) lets a human or the
      orchestrator file `supersedes` entries through the existing observe API.
      Decision stays human-gated (no auto-superseding) so the brain stays
      trustworthy.
    acceptance_sketch:
      - >-
        scripts/brain-dedup.py exists, stdlib-only Python, read-only (never
        writes to .sheldon/brain/)
      - >-
        Outputs candidate duplicate pairs as 'pair: <id_a> | <id_b>  type=<t> 
        overlap=<0.0-1.0>' lines, one per pair
      - >-
        Supports --threshold <0.0-1.0> (default 0.6) and --type
        <convention|lesson|proposal|agent-improvement>
      - >-
        Exits 0 on success even when duplicates are found (it is a report, not a
        gate); exits non-zero only on read errors
      - >-
        skills/brain-dedup/SKILL.md exists with quoted frontmatter; README row
        added
    status: promoted
    promoted_mission_id: 01KRDHDE59MP45TSBEX5M3VKBY
  - id: 6
    title: Add pre-merge scope-creep advisory hook
    rationale: >-
      Suggested in cowork-hourly-prompt.md menu B. Today scope discipline is
      enforced at handoff time (touched.list vs working tree). A complementary
      pre-merge check flags a mission/<id> diff that touches files outside the
      contract's stated surface — catching scope creep that survived handoff.
      Read-only and advisory (warns but does not block) to avoid false positives
      on legitimate refactors.
    acceptance_sketch:
      - scripts/hooks/pre-merge-scope-check.sh exists and is executable
      - >-
        A new hook entry is appended to hooks/hooks.json that invokes the new
        script; the existing PreToolUse, PostToolUse, and SubagentStop entries
        are unchanged byte-for-byte
      - >-
        When run on a mission whose diff touches files outside any contract grep
        pattern, the script prints 'sheldon: scope-creep advisory' to stderr
        with exit 0 (advisory, non-blocking)
      - 'When run on a clean in-scope mission, prints nothing and exits 0'
      - >-
        Does NOT mutate hooks.json's existing hook entries — only adds a new
        block
    status: proposed
    promoted_mission_id: null
---

# Epic 01KRDEA0DDB8SMSJEGX6DSTQG0
