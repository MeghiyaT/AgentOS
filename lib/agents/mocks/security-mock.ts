export const SECURITY_MOCK = {
  hypothesis: "Primary security risk is accidental secret exposure during live SDK demos",
  relevant_files: [
    ".env.local",
    "lib/agents/context-doctor.ts",
    "lib/agents/planner.ts",
    "app/api/agents/[agentId]/run/route.ts",
  ],
  evidence: [
    "Live OpenAI agents require OPENAI_API_KEY at runtime",
    "The API key should never be written into source files",
    "The route must avoid returning environment or request secret values",
  ],
  xai: {
    decision: "Classify runtime secret handling as high-priority demo risk",
    reason:
      "The live agents are safe only if credentials remain server-side and logs avoid sensitive values.",
    evidence: [
      "OPENAI_API_KEY is consumed through process.env",
      "No source file should include the secret literal",
      "Frontend integration will call server routes rather than OpenAI directly",
    ],
    confidence: 0.88,
  },
  result: {
    risk_score: 7.2,
    security_posture: "watch",
    findings: [
      {
        title: "Secret leakage through logs or client bundle",
        severity: "high",
        affected_surface: "Agent API route and deployment environment",
        mitigation:
          "Keep OPENAI_API_KEY in server-only environment variables and redact runtime errors before returning them to the client.",
      },
      {
        title: "Unvalidated GitHub URL input",
        severity: "medium",
        affected_surface: "Context Doctor repository metadata fetch",
        mitigation:
          "Validate GitHub URLs before fetch and restrict metadata calls to github.com repository paths.",
      },
    ],
  },
} as const;
