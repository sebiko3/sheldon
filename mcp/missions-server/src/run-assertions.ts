import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Assertion, effectiveTimeout, parseContract } from "./contract.js";
import { missionDir, repoRoot } from "./paths.js";

const STD_CAP = 4 * 1024; // 4 KiB per stream

export interface AssertionResult {
  id: string;
  description: string;
  /** The bash command actually run, or null for prose-only (manual) assertions. */
  check: string | null;
  passed: boolean | null; // null for manual
  manual: boolean;
  exit_code: number | null;
  stdout: string;
  stderr: string;
  duration_ms: number;
  timed_out: boolean;
}

function truncate(s: string, cap: number): string {
  if (s.length <= cap) return s;
  return s.slice(0, cap) + `\n…[truncated, original ${s.length} bytes]`;
}

async function runOne(a: Assertion, cwd: string): Promise<AssertionResult> {
  if (!a.check) {
    return {
      id: a.id,
      description: a.description,
      check: null,
      passed: null,
      manual: true,
      exit_code: null,
      stdout: "",
      stderr: "",
      duration_ms: 0,
      timed_out: false,
    };
  }
  const started = Date.now();
  const timeoutMs = effectiveTimeout(a) * 1000;

  return new Promise((resolve) => {
    const child = spawn("bash", ["-c", a.check!], { cwd });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill("SIGKILL");
      } catch {
        // already exited
      }
    }, timeoutMs);

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("close", (code, _signal) => {
      clearTimeout(timer);
      const exit_code = code ?? (timedOut ? 124 : -1);
      resolve({
        id: a.id,
        description: a.description,
        check: a.check!,
        passed: !timedOut && exit_code === 0,
        manual: false,
        exit_code,
        stdout: truncate(stdout, STD_CAP),
        stderr: truncate(stderr, STD_CAP),
        duration_ms: Date.now() - started,
        timed_out: timedOut,
      });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolve({
        id: a.id,
        description: a.description,
        check: a.check!,
        passed: false,
        manual: false,
        exit_code: -1,
        stdout: "",
        stderr: `spawn error: ${err.message}`,
        duration_ms: Date.now() - started,
        timed_out: timedOut,
      });
    });
  });
}

export interface RunAssertionsOutcome {
  results: AssertionResult[];
  summary: { passed_count: number; failed_count: number; manual_count: number };
  log_path?: string;
  contract_errors: string[];
  has_frontmatter: boolean;
}

function formatLog(results: AssertionResult[]): string {
  const lines: string[] = [];
  for (const r of results) {
    const tag = r.manual ? "MANUAL" : r.passed ? "PASS" : r.timed_out ? "TIMEOUT" : "FAIL";
    lines.push(`[${tag}] ${r.id}: ${r.description}`);
    if (r.check) lines.push(`  $ ${r.check}`);
    if (!r.manual) {
      lines.push(`  exit=${r.exit_code}  ${r.duration_ms}ms${r.timed_out ? "  (timeout)" : ""}`);
      if (r.stdout.trim()) lines.push(`  stdout: ${r.stdout.trim().split("\n").join("\n          ")}`);
      if (r.stderr.trim()) lines.push(`  stderr: ${r.stderr.trim().split("\n").join("\n          ")}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export async function runAssertions(mission_id: string, validation_run_n: number): Promise<RunAssertionsOutcome> {
  const parsed = parseContract(mission_id);
  const results: AssertionResult[] = [];
  for (const a of parsed.data.assertions) {
    results.push(await runOne(a, repoRoot()));
  }
  const summary = {
    passed_count: results.filter((r) => r.passed === true).length,
    failed_count: results.filter((r) => r.passed === false).length,
    manual_count: results.filter((r) => r.manual).length,
  };

  // Write a human-readable log next to the validation run.
  let log_path: string | undefined;
  if (results.length > 0) {
    const dir = path.join(missionDir(mission_id), "validations");
    mkdirSync(dir, { recursive: true });
    log_path = path.join(dir, `${String(validation_run_n).padStart(3, "0")}-checks.log`);
    writeFileSync(log_path, formatLog(results));
  }

  return {
    results,
    summary,
    log_path,
    contract_errors: parsed.errors,
    has_frontmatter: parsed.hasFrontmatter,
  };
}
