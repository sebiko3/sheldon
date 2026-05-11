// Mirror of mcp/missions-server/src/schema.ts (kept duplicated to avoid a
// build-order coupling — TUI is a pure read-only observer of state files).

export type Phase =
  | "planning"
  | "contract_review"
  | "implementing"
  | "handed_off"
  | "validating"
  | "validated"
  | "rejected"
  | "done"
  | "aborted";

export type Role = "orchestrator" | "worker" | "validator";

export interface Handoff {
  from: Role;
  to: Role;
  commit?: string;
  summary_path: string;
  at: string;
}

export interface ValidationRun {
  verdict: "pass" | "fail";
  findings_path: string;
  at: string;
}

export interface MissionState {
  id: string;
  goal: string;
  phase: Phase;
  branch: string;
  base_commit: string;
  created_at: string;
  updated_at: string;
  current_role: Role | null;
  contract_path: string;
  handoffs: Handoff[];
  validation_runs: ValidationRun[];
}

export const ACTIVE_PHASES = new Set<Phase>([
  "planning",
  "contract_review",
  "implementing",
  "handed_off",
  "validating",
  "rejected",
]);
