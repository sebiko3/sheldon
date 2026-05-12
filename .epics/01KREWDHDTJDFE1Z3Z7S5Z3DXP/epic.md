---
id: 01KREWDHDTJDFE1Z3Z7S5Z3DXP
brief: >-
  Make Sheldon ready for distribution as a Claude Code plugin that other
  developers can install in their own projects. Cover both Track A (minimum
  credible release) and Track B (actually shippable).
created_at: '2026-05-12T20:00:26.555Z'
issues:
  - id: 1
    title: Add MIT LICENSE file at repo root
    rationale: >-
      README credits MIT-licensed upstream skills (obra/superpowers) and
      implicitly claims MIT distribution. No LICENSE file currently exists in
      tracked code, which makes the plugin legally un-distributable. Track A
      blocker.
    acceptance_sketch:
      - >-
        /Users/sebiko83/code/sheldon/LICENSE exists and contains the SPDX header
        'MIT License' on a line by itself
      - >-
        LICENSE includes a copyright line containing the year 2026 and a holder
        name
      - package.json has a top-level "license" field with value "MIT"
      - .claude-plugin/plugin.json gains a "license" field with value "MIT"
    status: promoted
    promoted_mission_id: 01KREWNYFVVG9KZBV0Q6A6W1A9
  - id: 2
    title: >-
      Flip package.json to public + bump version, add repository/homepage
      metadata
    rationale: >-
      Top-level package.json currently has "private": true and version 0.0.1
      with no repository or homepage metadata — neither npm publish nor Claude
      Code's plugin loader has the signals it needs to treat this as a real
      release. Track A blocker.
    acceptance_sketch:
      - >-
        package.json no longer contains the key "private" (or "private" is set
        to false)
      - 'package.json "version" matches semver ^0\.[1-9]|^[1-9] (i.e. not 0.0.x)'
      - >-
        package.json has non-empty "repository", "bugs", and "homepage" string
        fields
      - >-
        mcp/missions-server/package.json "version" matches the top-level
        package.json "version"
      - >-
        .claude-plugin/plugin.json "version" matches the top-level package.json
        "version"
    status: promoted
    promoted_mission_id: 01KREWX21WC9C8T00SFPZH38R7
  - id: 3
    title: Stop shipping Sheldon-self brain entries to downstream installs
    rationale: >-
      .sheldon/brain/entries.jsonl ships 26 entries about Sheldon's own repo
      (TypeScript, vitest, mcp/missions-server, protected schema.ts, FUSE
      quirks, etc). Every new install inherits that noise as if it were facts
      about THEIR project, poisoning brain_recall from day one. Track A blocker.
      The cleanest mechanical solution: rename the curated file to seed.jsonl,
      gitignore entries.jsonl, and have brain.ts fall back to seed.jsonl only
      when entries.jsonl is absent.
    acceptance_sketch:
      - >-
        ".gitignore contains a line matching exactly
        '.sheldon/brain/entries.jsonl'"
      - >-
        git ls-files | grep -c '\.sheldon/brain/entries.jsonl' returns 0 (file
        is untracked)
      - >-
        .sheldon/brain/seed.jsonl exists in the repo and contains at least 1
        JSONL line that parses as valid JSON
      - >-
        mcp/missions-server/src/brain.ts listEntries() falls back to seed.jsonl
        when entries.jsonl is absent, verified by a fixture test in
        mcp/missions-server/src/__tests__/
      - >-
        After brain_observe creates entries.jsonl in a fresh fixture repo,
        subsequent brain_list returns both the new entry and the seed entries
        (seed is read-only baseline; never written back to)
    status: promoted
    promoted_mission_id: 01KREX23N8CRPHN3DHQKWS8K75
  - id: 4
    title: Add postinstall script that builds the MCP server
    rationale: >-
      When a downstream user runs `npm install` (or Claude Code's plugin manager
      unpacks Sheldon), the MCP server's dist/index.js does not exist until `npm
      run build` is run manually. The .mcp.json references dist/index.js, so the
      first slash command fails confusingly. A postinstall hook closes this gap
      with zero user action.
    acceptance_sketch:
      - >-
        package.json scripts.postinstall is defined and its string value
        contains the substring 'build'
      - >-
        Running 'rm -rf mcp/missions-server/dist && npm install
        --ignore-scripts=false' in a clean clone produces
        mcp/missions-server/dist/index.js
      - >-
        package.json scripts.postinstall does not invoke 'npm install'
        recursively (no infinite loop on nested installs)
      - >-
        package.json scripts.prepare is either absent or identical to
        scripts.postinstall (no conflicting hooks)
    status: promoted
    promoted_mission_id: 01KREXGZ4Q093PDNJ9Z2RX4G09
  - id: 5
    title: >-
      Rewrite README Install section for downstream users + remove hardcoded
      user path
    rationale: >-
      README line 40 currently says `claude --plugin-dir
      /Users/sebiko83/code/sheldon` — a hardcoded user-specific path. The
      Install section is also entirely dev-oriented (assumes a clone).
      Downstream users need a path that does not require cloning Sheldon's repo.
      Track A blocker.
    acceptance_sketch:
      - >-
        grep -r '/Users/sebiko83' /Users/sebiko83/code/sheldon/README.md returns
        no matches
      - >-
        git ls-files | xargs grep -l '/Users/sebiko83' returns no tracked files
        (excluding .claude/settings.local.json which is gitignored)
      - >-
        "README contains an '## Install' or '## Installation' section that
        documents installation without requiring a git clone (e.g. via Claude
        Code plugin manager, npm, or a documented one-liner with a placeholder
        path)"
      - >-
        README Install section explicitly mentions running an MCP server build
        step OR documents that postinstall handles it automatically
    status: promoted
    promoted_mission_id: 01KREXN8E6VPJBQT3T36V8C19J
  - id: 6
    title: 'Add GitHub Actions CI: build + test on PRs'
    rationale: >-
      No .github/ directory exists. Without CI, any contributor PR risks merging
      without proving that `npm run build` and `npm test` still pass. Track B
      baseline. Cheap to add — mostly off-the-shelf workflow YAML.
    acceptance_sketch:
      - .github/workflows/ci.yml exists and parses as valid YAML
      - '"ci.yml triggers on at least ''pull_request'' and ''push'' events"'
      - >-
        "ci.yml runs at minimum: 'npm ci', 'npm run build', and 'npm test
        --workspaces --if-present' (or equivalent commands captured by grep)"
      - ci.yml specifies node-version 20 or later (matches engines field)
      - >-
        ci.yml matrix or single job runs on ubuntu-latest (proves Linux
        compatibility goal)
    status: promoted
    promoted_mission_id: 01KREXTPQX1RXC8APN5Z5MRVM4
  - id: 7
    title: Add `bin/sheldon doctor` diagnostic subcommand
    rationale: >-
      Install-time failures (missing dist/, stale Node, missing plugin manifest,
      missing git binary) are currently invisible — the first slash command just
      fails opaquely. A doctor subcommand inspects the install in one shot,
      listing each check + pass/fail. Cuts support burden once distribution
      begins. Track B.
    acceptance_sketch:
      - >-
        bin/sheldon doctor runs without invoking 'claude' (does not require
        Claude Code installed)
      - >-
        bin/sheldon doctor exits 0 when all checks pass and non-zero when any
        check fails
      - >-
        "bin/sheldon doctor stdout contains lines matching 'node version', 'mcp
        server build', 'plugin manifest', and 'git' (case-insensitive)"
      - >-
        Renaming mcp/missions-server/dist/index.js out of the way causes
        bin/sheldon doctor to exit non-zero with a stderr message naming the
        missing artifact
      - >-
        bin/sheldon (no args) and bin/sheldon doctor share the same shebang and
        pass `bash -n` with no errors
    status: proposed
    promoted_mission_id: null
  - id: 8
    title: Establish CHANGELOG.md + release tagging convention
    rationale: >-
      No CHANGELOG, no semver discipline. Once distributed, every release must
      be traceable. Lightweight Keep-a-Changelog format + a documented `npm
      version` workflow is enough — no need to adopt release-please yet. Track
      B.
    acceptance_sketch:
      - >-
        /Users/sebiko83/code/sheldon/CHANGELOG.md exists and contains a
        top-level header matching '# Changelog'
      - >-
        "CHANGELOG.md contains a section header matching the current
        package.json version (e.g. '## [0.1.0]' or '## 0.1.0')"
      - >-
        "CHANGELOG.md contains either an 'Unreleased' section or a date in ISO
        format on each released version line"
      - >-
        README or a new docs/RELEASING.md documents how to cut a release (at
        minimum: bump versions in 3 manifests, update CHANGELOG, tag git, push)
    status: proposed
    promoted_mission_id: null
  - id: 9
    title: Document macOS-only constraints + guard non-Darwin notify path
    rationale: >-
      README line 113 declares 'macOS only' but does not enumerate why or what
      would change. tui/src/notify.ts shells out to osascript unconditionally
      and will crash or no-op silently on Linux. tui/src/watcher.ts already has
      a non-recursive fallback. A short docs/PLATFORM.md unblocks contributors
      to add Linux support later, and the notify guard at least removes one
      crash vector. Track B; lower priority than 1–7.
    acceptance_sketch:
      - >-
        "docs/PLATFORM.md exists and mentions at minimum: fs.watch recursive
        behavior, osascript usage, and the brain/missions filesystem layout"
      - >-
        tui/src/notify.ts contains a guard that no-ops (does not spawn) when
        process.platform !== 'darwin'
      - >-
        A unit test under tui/src/__tests__/ exercises notify on a stubbed
        non-darwin platform and asserts spawn was not called
      - README 'Platform' section contains a markdown link to docs/PLATFORM.md
    status: proposed
    promoted_mission_id: null
---

# Epic 01KREWDHDTJDFE1Z3Z7S5Z3DXP
