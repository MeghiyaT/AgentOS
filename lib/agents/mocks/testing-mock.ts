export const TESTING_MOCK = {
  hypothesis: "Demo risk is concentrated in schema mismatches and missing XAI fields",
  relevant_files: [
    "lib/agents/context-doctor.ts",
    "lib/agents/planner.ts",
    "lib/agents/mocks/testing-mock.ts",
  ],
  evidence: [
    "Context Doctor and Planner rely on Zod parsing for structured outputs",
    "Mock agents must match the frontend's expected structured response shape",
    "XAI confidence values need explicit numeric range checks",
  ],
  xai: {
    decision: "Prioritize schema and smoke tests",
    reason:
      "A hackathon demo benefits more from validating the response contract than from broad unit coverage.",
    evidence: [
      "Strict TypeScript is already enabled",
      "Zod validates live agent responses",
      "Mock modules are static and can be checked quickly",
    ],
    confidence: 0.9,
  },
  result: {
    test_cases: [
      {
        name: "Context Doctor live response validates",
        type: "integration",
        expected_result:
          "The response includes diagnosis, missing_items, severity, confidence, and XAI.",
      },
      {
        name: "Planner live response validates",
        type: "integration",
        expected_result:
          "The response includes realistic tasks, milestones, strategy, and XAI evidence.",
      },
      {
        name: "Mock agents expose XAI",
        type: "unit",
        expected_result:
          "Research, Coding, Testing, Security, and Evaluator mocks all include populated XAI.",
      },
    ],
    edge_cases: [
      "Missing OPENAI_API_KEY for live agents",
      "GitHub API metadata fetch failure",
      "Frontend requests an unknown agent id",
    ],
    automation_priority: [
      "TypeScript compilation",
      "Mock confidence range check",
      "API route smoke test once backend route exists",
    ],
  },
} as const;
