import assert from "node:assert/strict";

import {
  contextDoctorAgentOutputSchema,
  type ContextDoctorAgentOutput,
} from "./context-doctor";
import {
  aggregateResults,
  type AgentOutput,
} from "./evaluator-mock";
import {
  isPlannerOutputRealistic,
  plannerAgentOutputSchema,
  type PlannerAgentOutput,
} from "./planner";
import { CODING_MOCK } from "./mocks/coding-mock";
import { EVALUATOR_MOCK } from "./mocks/evaluator-mock";
import { RESEARCH_MOCK } from "./mocks/research-mock";
import { SECURITY_MOCK } from "./mocks/security-mock";
import { TESTING_MOCK } from "./mocks/testing-mock";

const contextDoctorOutput: ContextDoctorAgentOutput =
  contextDoctorAgentOutputSchema.parse({
    diagnosis: "Missing API contract and architecture context slow integration.",
    missing_items: [
      "API contract between frontend and agent route",
      "Architecture diagram for the 7-agent pipeline",
    ],
    severity: "high",
    confidence: 0.84,
    xai: {
      decision: "Flag missing context before planning",
      reason: "The demo depends on multiple leads integrating to one route.",
      evidence: ["API contract missing", "Architecture context missing"],
      confidence: 0.84,
    },
  });

const plannerOutput: PlannerAgentOutput = plannerAgentOutputSchema.parse({
  tasks: [
    {
      name: "Define API Contract",
      duration: "30 minutes",
      dependencies: [],
    },
    {
      name: "Wire Live Agents",
      duration: "90 minutes",
      dependencies: ["Define API Contract"],
    },
    {
      name: "Validate Demo Path",
      duration: "45 minutes",
      dependencies: ["Wire Live Agents"],
    },
  ],
  milestones: [
    {
      name: "Contract Ready",
      criteria: "Frontend and backend agree on one agent response envelope.",
    },
    {
      name: "Demo Ready",
      criteria: "All seven agents return structured outputs with XAI.",
    },
  ],
  strategy:
    "Stabilize the contract first, then prove the live and mock agent paths through one route.",
  xai: {
    decision: "Plan around the shortest reliable demo path",
    reason: "The build window rewards stable integration over broad feature depth.",
    evidence: ["5-hour build window", "Two live agents", "Five mock agents"],
    confidence: 0.85,
  },
});

assert.equal(isPlannerOutputRealistic(plannerOutput), true);

const mockOutputs = [
  RESEARCH_MOCK,
  CODING_MOCK,
  TESTING_MOCK,
  SECURITY_MOCK,
  EVALUATOR_MOCK,
];

type ReadonlyXai = {
  decision: string;
  reason: string;
  evidence: readonly string[];
  confidence: number;
};

function cloneXai(xai: ReadonlyXai): AgentOutput["xai"] {
  return {
    decision: xai.decision,
    reason: xai.reason,
    evidence: [...xai.evidence],
    confidence: xai.confidence,
  };
}

for (const mock of mockOutputs) {
  assert.equal(mock.xai.decision.length > 0, true);
  assert.equal(mock.xai.reason.length > 0, true);
  assert.equal(mock.xai.evidence.length > 0, true);
  assert.equal(mock.xai.confidence >= 0.6, true);
  assert.equal(mock.xai.confidence <= 0.95, true);
}

const agentOutputs: AgentOutput[] = [
  {
    name: "Context Doctor",
    xai: contextDoctorOutput.xai,
    result: {
      cost: 0.018,
      latency: 1640,
      accuracy: 0.82,
      reliability: 0.86,
    },
  },
  {
    name: "Planner",
    xai: plannerOutput.xai,
    result: {
      cost: 0.021,
      latency: 1820,
      accuracy: 0.86,
      reliability: 0.88,
    },
  },
  {
    name: "Research",
    xai: cloneXai(RESEARCH_MOCK.xai),
    result: {
      cost: 0,
      latency: 18,
      accuracy: 0.8,
      reliability: 0.9,
      ...RESEARCH_MOCK.result,
    },
  },
  {
    name: "Coding",
    xai: cloneXai(CODING_MOCK.xai),
    result: {
      cost: 0,
      latency: 16,
      accuracy: 0.78,
      reliability: 0.88,
      ...CODING_MOCK.result,
    },
  },
  {
    name: "Testing",
    xai: cloneXai(TESTING_MOCK.xai),
    result: {
      cost: 0,
      latency: 14,
      accuracy: 0.83,
      reliability: 0.92,
      ...TESTING_MOCK.result,
    },
  },
  {
    name: "Security",
    xai: cloneXai(SECURITY_MOCK.xai),
    result: {
      cost: 0,
      latency: 15,
      accuracy: 0.81,
      reliability: 0.89,
      ...SECURITY_MOCK.result,
    },
  },
  {
    name: "Evaluator",
    xai: cloneXai(EVALUATOR_MOCK.xai),
    result: {
      cost: 0,
      latency: 12,
      ...EVALUATOR_MOCK.result,
    },
  },
];

const aggregate = aggregateResults(agentOutputs);

assert.deepEqual(Object.keys(aggregate).sort(), [
  "accuracy",
  "confidence",
  "reliability",
  "riskScore",
  "totalCost",
  "totalLatency",
]);

for (const [metric, value] of Object.entries(aggregate)) {
  assert.equal(typeof value, "number", `${metric} must be numeric`);
  assert.equal(Number.isFinite(value), true, `${metric} must be finite`);
}

assert.equal(aggregate.totalCost > 0, true);
assert.equal(aggregate.totalLatency > 0, true);
assert.equal(aggregate.accuracy >= 0 && aggregate.accuracy <= 1, true);
assert.equal(aggregate.reliability >= 0 && aggregate.reliability <= 1, true);
assert.equal(aggregate.riskScore >= 0 && aggregate.riskScore <= 10, true);
assert.equal(aggregate.confidence >= 0 && aggregate.confidence <= 1, true);
