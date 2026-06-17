import { z } from "zod";

import { xaiSchema } from "../prompts/agent-prompts";

export const agentResultMetricsSchema = z
  .object({
    cost: z.number().min(0).optional(),
    latency: z.number().min(0).optional(),
    accuracy: z.number().min(0).max(1).optional(),
    reliability: z.number().min(0).max(1).optional(),
    riskScore: z.number().min(0).max(10).optional(),
    risk_score: z.number().min(0).max(10).optional(),
  })
  .passthrough();

export const agentOutputSchema = z
  .object({
    name: z.string().min(1),
    xai: xaiSchema,
    result: agentResultMetricsSchema,
  })
  ;

export const aggregateResultSchema = z
  .object({
    totalCost: z.number().min(0),
    totalLatency: z.number().min(0),
    accuracy: z.number().min(0).max(1),
    reliability: z.number().min(0).max(1),
    riskScore: z.number().min(0).max(10),
    confidence: z.number().min(0).max(1),
  })
  ;

export type AgentOutput = z.infer<typeof agentOutputSchema>;
export type AggregateResult = z.infer<typeof aggregateResultSchema>;

export function aggregateResults(agents: AgentOutput[]): AggregateResult {
  const parsedAgents = z.array(agentOutputSchema).length(7).parse(agents);
  const totalCost = sum(parsedAgents.map((agent) => agent.result.cost ?? 0));
  const totalLatency = sum(
    parsedAgents.map((agent) => agent.result.latency ?? 0),
  );
  const accuracy = average(
    parsedAgents.map((agent) => agent.result.accuracy ?? 0),
  );
  const securityAgent = findSecurityAgent(parsedAgents);
  const riskScore = calculateSecurityScore(securityAgent?.result);
  const reliability = calculateReliability(parsedAgents);
  const confidence = average(
    parsedAgents.map((agent) => agent.xai.confidence),
  );

  return aggregateResultSchema.parse({
    totalCost: roundMetric(totalCost),
    totalLatency: roundMetric(totalLatency),
    accuracy: roundMetric(accuracy),
    reliability: roundMetric(reliability),
    riskScore: roundMetric(riskScore),
    confidence: roundMetric(confidence),
  });
}

function calculateReliability(agents: AgentOutput[]): number {
  return average(
    agents.map((agent) => {
      if (agent.result.reliability !== undefined) {
        return agent.result.reliability;
      }

      const inferredAccuracy = agent.result.accuracy ?? 0;
      return clamp01((inferredAccuracy + agent.xai.confidence) / 2);
    }),
  );
}

function calculateSecurityScore(
  securityAgentResult: AgentOutput["result"] | undefined,
): number {
  if (!securityAgentResult) {
    return 0;
  }

  const explicitRiskScore =
    securityAgentResult.riskScore ?? securityAgentResult.risk_score;

  if (explicitRiskScore !== undefined) {
    return clamp(explicitRiskScore, 0, 10);
  }

  const findings = securityAgentResult.findings;

  if (!Array.isArray(findings) || findings.length === 0) {
    return 0;
  }

  return average(
    findings.map((finding) =>
      severityToRiskScore(isRecord(finding) ? finding.severity : undefined),
    ),
  );
}

function findSecurityAgent(agents: AgentOutput[]): AgentOutput | undefined {
  return agents.find((agent) => {
    const normalizedName = agent.name.toLowerCase();
    return (
      normalizedName.includes("security") ||
      agent.result.riskScore !== undefined ||
      agent.result.risk_score !== undefined
    );
  });
}

function severityToRiskScore(severity: unknown): number {
  if (typeof severity !== "string") {
    return 0;
  }

  const scores: Record<string, number> = {
    info: 1,
    low: 2.5,
    medium: 5,
    high: 7.5,
    critical: 9.5,
  };

  return scores[severity.toLowerCase()] ?? 0;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return sum(values) / values.length;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}

function roundMetric(value: number): number {
  return Number(clamp(value, 0, Number.MAX_SAFE_INTEGER).toFixed(4));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
