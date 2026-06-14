import { strict as assert } from "node:assert";

import {
  AGENT_NAMES,
  AgentNameSchema,
  ApiErrorSchema,
  EvaluationMetricsSchema,
  RunRequestSchema,
  RunResponseSchema,
  SingleAgentSchema,
  type AgentName,
  type AgentOutput,
  type ApiError,
  type EvaluationMetrics,
  type RunRequest,
  type RunResponse,
  type SingleAgent,
  type Xai,
} from "./api-schemas";

const expectedAgentNames = [
  "Context Doctor",
  "Planner",
  "Research",
  "Coding",
  "Testing",
  "Security",
  "Evaluator",
];

const validRequest: RunRequest = {
  githubUrl: "https://github.com/openai/codex",
  description: "Inspect this repository for a hackathon demo readiness pass.",
};

const validXai: Xai = {
  decision: "Accept context",
  reason: "The request contains enough structured context for orchestration.",
  evidence: ["Valid GitHub URL", "Description is within length bounds"],
  confidence: 0.91,
};

const validAgent: SingleAgent = {
  id: "context-doctor",
  name: "Context Doctor",
  status: "complete",
  startTime: "2026-06-14T00:00:00.000Z",
  endTime: "2026-06-14T00:00:01.000Z",
  latencyMs: 1000,
  xai: validXai,
  result: {
    diagnosis: "Context is sufficient for a first-pass inspection.",
    missing_items: [],
    severity: "low",
  },
};

const validEvaluation: EvaluationMetrics = {
  accuracy: 92,
  reliability: 95,
  confidence: 91,
  totalCost: 0.02,
  latencyMs: 1000,
  hallucinationRisk: "low",
};

const validResponse: RunResponse = {
  agents: [validAgent],
  evaluation: validEvaluation,
  status: "success",
  total_cost: 0.02,
  total_latency_ms: 1000,
};

const validError: ApiError = {
  code: "VALIDATION_ERROR",
  message: "Request body did not match RunRequestSchema.",
  issues: [
    {
      path: "githubUrl",
      message: "Invalid url",
    },
  ],
};

const typeExportProbe: {
  agent: AgentOutput;
  agentName: AgentName;
  evaluation: EvaluationMetrics;
  request: RunRequest;
  response: RunResponse;
  xai: Xai;
} = {
  agent: validAgent,
  agentName: validAgent.name,
  evaluation: validEvaluation,
  request: validRequest,
  response: validResponse,
  xai: validXai,
};

assert.deepEqual([...AGENT_NAMES], expectedAgentNames);
assert.deepEqual(AgentNameSchema.options, expectedAgentNames);
assert.equal(typeExportProbe.agentName, "Context Doctor");

RunRequestSchema.parse(validRequest);
SingleAgentSchema.parse(validAgent);
EvaluationMetricsSchema.parse(validEvaluation);
RunResponseSchema.parse(validResponse);
ApiErrorSchema.parse(validError);

console.log("api-schemas validation OK");
