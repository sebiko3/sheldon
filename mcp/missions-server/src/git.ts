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
