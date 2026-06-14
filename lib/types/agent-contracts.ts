import { z } from "zod";

export const AGENT_NAMES = [
  "Context Doctor",
  "Planner",
  "Research",
  "Coding",
  "Testing",
  "Security",
  "Evaluator",
] as const;

export type AgentName = (typeof AGENT_NAMES)[number];

export type AgentStatus = "idle" | "running" | "complete" | "error";

export interface XAIAnswer {
  decision: string;
  reason: string;
  evidence: string[];
  confidence: number;
}

export const xaiAnswerSchema = z.object({
  decision: z.string().min(1),
  reason: z.string().min(1),
  evidence: z.array(z.string().min(1)),
  confidence: z.number().min(0).max(1),
});

export const agentStatusSchema = z.enum(["idle", "running", "complete", "error"]);
export const agentNameSchema = z.enum(AGENT_NAMES);
export const agentOutputSchema = z.object({
  agentName: agentNameSchema,
  status: agentStatusSchema,
  xai: xaiAnswerSchema,
  result: z.record(z.string(), z.unknown()),
});

export interface AgentOutput {
  agentName: AgentName;
  status: AgentStatus;
  xai: XAIAnswer;
  result: Record<string, unknown>;
}

export interface ContextDoctorResult {
  promptHealth: "healthy" | "needs-context" | "blocked";
  missingInputs: string[];
  clarifiedObjective: string;
}

export interface PlannerResult {
  planId: string;
  steps: string[];
  dependencies: string[];
}

export interface ResearchResult {
  findings: string[];
  sources: string[];
  openQuestions: string[];
}

export interface CodingResult {
  filesChanged: string[];
  implementationSummary: string;
  riskNotes: string[];
}

export interface TestingResult {
  checksRun: string[];
  passed: boolean;
  failures: string[];
}

export interface SecurityResult {
  riskLevel: "low" | "medium" | "high" | "critical";
  findings: string[];
  mitigations: string[];
}

export interface EvaluatorResult {
  score: number;
  rubric: Record<string, number>;
  recommendation: string;
}

export interface RunEvaluationMetrics {
  totalCostUsd: number;
  totalLatencySeconds: number;
  accuracy: number;
  reliability: number;
  confidence: number;
}

export interface RunSecurityFinding {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  source: string;
  detail: string;
}

export interface RunSecurityMetrics {
  riskScore: number;
  vulnerabilitiesFound: number;
  findings: RunSecurityFinding[];
}

export type ContextDoctorOutput = AgentOutput & {
  agentName: "Context Doctor";
  result: ContextDoctorResult;
};

export type PlannerOutput = AgentOutput & {
  agentName: "Planner";
  result: PlannerResult;
};

export type ResearchOutput = AgentOutput & {
  agentName: "Research";
  result: ResearchResult;
};

export type CodingOutput = AgentOutput & {
  agentName: "Coding";
  result: CodingResult;
};

export type TestingOutput = AgentOutput & {
  agentName: "Testing";
  result: TestingResult;
};

export type SecurityOutput = AgentOutput & {
  agentName: "Security";
  result: SecurityResult;
};

export type EvaluatorOutput = AgentOutput & {
  agentName: "Evaluator";
  result: EvaluatorResult;
};

export type AgentRunOutput =
  | ContextDoctorOutput
  | PlannerOutput
  | ResearchOutput
  | CodingOutput
  | TestingOutput
  | SecurityOutput
  | EvaluatorOutput;

export interface AgentRunRequest {
  githubUrl: string;
  screenShotName: string | null;
  problemDescription: string;
}

export interface AgentRunResponse {
  agents: AgentRunOutput[];
  evaluation: RunEvaluationMetrics;
  security: RunSecurityMetrics;
  status: "success" | "error";
  generatedAt: string;
  totalCostUsd: number;
  totalLatencyMs: number;
}

export const runEvaluationMetricsSchema = z.object({
  totalCostUsd: z.number().nonnegative(),
  totalLatencySeconds: z.number().nonnegative(),
  accuracy: z.number().min(0).max(1),
  reliability: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
});

export const runSecurityFindingSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  severity: z.enum(["low", "medium", "high", "critical"]),
  source: z.string().min(1),
  detail: z.string().min(1),
});

export const runSecurityMetricsSchema = z.object({
  riskScore: z.number().min(0).max(100),
  vulnerabilitiesFound: z.number().int().nonnegative(),
  findings: z.array(runSecurityFindingSchema),
});

export const agentRunResponseSchema = z.object({
  agents: z.array(agentOutputSchema).length(7),
  evaluation: runEvaluationMetricsSchema,
  security: runSecurityMetricsSchema,
  status: z.enum(["success", "error"]),
  generatedAt: z.string().min(1),
  totalCostUsd: z.number().nonnegative(),
  totalLatencyMs: z.number().int().nonnegative(),
});
