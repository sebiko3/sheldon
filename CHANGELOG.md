# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-12

### Added

- Mission lifecycle (Orchestrator → Worker → Validator) with branch-per-mission isolation
- Persistent learning layer (.sheldon/brain/) — conventions, lessons, proposals
- Slash commands: /sheldon:mission-*, /sheldon:epic-*, /sheldon:brain-*, /sheldon:contract-lint, /sheldon:missions-report, /sheldon:missions-gc, /sheldon:mission-retro
- GitHub Actions CI (build + test on PRs)
- bin/sheldon doctor diagnostic subcommand
- MIT licensing
