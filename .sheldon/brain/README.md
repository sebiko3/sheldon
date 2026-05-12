# Sheldon brain

Auto-generated from `.sheldon/brain/entries.jsonl`. Do not edit by hand — use the `brain_observe` MCP tool or `/sheldon:brain-learn`.

## Project conventions

Project-specific facts Sheldon has learned while working here (build tools, test runners, style rules, layout).

- **distribution:self-marketplace** [high] _(evidence: 01KRF7KJNBSQVBTVXMEWVKC5G2)_
  Claude Code plugins distribute via the built-in marketplace system. A repo can serve as its own single-plugin marketplace by adding .claude-plugin/marketplace.json with name/owner/plugins where the sheldon entry uses source: "./" (NOT "." — claude plugin validate only accepts the trailing-slash form). Users install with two commands: claude plugin marketplace add <owner>/<repo>; claude plugin install sheldon. No --plugin-dir needed; plugin auto-loads across all Claude Code sessions.

- **landing-page:zero-build** [high] _(evidence: 01KRF0GSKTQP83TYGRSBF525RF)_
  The GitHub Pages landing lives at docs/index.html + docs/assets/{style.css,main.js,og-image.png}. .nojekyll disables Jekyll so existing docs/*.md files stay accessible as raw markdown. No framework, no npm build step, no CDN. Total critical-path under 200KB.

- **releases:three-manifests-plus-changelog** [high] _(evidence: 01KREY3T509B6D3M4J40GYJSHV)_
  A Sheldon release bumps versions in three manifests in lockstep (package.json, mcp/missions-server/package.json, .claude-plugin/plugin.json), flips CHANGELOG Unreleased → dated version, creates annotated git tag v<version>, pushes with --follow-tags. docs/RELEASING.md is the canonical procedural reference.

- **distribution:postinstall-builds-mcp** [high] _(evidence: 01KREXGZ4Q093PDNJ9Z2RX4G09)_
  Top-level package.json has postinstall=npm run build --workspace mcp/missions-server so users do not have to remember a manual build step. Downstream installs are one npm install away from a working MCP server.

- **brain-tools:read-only-default** [high] _(evidence: 01KRDHDE59MP45TSBEX5M3VKBY)_
  Brain-adjacent scripts (brain-dedup, future brain-search/etc) are read-only on .sheldon/brain/ by construction. Mutation happens exclusively through mcp__plugin_sheldon_missions__brain_observe (which routes through brain.ts and appends to entries.jsonl atomically). This invariant is mechanically enforced: never-writes-brain assertion greps for write-mode open calls against brain paths.

- **contract-assertions:fixture-based-behavior** [high] _(evidence: 01KRDH26YJSRHX6M6XCVK2DVDA)_
  When a contract assertion needs to probe a behavior boundary that depends on real-world state (timestamps, branch ages, etc.), build a synthetic fixture in a temp directory instead of relying on extreme flag values. Pattern: mktemp; git init; create synthetic .missions/<id>/state.json with the timestamp/phase you want to probe; invoke the script against the temp dir; assert on stdout. Pinning behavior via fixtures prevents the kind of semantic inversion that killed mission 01KRDGPZY9R0KJHPS4X9ZW7JHS.

- **mission-state-json:validation-tallies** [high] _(evidence: 01KRDG9FQ1RDVNWCV0EFKW1BCJ)_
  .missions/<id>/state.json validation_runs[] contains verdict pre-extracted by the orchestrator. Scripts reading mission outcomes can use it as the authoritative tally source — no need to also parse validations/*.md, which contain only the findings prose.

- **orchestrator:lint-before-write** [high] _(evidence: 01KRDG1DKFK3W5F2EAMZCXY8W4)_
  When writing a contract, the Orchestrator writes the draft to .missions/<id>/contract.md, runs python3 ${CLAUDE_PLUGIN_ROOT:-.}/scripts/contract-lint.py on it via Bash, and refuses to proceed to write_contract if it exits non-zero. This is now codified in agents/orchestrator.md step 5 of the /sheldon:mission-new flow.

- **missions-dir-gitignored** [high] _(evidence: 01KRCR9GG78PM3KNHZ0JSPQC2Z)_
  The plugin repo .gitignore lists .missions/ — per-mission state files (state.json, contract.md, handoffs/, validations/) live only in the working tree and never get committed. Mission artifacts on the mission branch are limited to the actual deliverables (scripts/, skills/, README.md, etc.). Do not git add .missions/<id>/ during the worker phase.

- **comments** [high]
  Default to writing no comments. Add one only when the WHY is non-obvious (hidden constraint, subtle invariant, workaround for a specific bug).

- **tests** [high]
  mcp/missions-server uses vitest. Spec files live under src/__tests__/*.test.ts and run via npm test --workspace mcp/missions-server.

- **agents:protected-files** [high]
  Cowork loop never modifies settings.json, .claude-plugin/plugin.json, or node_modules/. The brain inherits the same default: propose changes via missions, do not auto-edit.

- **build** [high]
  mcp/missions-server is built with tsc -p tsconfig.json. Run npm run build --workspace mcp/missions-server before declaring TypeScript changes complete.

- **agents:protected-signatures** [high]
  Do not mutate signatures of mcp/missions-server/src/schema.ts or src/tools.ts (existing exported handlers/schemas). Adding new files, new exports, and new tool registrations is fine; changing existing ones breaks downstream callers.

- **language** [high]
  Use TypeScript when possible. Plain JS modules are not added; existing JS is acceptable to leave alone.

## Lessons

Meta-rules distilled from past mission outcomes — apply these to future contracts and implementations.

- **contract-yaml:bash-hex-escapes** [high] _(evidence: 01KRF7D7XTH8DNZEVTFQGH16E6)_
  Bash grep does NOT interpret \x22/\x27 hex escapes inside the regex unless wrapped in ANSI-C quoting ($"..."). Putting them in a plain check: value makes grep search for the literal characters \x22 and \x27, which never match real source. Caught on mission 01KRF7D7XTH8DNZEVTFQGH16E6 — two regression checks failed because of this. Use simple greps or python re for character-class assertions.

- **stdlib-png-generation** [high] _(evidence: 01KRF1SGE8G3CSZHVFNQTDERNK)_
  PIL is not stdlib. To generate small PNGs (e.g. og-images, badges) from pure-stdlib Python: use struct + zlib to write magic bytes, IHDR chunk (width/height/bit-depth/color-type), IDAT chunk (zlib-compressed scanlines with leading filter byte), IEND. CRC32 each chunk type+data. A 1200x630 RGB image with mostly-uniform background compresses to <10KB even with random pixel noise. scripts/gen-og-image.py is the reference implementation.

- **brain:seed-vs-entries-split** [high] _(evidence: 01KREX23N8CRPHN3DHQKWS8K75)_
  For per-project state where some content is team-shared (the curated baseline) and some is per-environment (accumulated observations), use a two-file split: tracked seed.jsonl + gitignored entries.jsonl. listEntries() concatenates seed then entries. observe() writes only to entries. Tombstones in entries can supersede seed entries via last-write-wins fold. Pattern applies beyond the brain.

- **distribution:license-first** [high] _(evidence: 01KREWNYFVVG9KZBV0Q6A6W1A9)_
  A LICENSE file at the repo root is the cheapest distribution unblocker — single mission, half a dozen assertions, makes the difference between legally distributable and not. Always ship this before announcing anything.

- **contract-yaml:check-value-colon-space** [high] _(evidence: 01KREWNYFVVG9KZBV0Q6A6W1A9)_
  The YAML colon-space gotcha applies to check: values, not just description: values. If a check command embeds a literal ": " substring (e.g. grep -q "foo: bar" file), the value must be double-quoted at the YAML level (check: "grep -q ..."). Otherwise gray-matter parses the ": " as a key-value separator and run_assertions returns 0 results. Caught on mission 01KREWNYFVVG9KZBV0Q6A6W1A9. Supersedes the narrower lesson 01KRCPXS4XQWWGDFH91HY6YFZ3.

- **mcp-server:write_contract-no-self-transition** [high] _(evidence: 01KRDHSM5J2AW5TWMREKRVX8SS)_
  mcp__plugin_sheldon_missions__write_contract throws "Illegal phase transition: contract_review → contract_review" if called while already in contract_review. The state machine has no self-loop for that phase. Workaround for the orchestrator: write directly to .missions/<id>/contract.md (the main thread is allowed to write there; the PreToolUse hook only blocks subagents). Better fix would be a write_contract that allows in-place rewriting before approve.

- **contract-yaml:heredoc-three-hyphens** [high] _(evidence: 01KRDHSM5J2AW5TWMREKRVX8SS)_
  Do NOT put literal three-hyphen sequences inside YAML block scalars (| or > literals) in a contract — gray-matter and PyYAML can mistake them for frontmatter delimiters, silently truncating the assertion list. Workaround: build any fixture contract.md body via printf in the check script instead of a heredoc that includes triple-dash. Caught on mission 01KRDHSM5J2AW5TWMREKRVX8SS — only 8 of 11 assertions parsed initially.

- **contract-assertion-vs-goal-consistency** [high] _(evidence: 01KRDGPZY9R0KJHPS4X9ZW7JHS)_
  Mechanical assertions must be consistent with the goal text. On mission 01KRDGPZY9R0KJHPS4X9ZW7JHS the goal said "older than --days N" but the assertion would-delete-output used --days 99999 | grep "would delete" — under correct semantics that captures nothing, so the worker inverted the semantics to satisfy the mechanical check. Mitigation: when writing assertions that probe behavior boundaries, anchor on fixture state (write a synthetic state.json with a known-old updated_at) rather than picking extreme flag values that depend on implementation semantics matching your mental model.

- **epic-promote:dirty-tree** [high] _(evidence: 01KRDF1MCBK80KMCM2BXPSE9M3)_
  mcp__plugin_sheldon_missions__epic_promote_issue branches the new mission off main and THEN flips the issue status to promoted in .epics/<epic>/epic.md, leaving that file dirty on the mission branch without an entry in touched.list. Worker handoff refuses with contamination error. Mitigation: as Orchestrator, commit the epic.md edit on the mission branch BEFORE calling handoff (it is legitimate mission state — the promotion is the point of the mission). The gray-matter serializer reformats the YAML into folded block scalars, which is cosmetic but expected.

- **fuse:unlink-prohibited** [high] _(evidence: 01KRCR9GG78PM3KNHZ0JSPQC2Z)_
  The cowork session mounts /Users/.../code/sheldon via virtiofs/FUSE with default_permissions, which allows write+rename but prohibits unlink for files created by other sandboxes (and sometimes for files created by git within the same sandbox). Git commands that need to remove .git/index.lock, .git/HEAD.lock, or tmp_obj_* fail with Operation not permitted, leaving stale locks. Workaround: wrap git invocations in a script that python-renames any stale .git/*.lock files out of the way before and after each call. checkout/restore that need to remove worktree files also fail; merging via low-level commit-tree + update-ref + manual .git/HEAD write is reliable.

- **cowork:concurrency** [high] _(evidence: 01KRCR9GG78PM3KNHZ0JSPQC2Z)_
  Two cowork sessions can race past Step 1 if they both survey state within the same few seconds — both will see zero non-terminal missions and proceed. The second-to-mark mission is wasted work. Mitigation: add a singleton-guard check at the very top of the routine that re-checks .missions/*/state.json for a non-terminal mission younger than ~10 minutes and exits with skip if found. ULID order is the natural tie-breaker (older ULID wins).

