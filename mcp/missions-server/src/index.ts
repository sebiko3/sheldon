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
  handleStartValidation,
  handleValidate,
  handleWriteContract,
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
    description: "Abort an active mission. Caller: orchestrator or user.",
    inputSchema: { mission_id: z.string(), reason: z.string().optional() },
  },
  async (args) => handleAbort(args),
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

const transport = new StdioServerTransport();
await server.connect(transport);
