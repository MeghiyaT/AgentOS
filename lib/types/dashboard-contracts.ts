import { z } from "zod";

export const evaluationMetricsSchema = z.object({
  totalCostUsd: z.number().nonnegative(),
  totalLatencySeconds: z.number().nonnegative(),
  accuracy: z.number().min(0).max(1),
  reliability: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
});

export const securityFindingSchema = z.object({
  id: z.string(),
  title: z.string(),
  severity: z.enum(["info", "low", "medium", "high", "critical"]),
  source: z.string(),
  detail: z.string(),
});

export const securityMetricsSchema = z.object({
  riskScore: z.number().min(0).max(100),
  vulnerabilitiesFound: z.number().int().nonnegative(),
  findings: z.array(securityFindingSchema),
});

export const dashboardMetricsResponseSchema = z.object({
  profile: z.enum(["standard", "high-risk"]),
  generatedAt: z.string(),
  evaluation: evaluationMetricsSchema,
  security: securityMetricsSchema,
});

export type EvaluationMetrics = z.infer<typeof evaluationMetricsSchema>;
export type SecurityFinding = z.infer<typeof securityFindingSchema>;
export type SecurityMetrics = z.infer<typeof securityMetricsSchema>;
export type DashboardMetricsResponse = z.infer<
  typeof dashboardMetricsResponseSchema
>;
export type DashboardProfile = DashboardMetricsResponse["profile"];
