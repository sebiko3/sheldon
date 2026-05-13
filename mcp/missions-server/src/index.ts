#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  handleAbort,
  handleApprove,
  handleCreate,
  handleDiff,
  handleHandoff,
  handleList,
  handleMerge,
  handleRead,
  handleReopen,
  handleRunAssertions,
  handleStartValidation,
  handleValidate,
  handleWriteContract,
  handleEpicCreate,
  handleEpicRead,
  handleEpicList,
  handleEpicPromoteIssue,
  handleBrainObserve,
  handleBrainRecall,
  handleBrainList,
} from "./tools.js";

const server = new McpServer({
  name: "missions",
  version: "0.0.1",
});

server.registerTool(
  "create",
  {
    description:
      "Create a new mission. Generates a ulid, branches mission/<id> off the default branch, writes a stub contract.md, returns { mission_id, branch, base_commit, contract_path }. Caller: orchestrator only.",
    inputSchema: { goal: z.string().min(1, "goal required") },
  },
  async (args) => handleCreate(args),
);

server.registerTool(
  "read",
  {
    description:
      "Read a mission: returns { state, contract, diff_stat }. Safe for any role to call.",
    inputSchema: { mission_id: z.string() },
  },
  async (args) => handleRead(args),
);

server.registerTool(
  "list",
  {
    description: "List missions, optionally filtered by phase. Returns summaries.",
    inputSchema: { phase: z.string().optional() },
  },
  async (args) => handleList(args),
);

server.registerTool(
  "write_contract",
  {
    description:
      "Replace contract.md and move phase to contract_review. Only allowed while phase is planning or contract_review. Caller: orchestrator only.",
    inputSchema: { mission_id: z.string(), contract: z.string().min(1) },
  },
  async (args) => handleWriteContract(args),
);

server.registerTool(
  "approve",
  {
    description: "Approve contract; phase contract_review → implementing. Caller: orchestrator.",
    inputSchema: { mission_id: z.string() },
  },
  async (args) => handleApprove(args),
);

server.registerTool(
  "handoff",
  {
    description:
      "Worker hands off: commit any unstaged work, write summary, phase implementing → handed_off. Caller: worker only.",
    inputSchema: { mission_id: z.string(), summary: z.string().min(1) },
  },
  async (args) => handleHandoff(args),
);

server.registerTool(
  "start_validation",
  {
    description:
      "Transition handed_off → validating before spawning the validator subagent. Caller: orchestrator.",
    inputSchema: { mission_id: z.string() },
  },
  async (args) => handleStartValidation(args),
);

server.registerTool(
  "validate",
  {
    description:
      "Validator records verdict + findings. Phase validating → validated (pass) or rejected (fail). Caller: validator only.",
    inputSchema: {
      mission_id: z.string(),
      verdict: z.enum(["pass", "fail"]),
      findings: z.string().min(1),
    },
  },
  async (args) => handleValidate(args),
);

server.registerTool(
  "reopen",
  {
    description: "Phase rejected → implementing so orchestrator can re-spawn worker. Caller: orchestrator.",
    inputSchema: { mission_id: z.string() },
  },
  async (args) => handleReopen(args),
);

server.registerTool(
  "merge",
  {
    description:
      "Merge mission/<id> into the default branch; phase validated → done. Caller: orchestrator.",
    inputSchema: { mission_id: z.string() },
  },
  async (args) => handleMerge(args),
);

server.registerTool(
  "abort",
  {
    description:
      "Abort an active mission. Caller: orchestrator or user. Set delete_branch=true to also `git branch -D mission/<id>` (refused if the branch is currently checked out).",
    inputSchema: {
      mission_id: z.string(),
      reason: z.string().optional(),
      delete_branch: z.boolean().optional(),
    },
  },
  async (args) => handleAbort(args),
);

