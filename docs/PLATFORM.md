# Platform Support

## Current Status

Sheldon currently targets macOS as its primary platform. The plugin core (slash commands, MCP server, hooks, brain) works on Linux for most use-cases. The TUI has two macOS-specific paths documented below.

## fs.watch — recursive mode

`fs.watch({ recursive: true })` is reliable only on macOS APFS volumes. On Linux, the recursive option is silently ignored by the kernel. `tui/src/watcher.ts` handles this with a try/catch fallback: it attempts `{ recursive: true }` first, then falls back to a non-recursive watch if that throws. This means the TUI on Linux will miss changes inside subdirectories but will not crash.

## osascript — macOS Notification Center

`osascript` is the macOS Notification Center API. `tui/src/notify.ts` uses it to fire desktop notifications when a mission changes phase. On non-darwin platforms this function is a no-op — `process.platform !== "darwin"` causes an early return before the `spawn("osascript", ...)` call.

## Filesystem Layout

All state is stored in standard POSIX paths relative to the project root:

| Path | Purpose |
|------|---------|
| `.missions/<id>/` | Per-mission state (state.json, contract.md, handoffs/, touched.list) |
| `.sheldon/brain/` | Persistent learning layer (entries.jsonl + digest README.md) |
| `.epics/<id>/` | Per-epic proposal files (epic.md with candidate sub-missions) |

These paths work on macOS and Linux alike. No platform-specific separators are used.
