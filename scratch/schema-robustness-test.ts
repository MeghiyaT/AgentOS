import { z } from "zod";
import { 
  contextDoctorOutputSchema,
  plannerOutputSchema,
  researchOutputSchema,
  codingOutputSchema,
  testingOutputSchema,
  securityOutputSchema,
  evaluatorOutputSchema 
} from "../lib/prompts/agent-prompts";
import { contextDoctorAgentOutputSchema } from "../lib/agents/context-doctor";
import { plannerAgentOutputSchema } from "../lib/agents/planner";

const schemas = {
  contextDoctorOutputSchema,
  plannerOutputSchema,
  researchOutputSchema,
  codingOutputSchema,
  testingOutputSchema,
  securityOutputSchema,
  evaluatorOutputSchema,
  contextDoctorAgentOutputSchema,
  plannerAgentOutputSchema,
};

const xaiBase = {
  decision: "Valid",
  reason: "Because",
  evidence: ["Data"],
  confidence: 0.9,
  extra_nested_field_should_be_stripped: true // Edge case: nested unknown
};

const edgeCases = {
  additional_unknown_root_field: 42,
  another_unknown: ["arr"]
};

// Reordered fields are implicit as JSON object keys are unordered by definition
const validPayloads: Record<string, any> = {
  contextDoctorOutputSchema: {
    ...edgeCases,
    recommendedArtifacts: ["art"],
    missingContext: [{ item: "foo", reason: "bar" }],
    summary: "Sum",
    xai: xaiBase,
  },
  plannerOutputSchema: {
    xai: xaiBase,
    risks: ["risk"],
    tasks: [{ id: "1", title: "Task 1", milestone: "M1", acceptanceCriteria: ["crit"], estimatedComplexity: "small", dependencies: [], unknown_task_key: true }],
    milestones: [{ outcome: "out", taskIds: ["1"], name: "M1", unknown_ms_key: true }],
    objective: "Obj",
    ...edgeCases
  },
  researchOutputSchema: {
    ...edgeCases,
    xai: xaiBase,
    unknowns: ["unk"],
    rootCauseHypotheses: [{ hypothesis: "Bug", confidence: 0.9, evidence: ["log"] }],
    mostRelevantFiles: ["file"],
  },
  codingOutputSchema: {
    xai: xaiBase,
    rollbackPlan: "rollback",
    implementationNotes: ["note"],
    filesToModify: [{ path: "file", changeDescription: "desc", changeType: "update", rationale: "because", proposedChanges: ["change"], unknown_file_key: 1 }],
    ...edgeCases
  },
  testingOutputSchema: {
    automationPriority: ["prio"],
    edgeCases: ["edge"],
    testCases: [{ description: "test", type: "unit", assertions: ["assert"] }],
    ...edgeCases,
    xai: xaiBase,
  },
  securityOutputSchema: {
    ...edgeCases,
    securityPosture: "acceptable",
    mitigations: ["mit"],
    findings: [{ vulnerability: "SQLi", severity: "low", recommendation: "fix" }],
    riskScore: 0.2,
    xai: xaiBase,
  },
  evaluatorOutputSchema: {
    checks: [{ criteria: "check", passed: true, notes: "ok" }],
    hallucinationRisk: 0,
    confidence: 0.9,
    ...edgeCases,
    reliability: 1,
    accuracy: 1,
    verdict: "ready",
    xai: xaiBase,
  },
  contextDoctorAgentOutputSchema: {
    severity: "low",
    missing_items: ["miss"],
    diagnosis: "diag",
    ...edgeCases,
    confidence: 0.9,
    recommended_actions: ["action"],
    xai: xaiBase,
  },
  plannerAgentOutputSchema: {
    xai: xaiBase,
    strategy: "Plan it out",
    milestones: [
      { name: "M1", criteria: "Done", unknown_ms_key: 123 },
      { name: "M2", criteria: "Done", unknown_ms_key: 123 }
    ],
    ...edgeCases,
    tasks: [
      { name: "Task 1", duration: "1 hour", dependencies: [], unknown_task_key: true },
      { name: "Task 2", duration: "1 hour", dependencies: [], unknown_task_key: true },
      { name: "Task 3", duration: "1 hour", dependencies: [], unknown_task_key: true }
    ],
  }
};

const results: Record<string, string> = {};

for (const [name, schema] of Object.entries(schemas)) {
  try {
    const parsed = schema.parse(validPayloads[name]);
    
    // Check if the unknown fields were actually stripped
    const isStripped = !('additional_unknown_root_field' in parsed) && 
                       !('extra_nested_field_should_be_stripped' in (parsed.xai || {}));

    if (isStripped) {
      results[name] = "PASS";
    } else {
      results[name] = "FAIL (Unknown fields not stripped)";
    }
  } catch (err: any) {
    results[name] = `FAIL: ${JSON.stringify(err.issues)}`;
  }
}

console.log("\n=== PASS/FAIL MATRIX ===");
for (const [name, status] of Object.entries(results)) {
  console.log(`${status.startsWith("PASS") ? "✅" : "❌"} ${name}: ${status}`);
}