server.registerTool(
  "run_assertions",
  {
    description:
      "Validator-only. Reads contract.md frontmatter, runs each assertion's `check:` command via bash -c, captures exit_code/stdout/stderr/duration, writes a checks log next to the validation run, and returns structured results. Assertions without `check:` are marked manual:true. Does NOT change phase or set verdict — call missions.validate afterward.",
    inputSchema: { mission_id: z.string() },
  },
  async (args) => handleRunAssertions(args),
);

server.registerTool(
  "diff",
  {
    description:
      "Return git diff (and diffstat) of mission/<id> against its base commit. Helper for validator.",
    inputSchema: { mission_id: z.string() },
  },
  async (args) => handleDiff(args),
);

server.registerTool("epic_create", {
  description:
    "Create a new epic for a vague brief. Returns { epic_id, brief, created_at, issues }. Add issues by editing the epic file or via the epic-planner agent. Caller: epic-planner agent or user.",
  inputSchema: { brief: z.string().min(1), epic_id: z.string().optional() },
}, async (args) => handleEpicCreate(args));

server.registerTool("epic_read", {
  description: "Read an epic by id. Returns the full epic with all issues and their statuses.",
  inputSchema: { epic_id: z.string() },
}, async (args) => handleEpicRead(args));

server.registerTool("epic_list", {
  description:
    "List all epics, optionally filtered by issue status. Returns summaries with counts grouped by status.",
  inputSchema: { status: z.string().optional() },
}, async (args) => handleEpicList(args));

server.registerTool("epic_promote_issue", {
  description:
    "Promote an epic issue to a real Sheldon mission. Creates a new mission via the missions.create flow, flips the issue status to promoted, and returns { mission_id, epic_id, issue_id }.",
  inputSchema: {
    epic_id: z.string(),
    issue_id: z.number().int().positive(),
    goal: z.string().optional(),
  },
}, async (args) => handleEpicPromoteIssue(args));

server.registerTool("brain_observe", {
  description:
    "Record a learned fact in Sheldon's brain (`.sheldon/brain/entries.jsonl`). `type` is one of convention | lesson | proposal | agent-improvement | strategy. `topic` is a short tag for retrieval (e.g. \"yaml-frontmatter\", \"agent:worker\", \"tests\"). `text` is the rule/fact in one paragraph. `evidence` optionally points to the mission_id or commit that taught the lesson. `supersedes` optionally retires an older entry by id. For type=strategy, `outcome` is required: {validator_passes_first_try, rework_loops, mission_id} — emit one when a mission validated on the first worker round. Any role may call this; observations persist across missions and projects.",
  inputSchema: {
    type: z.enum(["convention", "lesson", "proposal", "agent-improvement", "strategy"]),
    topic: z.string().min(1),
    text: z.string().min(1),
    evidence: z.string().optional(),
    confidence: z.enum(["low", "medium", "high"]).optional(),
    supersedes: z.string().optional(),
    outcome: z
      .object({
        validator_passes_first_try: z.boolean(),
        rework_loops: z.number().int().nonnegative(),
        mission_id: z.string().min(1),
      })
      .optional(),
  },
}, async (args) => handleBrainObserve(args));

server.registerTool("brain_recall", {
  description:
    "Retrieve relevant brain entries. Filter by `type` (convention | lesson | proposal | agent-improvement | strategy) and/or `topic` (case-insensitive substring match across topic+text, multi-word AND). `limit` caps results. Strategy queries are ranked by first-try pass rate (then by lower rework_loops); other types return newest-first. Superseded entries are filtered out. Use this at the start of a mission to load project conventions, prior lessons, and empirically successful strategies.",
  inputSchema: {
    topic: z.string().optional(),
    type: z.enum(["convention", "lesson", "proposal", "agent-improvement", "strategy"]).optional(),
    limit: z.number().int().positive().optional(),
  },
}, async (args) => handleBrainRecall(args));

server.registerTool("brain_list", {
  description:
    "Dump every active brain entry plus a per-type count summary. Use to audit what Sheldon has learned in this repo.",
  inputSchema: {},
}, async (args) => handleBrainList(args));

const transport = new StdioServerTransport();
await server.connect(transport);
