import { watch, existsSync, mkdirSync, FSWatcher } from "node:fs";
import path from "node:path";
import { missionsDir } from "./missions.js";

export interface Watcher {
  close(): void;
}

// Watch .missions/ recursively. We use fs.watch with { recursive: true } which
// is reliable on macOS APFS. If the dir doesn't exist yet, create it so the
// watcher has something to attach to (state files will appear as missions are
// created).
export function watchMissions(repoRoot: string, onChange: () => void): Watcher {
  const dir = missionsDir(repoRoot);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  let timer: NodeJS.Timeout | null = null;
  const debounced = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      onChange();
    }, 75);
  };

  let watcher: FSWatcher;
  try {
    watcher = watch(dir, { recursive: true }, debounced);
  } catch {
    // Fall back to non-recursive watch on top dir if recursive fails for any
    // reason (rare on macOS but defensive).
    watcher = watch(dir, debounced);
  }

  // Also fire an initial change so the UI populates on mount.
  setImmediate(onChange);

  return {
    close() {
      if (timer) clearTimeout(timer);
      try {
        watcher.close();
      } catch {
        // already closed
      }
    },
  };
}

export function relMissions(repoRoot: string, p: string): string {
  return path.relative(missionsDir(repoRoot), p);
}
