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

export const RunStatusSchema = z.enum(["success", "error"]);
export const AgentNameSchema = z.enum(AGENT_NAMES);
export const AgentStatusSchema = z.enum(["idle", "running", "complete", "error"]);
export const HallucinationRiskSchema = z.enum(["low", "medium", "high"]);
export const ApiErrorCodeSchema = z.enum([
  "VALIDATION_ERROR",
  "METHOD_NOT_ALLOWED",
  "AGENT_ERROR",
  "INTERNAL_ERROR",
]);

export const RunRequestSchema = z.object({
  githubUrl: z.string().url(),
  description: z.string().min(10).max(500),
  screenshot: z.string().optional(),
});

export const XaiSchema = z.object({
  decision: z.string().min(1),
  reason: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(1),
  confidence: z.number().min(0).max(1),
});

export const AgentResultSchema = z.record(z.string(), z.unknown());

export const SingleAgentSchema = z.object({
  id: z.string().min(1),
  name: AgentNameSchema,
  status: AgentStatusSchema,
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  latencyMs: z.number().int().nonnegative(),
  xai: XaiSchema,
  result: AgentResultSchema,
});

export const AgentOutputSchema = SingleAgentSchema;

export const EvaluationMetricsSchema = z.object({
  accuracy: z.number().min(0).max(100),
  reliability: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  totalCost: z.number().nonnegative(),
  latencyMs: z.number().int().nonnegative(),
  hallucinationRisk: HallucinationRiskSchema,
});

export const ApiErrorIssueSchema = z.object({
  path: z.string(),
  message: z.string().min(1),
});

export const ApiErrorSchema = z.object({
  code: ApiErrorCodeSchema,
  message: z.string().min(1),
  issues: z.array(ApiErrorIssueSchema).optional(),
});

export const RunResponseSchema = z.object({
  agents: z.array(AgentOutputSchema),
  evaluation: EvaluationMetricsSchema,
  status: RunStatusSchema,
  total_cost: z.number().nonnegative(),
  total_latency_ms: z.number().int().nonnegative(),
});

export const RunErrorResponseSchema = RunResponseSchema.extend({
  status: z.literal("error"),
  error: ApiErrorSchema,
});

export const ApiResponseSchema = z.union([
  RunErrorResponseSchema,
  RunResponseSchema,
]);

export const agentOutputSchema = AgentOutputSchema;
export const singleAgentSchema = SingleAgentSchema;
export const xaiSchema = XaiSchema;
export const evaluationMetricsSchema = EvaluationMetricsSchema;
export const apiErrorSchema = ApiErrorSchema;

export type RunStatus = z.infer<typeof RunStatusSchema>;
export type AgentName = z.infer<typeof AgentNameSchema>;
export type AgentStatus = z.infer<typeof AgentStatusSchema>;
export type HallucinationRisk = z.infer<typeof HallucinationRiskSchema>;
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
export type RunRequest = z.infer<typeof RunRequestSchema>;
export type Xai = z.infer<typeof XaiSchema>;
export type AgentResult = z.infer<typeof AgentResultSchema>;
export type SingleAgent = z.infer<typeof SingleAgentSchema>;
export type AgentOutput = z.infer<typeof AgentOutputSchema>;
export type EvaluationMetrics = z.infer<typeof EvaluationMetricsSchema>;
export type ApiErrorIssue = z.infer<typeof ApiErrorIssueSchema>;
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type RunResponse = z.infer<typeof RunResponseSchema>;
export type RunErrorResponse = z.infer<typeof RunErrorResponseSchema>;
export type ApiResponse = z.infer<typeof ApiResponseSchema>;
