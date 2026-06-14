import { z } from "zod";

export type AgentInputs = {
  githubUrl: string;
  description: string;
};

export interface AgentPrompt<
  TSchema extends z.ZodObject<z.ZodRawShape> = z.ZodObject<z.ZodRawShape>,
> {
  name: string;
  systemPrompt: string;
  userTemplate: (inputs: AgentInputs) => string;
  expectedOutputSchema: TSchema;
}

export const xaiSchema = z
  .object({
    decision: z.string().min(1),
    reason: z.string().min(1),
    evidence: z.array(z.string().min(1)).min(1),
    confidence: z.number().min(0).max(1),
  })
  .strict();

const prioritySchema = z.enum(["low", "medium", "high", "critical"]);
const severitySchema = z.enum(["info", "low", "medium", "high", "critical"]);

const sharedAgentInstructions = [
  "Return only valid JSON matching the expected output schema.",
  "Ground claims in the repository URL, supplied description, or explicit uncertainty.",
  "Always include top-level xai with decision, reason, evidence, and confidence.",
  "Use confidence as a number from 0 to 1.",
].join(" ");

const buildUserPrompt = (
  role: string,
  inputs: AgentInputs,
  task: string,
): string => `Repository: ${inputs.githubUrl}
Description: ${inputs.description}

Role: ${role}
Task: ${task}

Respond with structured JSON only.`;

export const contextDoctorOutputSchema = z
  .object({
    summary: z.string().min(1),
    missingContext: z
      .array(
        z
          .object({
            type: z.enum([
              "readme",
              "api_spec",
              "architecture_diagram",
              "environment",
              "contracts",
              "runbook",
              "other",
            ]),
            item: z.string().min(1),
            impact: z.string().min(1),
            priority: prioritySchema,
          })
          .strict(),
      )
      .min(1),
    recommendedArtifacts: z.array(z.string().min(1)),
    xai: xaiSchema,
  })
  .strict();

export const plannerOutputSchema = z
  .object({
    objective: z.string().min(1),
    tasks: z
      .array(
        z
          .object({
            id: z.string().min(1),
            title: z.string().min(1),
            milestone: z.string().min(1),
            dependencies: z.array(z.string().min(1)),
            acceptanceCriteria: z.array(z.string().min(1)).min(1),
            estimatedComplexity: z.enum(["small", "medium", "large"]),
          })
          .strict(),
      )
      .min(1),
    milestones: z
      .array(
        z
          .object({
            name: z.string().min(1),
            outcome: z.string().min(1),
            taskIds: z.array(z.string().min(1)).min(1),
          })
          .strict(),
      )
      .min(1),
    risks: z.array(z.string().min(1)),
    xai: xaiSchema,
  })
  .strict();

