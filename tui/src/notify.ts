import { spawn } from "node:child_process";

export function pbcopy(text: string): Promise<void> {
  return new Promise((resolve) => {
    const child = spawn("pbcopy");
    child.on("close", () => resolve());
    child.on("error", () => resolve()); // best-effort; don't crash if pbcopy missing
    child.stdin.write(text);
    child.stdin.end();
  });
}

export function osNotify(title: string, body: string): void {
  // Best-effort macOS Notification Center notification. Silently ignore
  // failures — the TUI is the source of truth, notifications are a nicety.
  const escaped = (s: string) => s.replace(/"/g, '\\"').replace(/\\/g, "\\\\");
  const script = `display notification "${escaped(body)}" with title "${escaped(title)}"`;
  try {
    spawn("osascript", ["-e", script], { stdio: "ignore" });
  } catch {
    // ignore
  }
}
