import { simpleGit, SimpleGit } from "simple-git";
import { repoRoot } from "./paths.js";

let cached: SimpleGit | null = null;

export function git(): SimpleGit {
  if (!cached) cached = simpleGit(repoRoot());
  return cached;
}

export async function currentBranch(): Promise<string> {
  return (await git().revparse(["--abbrev-ref", "HEAD"])).trim();
}

export async function headCommit(): Promise<string> {
  return (await git().revparse(["HEAD"])).trim();
}

export async function defaultBaseBranch(): Promise<string> {
  // Most repos use "main" or "master". Pick whichever exists; default to main.
  const branches = await git().branchLocal();
  if (branches.all.includes("main")) return "main";
  if (branches.all.includes("master")) return "master";
  return "main";
}

export async function createMissionBranch(branch: string): Promise<string> {
  const g = git();
  const base = await defaultBaseBranch();
  // Try to start the mission from the tip of the default branch, falling back
  // to current HEAD if the default branch doesn't exist yet.
  try {
    await g.fetch().catch(() => undefined);
    await g.checkout(base);
  } catch {
    // No default branch available — branch off current HEAD instead.
  }
  const baseCommit = await headCommit();
  await g.checkoutLocalBranch(branch);
  return baseCommit;
}

export async function checkoutBranch(branch: string): Promise<void> {
  await git().checkout(branch);
}

export async function commitAll(message: string): Promise<string | null> {
  const g = git();
  const status = await g.status();
  if (status.isClean()) return null;
  await g.add(["-A"]);
  const res = await g.commit(message);
  return res.commit || (await headCommit());
}

/**
 * Result of inspecting the working tree against a set of "allowed" paths
 * (the files the Worker is recorded to have touched).
 */
export interface ScopeCheck {
  /** Modified/untracked/deleted paths that ARE in the allowed set. Safe to stage. */
  inScope: string[];
  /** Modified/untracked/deleted paths NOT in the allowed set. Contamination. */
  outOfScope: string[];
}

/** Return repo-relative POSIX paths of every entry in `git status --porcelain`,
 *  excluding mission-internal state (`.missions/`) which the MCP server itself
 *  writes and is not part of any Worker's scope.
 */
async function dirtyPaths(): Promise<string[]> {
  const g = git();
  const status = await g.status();
  // status.files is a unified view: [{ path, index, working_dir }]
  const all = new Set<string>();
  for (const f of status.files) {
    if (f.path) all.add(f.path);
  }
  // Also catch renames where simple-git fills `from` and `to`.
  for (const r of status.renamed) {
    if (typeof r === "string") all.add(r);
    else if (r && typeof r === "object" && "to" in r && typeof r.to === "string") all.add(r.to);
  }
  return [...all]
    .map((p) => p.split(/\\|\//).join("/"))
    .filter((p) => !p.startsWith(".missions/") && p !== ".missions");
}

export async function scopeCheck(allowed: Set<string>): Promise<ScopeCheck> {
  const dirty = await dirtyPaths();
  const inScope: string[] = [];
  const outOfScope: string[] = [];
  for (const p of dirty) {
    if (allowed.has(p)) inScope.push(p);
    else outOfScope.push(p);
  }
  return { inScope, outOfScope };
}

/** Stage a specific list of paths and commit. Returns the commit sha, or null if nothing to commit. */
export async function commitOnlyPaths(paths: string[], message: string): Promise<string | null> {
  if (paths.length === 0) return null;
  const g = git();
  // `git add -A <path>` handles modified/created/deleted uniformly for a path.
  for (const p of paths) {
    await g.raw(["add", "-A", "--", p]);
  }
  const status = await g.status();
  if (status.staged.length === 0) return null;
  const res = await g.commit(message);
  return res.commit || (await headCommit());
}

export async function diffSinceBase(branch: string, baseCommit: string): Promise<string> {
  return git().raw(["diff", `${baseCommit}..${branch}`]);
}

export async function diffStatSinceBase(branch: string, baseCommit: string): Promise<string> {
  return git().raw(["diff", "--stat", `${baseCommit}..${branch}`]);
}

export async function mergeMissionBranch(branch: string): Promise<void> {
  const g = git();
  const base = await defaultBaseBranch();
  await g.checkout(base);
  await g.merge(["--no-ff", branch, "-m", `merge ${branch}`]);
}
