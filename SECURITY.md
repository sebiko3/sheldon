# Security Policy

## Supported versions

Sheldon is currently at `0.1.0`. Only the latest release receives fixes. The project is pre-1.0 — expect breaking changes between minor versions until then.

## Reporting a vulnerability

**Please do not open a public issue for suspected security problems.** Instead, open a [private security advisory](https://github.com/sebiko3/sheldon/security/advisories/new). The maintainer will receive an email and respond as soon as feasible.

If you are unsure whether something is a security issue, opening a private advisory is the safer default.

## Scope

Sheldon runs *inside* Claude Code on the user's local machine. The mission lifecycle never makes outbound network calls of its own — all model inference is handled by Claude Code under the user's subscription. Reports of concern include:

- **Hook injection** — a way for an untrusted contract or mission state to cause a hook script to execute unintended commands.
- **Scope-escape** — a way for the Worker subagent to write to files outside the contract's stated surface without the handoff scope check rejecting it.
- **MCP tool misuse** — a way for any caller to drive the mission state machine into a state the orchestrator wouldn't normally allow (e.g. merging without a passing validator).
- **Brain poisoning** — a way for one project's brain entries to leak into another project's brain through the MCP server.

Out of scope:

- Vulnerabilities in Claude Code itself (report to Anthropic directly).
- Vulnerabilities in third-party dependencies that affect Sheldon only by virtue of being installed (file a regular issue and we'll bump the dep).

## What to include

If you can, include:

- A minimal reproduction.
- The Sheldon version (`bin/sheldon doctor` prints it indirectly via the manifest checks).
- Your operating system and Node version.
- A short description of the impact.

You'll get an acknowledgement within a reasonable time. Coordinated disclosure is welcome — propose a timeline in your initial report.