- **skill-attribution** [high]
  Attribution for ported skills lives in README.md, not in SKILL.md footers. Trailing metadata inside a skill body competes with its instructions for the model attention and degrades skill performance.

- **subagent-permissions** [high]
  Subagent MCP tool calls require explicit allow-list entries in the agent frontmatter tools list. Missing entries cause tool_use to be silently dropped — the subagent appears to skip the call with no error.

## Agent improvements

Proposed or applied tweaks to `agents/*.md`. Workers/Validators should not auto-apply; the Orchestrator promotes these into missions.

- **agent:orchestrator** [low] _(evidence: 01KRDHSM5J2AW5TWMREKRVX8SS)_
  When extracting scope-creep paths from a contract, the new pre-merge-scope-check hook will fire an advisory for the orchestrator-committed .epics/<id>/epic.md unless the contract explicitly mentions .epics/ or the specific epic path. Consider adding the epic path to the contract Notes section as a routine practice so the new hook does not generate false-positive advisories.

## Capability proposals

Net-new capabilities (skills, hooks, scripts, agents) the brain has identified as worth shipping. Surface via brain_recall --type proposal; promote into missions.

- **og-image:typography** [low] _(evidence: 01KRF1SGE8G3CSZHVFNQTDERNK)_
  Current og-image.png is a starfield with no text. A polish mission could render the word SHELDON via hand-coded 7-letter pixel glyphs (no font library needed) for better social previews. Optional follow-up.

