import { simpleGit } from "simple-git";

export async function diffStat(
  repoRoot: string,
  branch: string,
  baseCommit: string,
): Promise<string> {
  try {
    const g = simpleGit(repoRoot);
    return await g.raw(["diff", "--stat", `${baseCommit}..${branch}`]);
  } catch (err) {
    return `(no diff available: ${(err as Error).message.split("\n")[0]})`;
  }
}

export async function lastCommitSubject(repoRoot: string, branch: string): Promise<string> {
  try {
    const g = simpleGit(repoRoot);
    return (await g.raw(["log", "-1", "--pretty=%s", branch])).trim();
  } catch {
    return "";
  }
}
