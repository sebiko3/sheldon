import { ulid } from "ulid";
import { z } from "zod";
import {
  commitAll,
  createMissionBranch,
  diffStatSinceBase,
  diffSinceBase,
  headCommit,
  mergeMissionBranch,
  checkoutBranch,
} from "./git.js";
import {
  listMissions,
  loadMission,
  readContract,
  saveMission,
  transitionPhase,
  writeContract,
  writeHandoffSummary,
  writeValidationFindings,
} from "./state.js";
import { MissionState } from "./schema.js";

const nowIso = () => new Date().toISOString();

function ok(payload: unknown): { content: { type: "text"; text: string }[] } {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

function fail(message: string): never {
  throw new Error(message);
}

// ── create ───────────────────────────────────────────────────────────────────
export const createInput = z.object({ goal: z.string().min(1, "goal required") });
export async function handleCreate(input: z.infer<typeof createInput>) {
  const id = ulid();
  const branch = `mission/${id}`;
  const baseCommit = await createMissionBranch(branch);
  const state: MissionState = {
    id,
    goal: input.goal,
    phase: "planning",
    branch,
    base_commit: baseCommit,
    created_at: nowIso(),
    updated_at: nowIso(),
    current_role: "orchestrator",
    contract_path: `.missions/${id}/contract.md`,
    handoffs: [],
    validation_runs: [],
  };
  writeContract(id, `# Validation contract — mission ${id}\n\nGoal: ${input.goal}\n\n_(orchestrator: replace this with numbered, executable assertions)_\n`);
  saveMission(state);
  return ok({ mission_id: id, branch, base_commit: baseCommit, contract_path: state.contract_path });
}

// ── read ─────────────────────────────────────────────────────────────────────
export const readInput = z.object({ mission_id: z.string() });
export async function handleRead(input: z.infer<typeof readInput>) {
  const state = loadMission(input.mission_id);
  const contract = readContract(input.mission_id);
  let diff_stat = "";
  try {
    diff_stat = await diffStatSinceBase(state.branch, state.base_commit);
  } catch {
    // Branch may not have diverged yet.
  }
  return ok({ state, contract, diff_stat });
}

// ── list ─────────────────────────────────────────────────────────────────────
export const listInput = z.object({ phase: z.string().optional() }).strict();
export async function handleList(input: z.infer<typeof listInput>) {
  const all = listMissions();
  const filtered = input.phase ? all.filter((m) => m.phase === input.phase) : all;
  return ok({
    count: filtered.length,
    missions: filtered.map((m) => ({
      id: m.id,
      phase: m.phase,
      branch: m.branch,
      goal: m.goal,
      current_role: m.current_role,
      created_at: m.created_at,
      handoffs: m.handoffs.length,
      validation_runs: m.validation_runs.length,
    })),
  });
}

// ── write_contract ───────────────────────────────────────────────────────────
export const writeContractInput = z.object({
  mission_id: z.string(),
  contract: z.string().min(1),
});
export async function handleWriteContract(input: z.infer<typeof writeContractInput>) {
  const state = loadMission(input.mission_id);
  if (state.phase !== "planning" && state.phase !== "contract_review") {
    fail(`Cannot rewrite contract in phase=${state.phase}; only planning or contract_review allowed.`);
  }
  writeContract(input.mission_id, input.contract);
  const next = transitionPhase({ ...state }, "contract_review");
  saveMission(next);
  return ok({ ok: true, phase: next.phase, contract_path: state.contract_path });
}

// ── approve ──────────────────────────────────────────────────────────────────
export const approveInput = z.object({ mission_id: z.string() });
export async function handleApprove(input: z.infer<typeof approveInput>) {
  const state = loadMission(input.mission_id);
  if (state.phase !== "contract_review") {
    fail(`Cannot approve in phase=${state.phase}; expected contract_review.`);
  }
  const next = transitionPhase({ ...state, current_role: "worker" }, "implementing");
  saveMission(next);
  return ok({ ok: true, phase: next.phase, branch: next.branch });
}

// ── handoff (worker → orchestrator) ──────────────────────────────────────────
export const handoffInput = z.object({
  mission_id: z.string(),
  summary: z.string().min(1, "handoff summary required"),
});
export async function handleHandoff(input: z.infer<typeof handoffInput>) {
  const state = loadMission(input.mission_id);
  if (state.phase !== "implementing") {
    fail(`Cannot hand off in phase=${state.phase}; expected implementing.`);
  }
  await checkoutBranch(state.branch).catch(() => undefined);
  const commit = (await commitAll(`mission ${state.id}: handoff`)) ?? (await headCommit());
  const n = state.handoffs.length + 1;
  const summaryPath = writeHandoffSummary(state.id, n, input.summary);
  const next = transitionPhase(
    {
      ...state,
      current_role: "orchestrator",
      handoffs: [
        ...state.handoffs,
        { from: "worker", to: "orchestrator", commit, summary_path: summaryPath, at: nowIso() },
      ],
    },
    "handed_off",
  );
  saveMission(next);
  return ok({ ok: true, phase: next.phase, commit, summary_path: summaryPath });
}

// ── start_validation (orchestrator transitions handed_off → validating) ──────
export const startValidationInput = z.object({ mission_id: z.string() });
export async function handleStartValidation(input: z.infer<typeof startValidationInput>) {
  const state = loadMission(input.mission_id);
  if (state.phase !== "handed_off") {
    fail(`Cannot start validation in phase=${state.phase}; expected handed_off.`);
  }
  const next = transitionPhase(
    {
      ...state,
      current_role: "validator",
      handoffs: [
        ...state.handoffs,
        { from: "orchestrator", to: "validator", summary_path: "", at: nowIso() },
      ],
    },
    "validating",
  );
  saveMission(next);
  return ok({ ok: true, phase: next.phase });
}

// ── validate (validator → orchestrator) ──────────────────────────────────────
export const validateInput = z.object({
  mission_id: z.string(),
  verdict: z.enum(["pass", "fail"]),
  findings: z.string().min(1),
});
export async function handleValidate(input: z.infer<typeof validateInput>) {
  const state = loadMission(input.mission_id);
  if (state.phase !== "validating") {
    fail(`Cannot validate in phase=${state.phase}; expected validating.`);
  }
  const n = state.validation_runs.length + 1;
  const findingsPath = writeValidationFindings(state.id, n, input.findings);
  const nextPhase = input.verdict === "pass" ? "validated" : "rejected";
  const next = transitionPhase(
    {
      ...state,
      current_role: "orchestrator",
      validation_runs: [
        ...state.validation_runs,
        { verdict: input.verdict, findings_path: findingsPath, at: nowIso() },
      ],
      handoffs: [
        ...state.handoffs,
        { from: "validator", to: "orchestrator", summary_path: findingsPath, at: nowIso() },
      ],
    },
    nextPhase,
  );
  saveMission(next);
  return ok({ ok: true, phase: next.phase, verdict: input.verdict, findings_path: findingsPath });
}

// ── reopen (rejected → implementing) ─────────────────────────────────────────
export const reopenInput = z.object({ mission_id: z.string() });
export async function handleReopen(input: z.infer<typeof reopenInput>) {
  const state = loadMission(input.mission_id);
  if (state.phase !== "rejected") {
    fail(`Cannot reopen in phase=${state.phase}; expected rejected.`);
  }
  const next = transitionPhase({ ...state, current_role: "worker" }, "implementing");
  saveMission(next);
  return ok({ ok: true, phase: next.phase });
}

// ── merge (validated → done) ─────────────────────────────────────────────────
export const mergeInput = z.object({ mission_id: z.string() });
export async function handleMerge(input: z.infer<typeof mergeInput>) {
  const state = loadMission(input.mission_id);
  if (state.phase !== "validated") {
    fail(`Cannot merge in phase=${state.phase}; expected validated.`);
  }
  await mergeMissionBranch(state.branch);
  const next = transitionPhase({ ...state, current_role: null }, "done");
  saveMission(next);
  return ok({ ok: true, phase: next.phase, merged_branch: state.branch });
}

// ── abort ────────────────────────────────────────────────────────────────────
export const abortInput = z.object({ mission_id: z.string(), reason: z.string().optional() });
export async function handleAbort(input: z.infer<typeof abortInput>) {
  const state = loadMission(input.mission_id);
  if (state.phase === "done" || state.phase === "aborted") {
    fail(`Mission already in terminal phase=${state.phase}.`);
  }
  const next = transitionPhase({ ...state, current_role: null }, "aborted");
  saveMission(next);
  if (input.reason) {
    writeValidationFindings(state.id, state.validation_runs.length + 1, `Aborted: ${input.reason}`);
  }
  return ok({ ok: true, phase: next.phase });
}

// ── diff (helper for validator) ──────────────────────────────────────────────
export const diffInput = z.object({ mission_id: z.string() });
export async function handleDiff(input: z.infer<typeof diffInput>) {
  const state = loadMission(input.mission_id);
  const stat = await diffStatSinceBase(state.branch, state.base_commit);
  const diff = await diffSinceBase(state.branch, state.base_commit);
  return ok({ stat, diff_truncated: diff.length > 200_000, diff: diff.slice(0, 200_000) });
}