- **readme:repo-url-consistency** [medium] _(evidence: 01KREXN8E6VPJBQT3T36V8C19J)_
  README Install section uses your-org/sheldon as a placeholder repo URL, while package.json/plugin.json now point to github.com/sebiko3/sheldon. Make them consistent — either standardize on a real org or universally use a placeholder. Cosmetic, but readers will paste your-org and 404.

- **contract-lint:check-value-colon-space** [high] _(evidence: 01KREWNYFVVG9KZBV0Q6A6W1A9)_
  scripts/contract-lint.py currently only flags unquoted colon-space in description: values. Extend it to also flag the same pattern in check: values. Would have caught mission 01KREWNYFVVG9KZBV0Q6A6W1A9 contract before approval.

- **mcp-server:write_contract-self-transition** [medium] _(evidence: 01KRDHSM5J2AW5TWMREKRVX8SS)_
  Patch mcp/missions-server/src/tools.ts handleWriteContract to allow contract_review → contract_review (no-op transition) so the orchestrator can iterate on a draft before approving. Currently the orchestrator has to side-step the MCP API by writing the file directly. One-line tools.ts fix: skip the transitionPhase call when state.phase is already contract_review.

- **mission-retro:full-handoff-paragraph** [medium] _(evidence: 01KRDG9FQ1RDVNWCV0EFKW1BCJ)_
  scripts/mission-retro.py summarise_handoffs() extracts only the first paragraph of each handoff. When handoffs begin with a bare title line (e.g., "# Worker handoff — ID"), the synthesis field shows only that title. Improve by skipping leading heading-only paragraphs or by extracting from the first prose paragraph. Caught on mission 01KRDG9FQ1RDVNWCV0EFKW1BCJ.

