export const RESEARCH_MOCK = {
  hypothesis: "Architecture gap in the agent orchestration module",
  relevant_files: [
    "lib/agents/context-doctor.ts",
    "lib/agents/planner.ts",
    "app/api/agents/[agentId]/run/route.ts",
  ],
  evidence: [
    "Only two live OpenAI agents are implemented for the demo path",
    "The remaining five agents need stable seeded outputs for reliable presentation",
    "The API route must normalize real and mock agent responses into one contract",
  ],
  xai: {
    decision: "Agent orchestration gap detected",
    reason:
      "Research found that the system needs a stable bridge between live agents and seeded mock agents before frontend integration.",
    evidence: [
      "lib/agents/context-doctor.ts exports a live Context Doctor runner",
      "lib/agents/planner.ts exports a live Planner runner",
      "Mock modules are required for Research through Evaluator",
    ],
    confidence: 0.87,
  },
  result: {
    root_cause:
      "The demo needs deterministic structured outputs for non-live agents so the intelligence layer can be shown end-to-end without five extra model calls.",
    validation_steps: [
      "Confirm all five mock modules compile under strict TypeScript",
      "Verify every mock has non-empty XAI evidence",
      "Route Research through Evaluator requests to the seeded modules",
    ],
    unknowns: [
      "Final API response envelope from the backend integration lead",
      "Frontend rendering assumptions for nested result payloads",
    ],
  },
} as const;
