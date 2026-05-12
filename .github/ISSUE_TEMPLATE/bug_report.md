---
name: Bug report
about: Something is broken in the mission loop, the MCP server, or the TUI.
title: "[bug] "
labels: bug
---

## What happened

<!-- One or two sentences. What did you see vs. what did you expect? -->

## Reproduction

<!-- The exact slash command(s) or shell command(s) you ran, in order. -->

```
/sheldon:mission-new "..."
```

## Environment

- Sheldon version (from `package.json` or `bin/sheldon doctor`): 
- OS and version (macOS 14.5, Ubuntu 22.04, …): 
- Node version (`node --version`): 
- Claude Code version (if known): 

## Diagnostics

Output of `bin/sheldon doctor`:

```
<paste here>
```

## Mission state (if applicable)

If the bug is mission-related, the mission id helps: `mcp__plugin_sheldon_missions__list` or `cat .missions/<id>/state.json`.

```
<paste relevant state.json keys here>
```

## Anything else

<!-- Logs, screenshots, hunches. -->
