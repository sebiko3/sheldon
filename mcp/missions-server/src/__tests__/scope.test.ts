import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";

const TMP = mkdtempSync(path.join(tmpdir(), "sheldon-scope-test-"));
execSync("git init -q -b main", { cwd: TMP });
execSync("git -c user.email=t@t -c user.name=t commit -q --allow-empty -m init", { cwd: TMP });
process.env.SHELDON_REPO_ROOT = TMP;

// Import AFTER env is set — git.ts caches the simpleGit instance to repoRoot().
const { scopeCheck } = await import("../git.js");

describe("scopeCheck", () => {
  it("classifies dirty files as in-scope vs out-of-scope", async () => {
    mkdirSync(path.join(TMP, "src"), { recursive: true });
    writeFileSync(path.join(TMP, "src/touched.ts"), "x\n");
    writeFileSync(path.join(TMP, "src/contamination.ts"), "y\n");

    const allowed = new Set<string>(["src/touched.ts"]);
    const result = await scopeCheck(allowed);

    expect(result.inScope).toContain("src/touched.ts");
    expect(result.outOfScope).toContain("src/contamination.ts");
    expect(result.outOfScope).not.toContain("src/touched.ts");
  });

  it("never reports .missions/ paths as dirty (unconditional exclusion)", async () => {
    // Write a state-like file under .missions/ — without .gitignore, git would
    // normally see it as untracked. scopeCheck must filter it.
    mkdirSync(path.join(TMP, ".missions/01XYZ"), { recursive: true });
    writeFileSync(path.join(TMP, ".missions/01XYZ/state.json"), "{}\n");

    const result = await scopeCheck(new Set());
    expect(result.inScope.some((p) => p.startsWith(".missions/"))).toBe(false);
    expect(result.outOfScope.some((p) => p.startsWith(".missions/"))).toBe(false);
  });
});
