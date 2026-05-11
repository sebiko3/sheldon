import { watch, existsSync, mkdirSync, FSWatcher } from "node:fs";
import path from "node:path";
import { missionsDir } from "./missions.js";
import { epicsDir } from "./epic-store.js";

export interface Watcher {
  close(): void;
}

function makeWatcher(dir: string, debounced: () => void): FSWatcher {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  try {
    return watch(dir, { recursive: true }, debounced);
  } catch {
    return watch(dir, debounced);
  }
}

// Watch .missions/ and .epics/ recursively. We use fs.watch with
// { recursive: true } which is reliable on macOS APFS. If the dirs don't
// exist yet, create them so the watcher has something to attach to.
export function watchMissions(repoRoot: string, onChange: () => void): Watcher {
  let timer: NodeJS.Timeout | null = null;
  const debounced = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = null;
      onChange();
    }, 75);
  };

  const missionsWatcher = makeWatcher(missionsDir(repoRoot), debounced);
  const epicsWatcher = makeWatcher(epicsDir(repoRoot), debounced);

  // Also fire an initial change so the UI populates on mount.
  setImmediate(onChange);

  return {
    close() {
      if (timer) clearTimeout(timer);
      try {
        missionsWatcher.close();
      } catch {
        // already closed
      }
      try {
        epicsWatcher.close();
      } catch {
        // already closed
      }
    },
  };
}

export function relMissions(repoRoot: string, p: string): string {
  return path.relative(missionsDir(repoRoot), p);
}
