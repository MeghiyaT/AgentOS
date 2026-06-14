export const CODING_MOCK = {
  hypothesis: "Coding path should modify the agent registry and API dispatcher",
  relevant_files: [
    "lib/agents/index.ts",
    "lib/agents/mocks/coding-mock.ts",
    "app/api/agents/[agentId]/run/route.ts",
  ],
  evidence: [
    "The live agents already expose callable runner functions",
    "Mock agents need simple module exports that can be imported by the dispatcher",
    "The frontend needs predictable fields for files, changes, and explanation",
  ],
  xai: {
    decision: "Recommend registry-first implementation",
    reason:
      "A small registry keeps live and mock agents discoverable without coupling UI code to individual modules.",
    evidence: [
      "lib/agents/context-doctor.ts exports runContextDoctor",
      "lib/agents/planner.ts exports runPlanner",
      "Mock outputs can be returned without async OpenAI calls",
    ],
    confidence: 0.82,
  },
  result: {
    files_to_modify: [
      {
        path: "lib/agents/index.ts",
        change_type: "create",
        proposed_changes: [
          "Export a typed agent registry",
          "Map Research through Evaluator to mock modules",
          "Preserve live runners for Context Doctor and Planner",
        ],
      },
      {
        path: "app/api/agents/[agentId]/run/route.ts",
        change_type: "update",
        proposed_changes: [
          "Lookup agent by id",
          "Dispatch live or mock execution",
          "Return a normalized JSON envelope",
        ],
      },
    ],
    implementation_notes: [
      "Keep mock imports static for demo reliability",
      "Avoid dynamic agent id reflection until the route contract is stable",
    ],
    rollback_plan:
      "Remove the registry import from the API route and return the original route response shape.",
  },
} as const;