export const researchOutputSchema = z
  .object({
    rootCauseHypotheses: z
      .array(
        z
          .object({
            hypothesis: z.string().min(1),
            likelihood: z.number().min(0).max(1),
            relevantFiles: z.array(z.string().min(1)),
            evidence: z.array(z.string().min(1)).min(1),
            validationStep: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
    mostRelevantFiles: z.array(z.string().min(1)),
    unknowns: z.array(z.string().min(1)),
    xai: xaiSchema,
  })
  .strict();

export const codingOutputSchema = z
  .object({
    filesToModify: z
      .array(
        z
          .object({
            path: z.string().min(1),
            changeType: z.enum(["create", "update", "delete"]),
            rationale: z.string().min(1),
            proposedChanges: z.array(z.string().min(1)).min(1),
          })
          .strict(),
      )
      .min(1),
    implementationNotes: z.array(z.string().min(1)),
    rollbackPlan: z.string().min(1),
    xai: xaiSchema,
  })
  .strict();

export const testingOutputSchema = z
  .object({
    testCases: z
      .array(
        z
          .object({
            name: z.string().min(1),
            type: z.enum(["unit", "integration", "e2e", "security", "manual"]),
            target: z.string().min(1),
            steps: z.array(z.string().min(1)).min(1),
            expectedResult: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
    edgeCases: z.array(z.string().min(1)),
    automationPriority: z.array(z.string().min(1)),
    xai: xaiSchema,
  })
  .strict();

export const securityOutputSchema = z
  .object({
    riskScore: z.number().min(0).max(10),
    findings: z.array(
      z
        .object({
          title: z.string().min(1),
          severity: severitySchema,
          affectedSurface: z.string().min(1),
          evidence: z.array(z.string().min(1)).min(1),
          mitigation: z.string().min(1),
        })
        .strict(),
    ),
    securityPosture: z.enum(["acceptable", "watch", "at_risk", "blocked"]),
    xai: xaiSchema,
  })
  .strict();

export const evaluatorOutputSchema = z
  .object({
    verdict: z.enum(["ready", "needs_revision", "blocked"]),
    accuracy: z.number().min(0).max(1),
    reliability: z.number().min(0).max(1),
    hallucinationRisk: z.number().min(0).max(1),
    confidence: z.number().min(0).max(1),
    checks: z
      .array(
        z
          .object({
            name: z.string().min(1),
            status: z.enum(["pass", "warn", "fail"]),
            note: z.string().min(1),
          })
          .strict(),
      )
      .min(1),
    xai: xaiSchema,
  })
  .strict();

export const agentPrompts = [
  {
    name: "Context Doctor",
    systemPrompt: [
      "You are Context Doctor for AgentOS Inspector.",
      "Identify missing project context that would block accurate agentic work.",
      "Focus on docs, API specs, architecture diagrams, environment assumptions, and contracts.",
      sharedAgentInstructions,
    ].join(" "),
    userTemplate: (inputs) =>
      buildUserPrompt(
        "Context Doctor",
        inputs,
        "Find missing context and recommend the minimum artifacts needed before execution.",
      ),
    expectedOutputSchema: contextDoctorOutputSchema,
  },
  {
    name: "Planner",
    systemPrompt: [
      "You are Planner for AgentOS Inspector.",
      "Turn the request into a sequenced execution plan with concrete tasks, milestones, dependencies, and acceptance criteria.",
      sharedAgentInstructions,
    ].join(" "),
    userTemplate: (inputs) =>
      buildUserPrompt(
        "Planner",
        inputs,
        "Create an execution plan that a small hackathon team can follow without ambiguity.",
      ),
    expectedOutputSchema: plannerOutputSchema,
  },
  {
    name: "Research",
    systemPrompt: [
      "You are Research for AgentOS Inspector.",
      "Produce root cause hypotheses, relevant files, evidence, unknowns, and validation steps.",
      "Prefer cautious claims over invented certainty.",
      sharedAgentInstructions,
    ].join(" "),
    userTemplate: (inputs) =>
      buildUserPrompt(
        "Research",
        inputs,
        "Analyze likely causes, likely repository locations, supporting evidence, and validation steps.",
      ),
    expectedOutputSchema: researchOutputSchema,
  },
  {
    name: "Coding",
    systemPrompt: [
      "You are Coding for AgentOS Inspector.",
      "Recommend exact files to modify and the proposed implementation changes.",
      "Preserve existing architecture and isolate blast radius.",
      sharedAgentInstructions,
    ].join(" "),
    userTemplate: (inputs) =>
      buildUserPrompt(
        "Coding",
        inputs,
        "List the files to modify, proposed changes, implementation notes, and rollback plan.",
      ),
    expectedOutputSchema: codingOutputSchema,
  },
  {
    name: "Testing",
    systemPrompt: [
      "You are Testing for AgentOS Inspector.",
      "Design test coverage for expected behavior, edge cases, and demo-critical regressions.",
      sharedAgentInstructions,
    ].join(" "),
    userTemplate: (inputs) =>
      buildUserPrompt(
        "Testing",
        inputs,
        "Create test cases, edge cases, and automation priorities for the described work.",
      ),
    expectedOutputSchema: testingOutputSchema,
  },
  {
    name: "Security",
    systemPrompt: [
      "You are Security for AgentOS Inspector.",
      "Identify vulnerabilities, risk score, affected surfaces, and mitigations.",
      "Call out insufficient evidence clearly.",
      sharedAgentInstructions,
    ].join(" "),
    userTemplate: (inputs) =>
      buildUserPrompt(
        "Security",
        inputs,
        "Assess security risk, findings, evidence, mitigations, and overall posture.",
      ),
    expectedOutputSchema: securityOutputSchema,
  },
  {
    name: "Evaluator",
    systemPrompt: [
      "You are Evaluator for AgentOS Inspector.",
      "Judge output accuracy, reliability, hallucination risk, confidence, and readiness.",
      sharedAgentInstructions,
    ].join(" "),
    userTemplate: (inputs) =>
      buildUserPrompt(
        "Evaluator",
        inputs,
        "Evaluate the likely quality of the proposed work and return readiness checks.",
      ),
    expectedOutputSchema: evaluatorOutputSchema,
  },
] as const satisfies readonly AgentPrompt[];

export type AgentName = (typeof agentPrompts)[number]["name"];
export type ContextDoctorOutput = z.infer<typeof contextDoctorOutputSchema>;
export type PlannerOutput = z.infer<typeof plannerOutputSchema>;
export type ResearchOutput = z.infer<typeof researchOutputSchema>;
export type CodingOutput = z.infer<typeof codingOutputSchema>;
export type TestingOutput = z.infer<typeof testingOutputSchema>;
export type SecurityOutput = z.infer<typeof securityOutputSchema>;
export type EvaluatorOutput = z.infer<typeof evaluatorOutputSchema>;
