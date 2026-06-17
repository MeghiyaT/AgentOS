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
  plannerAgentOutputSchema,
  type PlannerAgentOutput,
} from "./planner";
const EVALUATOR_MOCK = {
  hypothesis: "The intelligence layer is demo-ready once real and mock agents share one response contract",
  relevant_files: [
    "lib/agents/context-doctor.ts",
    "lib/agents/planner.ts",
    "lib/agents/mocks/evaluator-mock.ts",
  ],
  evidence: [
    "Two agents use live OpenAI SDK calls with Zod validation",
    "Five agents use deterministic seeded outputs for stable demos",
    "Each agent includes an XAI block with evidence and confidence",
  ],
  xai: {
    decision: "Mark the 7-agent layer as demo-stable after integration routing",
    reason:
      "The architecture balances demo impact with reliability by limiting live model dependency to the first two agents.",
    evidence: [
      "Context Doctor live gate passed",
      "Planner live gate passed",
      "Research through Evaluator mocks provide structured XAI",
    ],
    confidence: 0.86,
  },
  result: {
    verdict: "ready_after_route_integration",
    accuracy: 0.84,
    reliability: 0.91,
    hallucination_risk: 0.22,
    confidence: 0.86,
    checks: [
      {
        name: "Live agent gates",
        status: "pass",
        note: "Context Doctor and Planner have successful live OpenAI gate runs.",
      },
      {
        name: "Mock stability",
        status: "pass",
        note: "Research through Evaluator are deterministic and schema-shaped.",
      },
      {
        name: "Integration route",
        status: "warn",
        note: "Final readiness depends on backend route wiring by the integration lead.",
      },
    ],
  },
} as const;

const SECURITY_MOCK = {
  xai: {
    decision: "Security decision",
    reason: "Security reason",
    evidence: ["Security evidence"],
    confidence: 0.9,
  },
  result: {
    riskScore: 2,
    findings: [],
    securityPosture: "acceptable",
  },
};

const TESTING_MOCK = {
  xai: {
    decision: "Testing decision",
    reason: "Testing reason",
    evidence: ["Testing evidence"],
    confidence: 0.9,
  },
  result: {
    testCases: [],
    edgeCases: [],
    automationPriority: [],
  },
};

const RESEARCH_MOCK = {
  xai: {
    decision: "Research decision",
    reason: "Research reason",
    evidence: ["Research evidence"],
    confidence: 0.9,
  },
  result: {
    rootCauseHypotheses: [],
    mostRelevantFiles: [],
    unknowns: [],
  },
};

const CODING_MOCK = {
  xai: {
    decision: "Coding decision",
    reason: "Coding reason",
    evidence: ["Coding evidence"],
    confidence: 0.85,
  },
  result: {
    filesToModify: [],
    implementationNotes: [],
    rollbackPlan: "None",
  },
};

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
