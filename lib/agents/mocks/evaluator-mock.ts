export const EVALUATOR_MOCK = {
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
