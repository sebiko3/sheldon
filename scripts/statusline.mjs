#!/usr/bin/env node
// scripts/statusline.mjs
//
// Sheldon Claude Code statusline. Reads .missions/*/state.json and
// .sheldon/brain/{seed,entries}.jsonl from process.cwd() and prints a single
// line of the form:
//
//   sheldon | mission:<id-short> phase:<phase> brain:<n> last:<pass|fail|—>
//
// A 5-second TTL cache at .sheldon/cache/statusline.json is consulted first so
// that rapid Claude Code repaints don't re-scan disk every frame. The script
// is defensive: every fs read is wrapped in try/catch so it never throws,
// even on a fresh repo with no .missions/ or .sheldon/ directories.

import { readFileSync, readdirSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join } from "node:path";

const CACHE_TTL_MS = 5000;
const EM_DASH = "—";
const ACTIVE_PHASES = new Set([
  "planning",
  "contract_review",
  "implementing",
  "handed_off",
  "validating",
  "validated",
]);

const CWD = process.cwd();
const MISSIONS_DIR = join(CWD, ".missions");
const BRAIN_DIR = join(CWD, ".sheldon", "brain");
const CACHE_DIR = join(CWD, ".sheldon", "cache");
const CACHE_FILE = join(CACHE_DIR, "statusline.json");

function safeReadFile(p) {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

function safeStat(p) {
  try {
    return statSync(p);
  } catch {
    return null;
  }
}

function safeReadDir(p) {
  try {
    return readdirSync(p, { withFileTypes: true });
  } catch {
    return [];
  }
}

function readCachedLine() {
  const st = safeStat(CACHE_FILE);
  if (!st) return null;
  const ageMs = Date.now() - st.mtimeMs;
  if (ageMs > CACHE_TTL_MS || ageMs < 0) return null;
  const raw = safeReadFile(CACHE_FILE);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    return typeof obj.line === "string" ? obj.line : null;
  } catch {
    return null;
  }
}

function writeCache(line) {
  try {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(
      CACHE_FILE,
      JSON.stringify({ generated_at: Date.now(), line }) + "\n",
      "utf8",
    );
  } catch {
    // Caching is best-effort; never fail the statusline because the cache
    // can't be written.
  }
}

function countBrainEntries() {
  let total = 0;
  for (const fname of ["seed.jsonl", "entries.jsonl"]) {
    const raw = safeReadFile(join(BRAIN_DIR, fname));
    if (!raw) continue;
    for (const line of raw.split("\n")) {
      if (line.trim().length > 0) total++;
    }
  }
  return total;
}

function loadMissions() {
  const entries = safeReadDir(MISSIONS_DIR);
  const records = [];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    const statePath = join(MISSIONS_DIR, ent.name, "state.json");
    const raw = safeReadFile(statePath);
    if (!raw) continue;
    let state;
    try {
      state = JSON.parse(raw);
    } catch {
      continue;
    }
    const st = safeStat(statePath);
    records.push({ state, mtimeMs: st ? st.mtimeMs : 0 });
  }
  return records;
}

function pickMission(records) {
  if (records.length === 0) return null;
  const sorted = [...records].sort((a, b) => b.mtimeMs - a.mtimeMs);
  const active = sorted.find((r) => ACTIVE_PHASES.has(r.state?.phase));
  return active ? active.state : sorted[0].state;
}

function renderLastVerdict(state) {
  if (!state) return EM_DASH;
  const runs = Array.isArray(state.validation_runs) ? state.validation_runs : [];
  if (runs.length === 0) return EM_DASH;
  const last = runs[runs.length - 1];
  const v = last && typeof last.verdict === "string" ? last.verdict : null;
  if (v === "pass" || v === "fail") return v;
  return EM_DASH;
}

function renderLine() {
  const missions = loadMissions();
  const picked = pickMission(missions);

  const idShort = picked && typeof picked.id === "string"
    ? picked.id.slice(0, 8)
    : EM_DASH;
  const phase = picked && typeof picked.phase === "string"
    ? picked.phase
    : EM_DASH;
  const brain = countBrainEntries();
  const last = renderLastVerdict(picked);

  return `sheldon | mission:${idShort} phase:${phase} brain:${brain} last:${last}`;
}

function main() {
  const cached = readCachedLine();
  if (cached !== null) {
    process.stdout.write(cached);
    return;
  }
  const line = renderLine();
  writeCache(line);
  process.stdout.write(line);
}

try {
  main();
} catch {
  // Last-resort fallback: never crash a Claude Code statusline render.
  process.stdout.write(
    `sheldon | mission:${EM_DASH} phase:${EM_DASH} brain:0 last:${EM_DASH}`,
  );
}