- **cowork-singleton-check:parse_iso-non-string** [medium] _(evidence: 01KRDF1MCBK80KMCM2BXPSE9M3)_
  scripts/cowork-singleton-check.py parse_iso() crashes with AttributeError when state.json has a non-string created_at (e.g., integer timestamp), producing exit 1 + traceback. Add an isinstance(ts, str) guard. Caught by validator on mission 01KRDF1MCBK80KMCM2BXPSE9M3 — non-blocking, but worth a 1-line follow-on.

- **cowork-singleton-check:negative-max-age** [medium] _(evidence: 01KRDF1MCBK80KMCM2BXPSE9M3)_
  scripts/cowork-singleton-check.py accepts negative --max-age-minutes silently; the cutoff moves into the future and the guard becomes a no-op. Add a > 0 argparse validator. Caught by validator on mission 01KRDF1MCBK80KMCM2BXPSE9M3.

- **cowork:singleton-guard** [high] _(evidence: 01KRCR9GG78PM3KNHZ0JSPQC2Z)_
  Ship a scripts/cowork-singleton-check.py helper invoked at Step 1 of the hourly routine: scans .missions/*/state.json for any mission in a non-terminal phase whose created_at is within --max-age-minutes (default 10). Exit 0 = no peer detected, exit 2 = skip-signal. Routine treats exit 2 as a clean skip with reason=concurrent-run. Prevents the race observed at 2026-05-12T00:11Z (two sessions both picked /sheldon:contract-lint, one was wasted, one struggled with git lock contention on FUSE).
