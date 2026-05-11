# Proposed

- skill: mission-retro
  Value: drafts a one-paragraph postmortem from contract + handoffs + validations
    of a merged or aborted mission. Useful as the closing step of a mission so
    the next mission inherits hard-won lessons.
  Files: skills/mission-retro/SKILL.md (slash command).
  Assertions: skill file exists with valid gray-matter frontmatter; body
    declares `# /sheldon:mission-retro`; description does not contain the
    colon-space gotcha; README row added.
  Deps: none.

- skill + script: contract-lint
  Value: scores a draft contract before approval — counts assertions, flags
    any whose `description` includes `: ` (gray-matter gotcha), flags assertions
    without a `check:` (manual is OK but should be intentional), warns when the
    contract has 0 `check:` lines (no executable validation), warns when
    assertion ids aren't kebab-case. Output: a short report + non-zero exit on
    fatal issues.
  Files: scripts/contract-lint.py (stdlib), skills/contract-lint/SKILL.md.
  Assertions: script exits 0 on a well-formed contract fixture; exits non-zero
    on a known-bad fixture; skill+script discoverable from README.
  Deps: none (stdlib re/yaml-shim).

- script: missions-gc
  Value: lists `aborted` mission branches older than N days (default 14) and
    suggests `git branch -D` for each. Dry-run by default; `--apply` actually
    deletes branches that aren't currently checked out. Keeps `.missions/<id>/`
    state files (they're the audit trail).
  Files: scripts/missions-gc.py, skills/missions-gc/SKILL.md.
  Assertions: dry-run prints "would delete: 0" on a clean repo; supports
    `--days <N>`; exit 0 on dry-run; README row.
  Deps: none.

- hook: post-merge CHANGELOG appender
  Value: PostToolUse on the missions merge transition appends a one-line entry
    to CHANGELOG.md so the project carries a human-readable mission-by-mission
    history alongside `git log`.
  Files: scripts/hooks/post-merge-changelog.sh, hook entry in hooks/hooks.json.
  Assertions: CHANGELOG.md exists after a merge transition; entry format is
    `## YYYY-MM-DD — <mission_id>: <goal>`; hook is wired in hooks.json.
  Deps: none.
  Caveat: hooks/hooks.json is technically not in the do-not-touch list (only
    signatures of tools.ts/schema.ts/settings.json/plugin.json), but adding a
    new hook entry is contract-safe.

- skill: stuck-mission-detector
  Value: scans `.missions/*/state.json` for missions in non-terminal phases
    whose `updated_at` is older than a threshold (default: 60 min) and reports
    them with last-known role. Helps a human (or future Cowork run) decide
    whether to abort or resume.
  Files: scripts/stuck-missions.py + skills/stuck-missions/SKILL.md.
  Assertions: script runs without error; supports `--threshold-minutes <N>`;
    output sorted oldest-first; README row.
  Deps: none.

# Shipped

- 01KRCNRPNBZNGX1YRZ73N8PWKB (2026-05-12, sha a3ae8c4) skill+script: /sheldon:missions-report
  Throughput / health report over `.missions/*/state.json` — phase breakdown,
  14-day throughput, time-to-merge p50/p90/max/mean, rework rate, abort rate,
  recently merged. Stdlib-only Python; safe to run any time. Bundled with a
  `.gitignore` tweak to silence `.claude/settings.local.json`.
