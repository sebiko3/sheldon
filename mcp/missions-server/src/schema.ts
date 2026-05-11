import { z } from "zod";

export const PHASES = [
  "planning",
  "contract_review",
  "implementing",
  "handed_off",
  "validating",
  "validated",
  "rejected",
  "done",
  "aborted",
] as const;

export type Phase = (typeof PHASES)[number];

export const ROLES = ["orchestrator", "worker", "validator"] as const;
export type Role = (typeof ROLES)[number];

export const HandoffSchema = z.object({
  from: z.enum(ROLES),
  to: z.enum(ROLES),
  commit: z.string().optional(),
  summary_path: z.string(),
  at: z.string(),
});

export const ValidationRunSchema = z.object({
  verdict: z.enum(["pass", "fail"]),
  findings_path: z.string(),
  at: z.string(),
});

export const MissionStateSchema = z.object({
  id: z.string(),
  goal: z.string(),
  phase: z.enum(PHASES),
  branch: z.string(),
  base_commit: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  current_role: z.enum(ROLES).nullable(),
  contract_path: z.string(),
  handoffs: z.array(HandoffSchema),
  validation_runs: z.array(ValidationRunSchema),
});

export type MissionState = z.infer<typeof MissionStateSchema>;
export type Handoff = z.infer<typeof HandoffSchema>;
export type ValidationRun = z.infer<typeof ValidationRunSchema>;

export const ALLOWED_TRANSITIONS: Record<Phase, Phase[]> = {
  planning: ["contract_review", "aborted"],
  contract_review: ["planning", "implementing", "aborted"],
  implementing: ["handed_off", "aborted"],
  handed_off: ["validating", "aborted"],
  validating: ["validated", "rejected", "aborted"],
  validated: ["done", "aborted"],
  rejected: ["implementing", "aborted"],
  done: [],
  aborted: [],
};

export function canTransition(from: Phase, to: Phase): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export const EpicIssueSchema = z.object({
  id: z.number().int().positive(),
  title: z.string(),
  rationale: z.string(),
  acceptance_sketch: z.array(z.string()),
  status: z.enum(["proposed", "promoted", "declined"]),
  promoted_mission_id: z.string().nullable(),
});

export const EpicSchema = z.object({
  id: z.string(),
  brief: z.string(),
  created_at: z.string(),
  issues: z.array(EpicIssueSchema),
});

export type EpicIssue = z.infer<typeof EpicIssueSchema>;
export type Epic = z.infer<typeof EpicSchema>;
