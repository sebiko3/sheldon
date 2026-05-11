import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { ulid } from "ulid";

const TMP = mkdtempSync(path.join(tmpdir(), "sheldon-run-assertions-test-"));
execSync("git init -q -b main", { cwd: TMP });
execSync("git -c user.email=t@t -c user.name=t commit -q --allow-empty -m init", { cwd: TMP });
process.env.SHELDON_REPO_ROOT = TMP;

const { runAssertions } = await import("../run-assertions.js");

function seedMission(contract: string): string {
  const id = ulid();
  const dir = path.join(TMP, ".missions", id);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "contract.md"), contract);
  return id;
}

describe("runAssertions", () => {
  it("returns empty results when contract has no frontmatter", async () => {
    const id = seedMission("# no frontmatter\n");
    const out = await runAssertions(id, 1);
    expect(out.has_frontmatter).toBe(false);
    expect(out.results).toHaveLength(0);
    expect(out.summary).toEqual({ passed_count: 0, failed_count: 0, manual_count: 0 });
  });

  it("executes a passing check and reports passed:true", async () => {
    const id = seedMission(`---
assertions:
  - id: trivial-pass
    description: "trivially passes"
    check: "true"
---

body
`);
    const out = await runAssertions(id, 1);
    expect(out.results).toHaveLength(1);
    const r = out.results[0]!;
    expect(r.passed).toBe(true);
    expect(r.manual).toBe(false);
    expect(r.exit_code).toBe(0);
    expect(out.summary.passed_count).toBe(1);
  });

  it("executes a failing check and reports passed:false with captured stderr", async () => {
    const id = seedMission(`---
assertions:
  - id: forced-fail
    description: "forced failure"
    check: "echo broken >&2; exit 1"
---

body
`);
    const out = await runAssertions(id, 1);
    const r = out.results[0]!;
    expect(r.passed).toBe(false);
    expect(r.exit_code).toBe(1);
    expect(r.stderr).toMatch(/broken/);
    expect(out.summary.failed_count).toBe(1);
  });

  it("kills a check that exceeds its timeout and marks it timed_out + failed", async () => {
    const id = seedMission(`---
assertions:
  - id: too-slow
    description: should time out
    check: "sleep 5"
    timeout: 1
---

body
`);
    const out = await runAssertions(id, 1);
    const r = out.results[0]!;
    expect(r.timed_out).toBe(true);
    expect(r.passed).toBe(false);
    expect(r.duration_ms).toBeLessThan(3000);
  }, 8000);

  it("treats assertions with no `check:` as manual (passed:null)", async () => {
    const id = seedMission(`---
assertions:
  - id: needs-thought
    description: validator must reason about this
---

body
`);
    const out = await runAssertions(id, 1);
    const r = out.results[0]!;
    expect(r.manual).toBe(true);
    expect(r.passed).toBeNull();
    expect(out.summary.manual_count).toBe(1);
  });

  it("writes a human-readable checks log next to validation runs", async () => {
    const id = seedMission(`---
assertions:
  - id: a
    description: "first assertion"
    check: "true"
  - id: b
    description: "second assertion"
    check: "false"
---
`);
    const out = await runAssertions(id, 7);
    expect(out.log_path).toBeDefined();
    const log = readFileSync(out.log_path!, "utf8");
    expect(log).toMatch(/\[PASS\] a:/);
    expect(log).toMatch(/\[FAIL\] b:/);
    expect(out.log_path!.endsWith("/007-checks.log")).toBe(true);
  });
});
