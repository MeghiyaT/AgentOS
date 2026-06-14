import { z } from "zod";

import {
  contextDoctorAgentOutputSchema,
  runContextDoctor,
  type ContextDoctorAgentOutput,
} from "./context-doctor";
import {
  aggregateResults,
  type AgentOutput as MetricAgentOutput,
} from "./evaluator-mock";
import { CODING_MOCK } from "./mocks/coding-mock";
import { EVALUATOR_MOCK } from "./mocks/evaluator-mock";
import { RESEARCH_MOCK } from "./mocks/research-mock";
import { SECURITY_MOCK } from "./mocks/security-mock";
import { TESTING_MOCK } from "./mocks/testing-mock";
import {
  runPlanner,
  type PlannerAgentOutput,
} from "./planner";
import type {
  AgentName,
  AgentRunOutput,
  AgentRunResponse,
  CodingOutput,
  ContextDoctorOutput,
  EvaluatorOutput,
  PlannerOutput,
  ResearchOutput,
  RunSecurityFinding,
  SecurityOutput,
  TestingOutput,
  XAIAnswer,
} from "@/lib/types/agent-contracts";

const runInputSchema = z
  .object({
    githubUrl: z.string().url(),
    description: z.string().min(10).optional(),
    problemDescription: z.string().min(10).optional(),
    screenshot: z.string().min(1).nullable().optional(),
    screenShotName: z.string().min(1).nullable().optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (!input.description && !input.problemDescription) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "description or problemDescription is required.",
        path: ["description"],
      });
    }
  });

type RunInput = z.infer<typeof runInputSchema>;

type NormalizedRunInput = {
  githubUrl: string;
  description: string;
  screenshot: string | null;
};

const MOCK_AGENT_LATENCY_MS = 18;
const LIVE_AGENT_COST_USD = 0.019;

export async function runAgentOSInspection(
  rawInput: unknown,
): Promise<AgentRunResponse> {
  const startedAt = Date.now();
  const input = normalizeRunInput(runInputSchema.parse(rawInput));
  const contextDoctor = await runContextDoctor({
    githubUrl: input.githubUrl,
    description: input.description,
    screenshot: input.screenshot,
  });
  const planner = await runPlanner(
    {
      description: input.description,
      contextDoctor: contextDoctorAgentOutputSchema.parse(contextDoctor),
    },
    { allowMockFallback: true },
  );
  const security = createSecurityMetrics(input, contextDoctor);
  const agents = createAgentOutputs(input, contextDoctor, planner, security);
  const totalLatencyMs = Date.now() - startedAt;
  const metricAgents = createMetricAgentOutputs(
    agents,
    totalLatencyMs,
    contextDoctor,
    planner,
    security,
  );
  const aggregate = aggregateResults(metricAgents);

  return {
    agents,
    evaluation: {
      totalCostUsd: aggregate.totalCost,
      totalLatencySeconds: totalLatencyMs / 1000,
      accuracy: aggregate.accuracy,
      reliability: aggregate.reliability,
      confidence: aggregate.confidence,
    },
    security,
    status: "success",
    generatedAt: new Date().toISOString(),
    totalCostUsd: aggregate.totalCost,
    totalLatencyMs,
  };
}

function normalizeRunInput(input: RunInput): NormalizedRunInput {
  return {
    githubUrl: input.githubUrl,
    description: input.description ?? input.problemDescription ?? "",
    screenshot: input.screenshot ?? input.screenShotName ?? null,
  };
}

function createAgentOutputs(
  input: NormalizedRunInput,
  contextDoctor: ContextDoctorAgentOutput,
  planner: PlannerAgentOutput,
  security: AgentRunResponse["security"],
): AgentRunOutput[] {
  return [
    toContextDoctorOutput(contextDoctor),
    toPlannerOutput(planner),
    toResearchOutput(input),
    toCodingOutput(),
    toTestingOutput(),
    toSecurityOutput(security, contextDoctor),
    toEvaluatorOutput(planner),
  ];
}

function toContextDoctorOutput(
  output: ContextDoctorAgentOutput,
): ContextDoctorOutput {
  return {
    agentName: "Context Doctor",
    status: "complete",
    xai: output.xai,
    result: {
      promptHealth:
        output.severity === "high"
          ? "blocked"
          : output.severity === "medium"
            ? "needs-context"
            : "healthy",
      missingInputs: output.missing_items,
      clarifiedObjective: output.diagnosis,
    },
  };
}

function toPlannerOutput(output: PlannerAgentOutput): PlannerOutput {
  return {
    agentName: "Planner",
    status: "complete",
    xai: output.xai,
    result: {
      planId: `plan-${Date.now()}`,
      steps: output.tasks.map(
        (task) => `${task.name} (${task.duration})`,
      ),
      dependencies: Array.from(
        new Set(output.tasks.flatMap((task) => task.dependencies)),
      ),
    },
  };
}

function toResearchOutput(input: NormalizedRunInput): ResearchOutput {
  return {
    agentName: "Research",
    status: "complete",
    xai: cloneXai(RESEARCH_MOCK.xai),
    result: {
      findings: [
        RESEARCH_MOCK.hypothesis,
        ...RESEARCH_MOCK.evidence,
        `Inspected request for ${input.githubUrl}`,
      ],
      sources: [...RESEARCH_MOCK.relevant_files],
      openQuestions: [...RESEARCH_MOCK.result.unknowns],
    },
  };
}

function toCodingOutput(): CodingOutput {
  return {
    agentName: "Coding",
    status: "complete",
    xai: cloneXai(CODING_MOCK.xai),
    result: {
      filesChanged: CODING_MOCK.result.files_to_modify.map((file) => file.path),
      implementationSummary: CODING_MOCK.result.implementation_notes.join(" "),
      riskNotes: [CODING_MOCK.result.rollback_plan],
    },
  };
}

function toTestingOutput(): TestingOutput {
  return {
    agentName: "Testing",
    status: "complete",
    xai: cloneXai(TESTING_MOCK.xai),
    result: {
      checksRun: TESTING_MOCK.result.test_cases.map((test) => test.name),
      passed: true,
      failures: [],
    },
  };
}

function toSecurityOutput(
  security: AgentRunResponse["security"],
  contextDoctor: ContextDoctorAgentOutput,
): SecurityOutput {
  const xai = cloneXai(SECURITY_MOCK.xai);

  return {
    agentName: "Security",
    status: "complete",
    xai: {
      ...xai,
      evidence: [
        ...xai.evidence,
        `Context Doctor severity: ${contextDoctor.severity}`,
        `Security findings generated: ${security.findings.length}`,
      ],
      confidence: calculateSecurityConfidence(security.riskScore),
    },
    result: {
      riskLevel: scoreToRiskLevel(security.riskScore),
      findings: security.findings.map((finding) => finding.title),
      mitigations: security.findings.map((finding) => finding.detail),
    },
  };
}

function toEvaluatorOutput(planner: PlannerAgentOutput): EvaluatorOutput {
  return {
    agentName: "Evaluator",
    status: "complete",
    xai: cloneXai(EVALUATOR_MOCK.xai),
    result: {
      score: Math.round(EVALUATOR_MOCK.result.accuracy * 100),
      rubric: {
        accuracy: EVALUATOR_MOCK.result.accuracy,
        reliability: EVALUATOR_MOCK.result.reliability,
        confidence: planner.xai.confidence,
      },
      recommendation: EVALUATOR_MOCK.result.checks
        .map((check) => `${check.name}: ${check.status}`)
        .join("; "),
    },
  };
}

function createMetricAgentOutputs(
  agents: AgentRunOutput[],
  totalLatencyMs: number,
  contextDoctor: ContextDoctorAgentOutput,
  planner: PlannerAgentOutput,
  security: AgentRunResponse["security"],
): MetricAgentOutput[] {
  const perAgentLatency = Math.max(
    MOCK_AGENT_LATENCY_MS,
    Math.round(totalLatencyMs / agents.length),
  );

  return agents.map((agent) => {
    const base = {
      name: agent.agentName,
      xai: agent.xai,
      result: {
        cost: isBillableLiveAgent(agent) ? LIVE_AGENT_COST_USD : 0,
        latency: isLiveAgent(agent.agentName)
          ? perAgentLatency
          : MOCK_AGENT_LATENCY_MS,
        accuracy: getAccuracy(agent.agentName),
        reliability: getReliability(agent.agentName),
      },
    };

    if (agent.agentName === "Security") {
      return {
        ...base,
        result: {
          ...base.result,
          risk_score: security.riskScore / 10,
          findings: security.findings,
        },
      };
    }

    if (agent.agentName === "Context Doctor") {
      return {
        ...base,
        result: {
          ...base.result,
          accuracy: contextDoctor.confidence,
          reliability: contextDoctor.severity === "high" ? 0.78 : 0.88,
        },
      };
    }

    if (agent.agentName === "Planner") {
      return {
        ...base,
        result: {
          ...base.result,
          accuracy: planner.xai.confidence,
          reliability: 0.88,
        },
      };
    }

    return base;
  });
}

function createSecurityMetrics(
  input: NormalizedRunInput,
  contextDoctor: ContextDoctorAgentOutput,
): AgentRunResponse["security"] {
  const findings = createSecurityFindings(input, contextDoctor);

  return {
    riskScore: calculateRiskScore(findings, contextDoctor.severity),
    vulnerabilitiesFound: findings.length,
    findings,
  };
}

function isLiveAgent(agentName: AgentName): boolean {
  return agentName === "Context Doctor" || agentName === "Planner";
}

function isBillableLiveAgent(agent: AgentRunOutput): boolean {
  return isLiveAgent(agent.agentName) && !isFallbackOutput(agent);
}

function isFallbackOutput(agent: AgentRunOutput): boolean {
  const fallbackText = `${agent.xai.decision} ${agent.xai.reason}`;

  return /fallback|OPENAI_API_KEY is required/iu.test(fallbackText);
}

function createSecurityFindings(
  input: NormalizedRunInput,
  contextDoctor: ContextDoctorAgentOutput,
): RunSecurityFinding[] {
  const findings: RunSecurityFinding[] = [];
  const missingText = contextDoctor.missing_items.join(" ").toLowerCase();
  const description = input.description.toLowerCase();

  if (/\b(api[_\s-]?key|token|password|secret|credential)\b/iu.test(description)) {
    findings.push({
      id: "sec-001",
      title: "Sensitive credential-like text in problem description",
      severity: "critical",
      source: "Security agent",
      detail:
        "Remove secrets from user-visible prompts and keep credentials only in server-side environment variables.",
    });
  }

  if (missingText.includes("api specification") || missingText.includes("contract")) {
    findings.push({
      id: `sec-${String(findings.length + 1).padStart(3, "0")}`,
      title: "Missing API contract increases validation risk",
      severity: "medium",
      source: "Security agent",
      detail:
        "Add an API contract or OpenAPI document before exposing generated endpoint findings to admins.",
    });
  }

  if (missingText.includes("environment variable")) {
    findings.push({
      id: `sec-${String(findings.length + 1).padStart(3, "0")}`,
      title: "Runtime environment drift can break live agents",
      severity: "high",
      source: "Security agent",
      detail:
        "Create a redacted .env.example and verify production secrets are configured outside the client bundle.",
    });
  }

  if (input.screenshot) {
    findings.push({
      id: `sec-${String(findings.length + 1).padStart(3, "0")}`,
      title: "Screenshot context may expose private project data",
      severity: "low",
      source: "Security agent",
      detail:
        "Review uploaded screenshots for tokens, emails, internal URLs, and customer data before demo sharing.",
    });
  }

  if (/\b(auth|login|admin|role|permission|tenant|session)\b/iu.test(description)) {
    findings.push({
      id: `sec-${String(findings.length + 1).padStart(3, "0")}`,
      title: "Authorization-sensitive workflow needs access review",
      severity: "high",
      source: "Security agent",
      detail:
        "Validate role checks, session handling, and least-privilege behavior for the requested workflow.",
    });
  }

  const seededFindings: RunSecurityFinding[] = SECURITY_MOCK.result.findings.map(
    (finding, index) => ({
      id: `sec-${String(findings.length + index + 1).padStart(3, "0")}`,
      title: finding.title,
      severity: finding.severity,
      source: "Security agent",
      detail: finding.mitigation,
    }),
  );

  return [...findings, ...seededFindings].slice(0, 3).map((finding, index) => ({
    ...finding,
    id: `sec-${String(index + 1).padStart(3, "0")}`,
  }));
}

function calculateRiskScore(
  findings: RunSecurityFinding[],
  contextSeverity: ContextDoctorAgentOutput["severity"],
): number {
  const contextAdjustment: Record<ContextDoctorAgentOutput["severity"], number> = {
    low: 0,
    medium: 6,
    high: 12,
  };
  const averageSeverity =
    findings.length === 0
      ? 0
      : findings.reduce(
          (total, finding) => total + severityToRiskScore(finding.severity),
          0,
        ) / findings.length;

  return Math.min(
    100,
    Math.round(averageSeverity * 10 + contextAdjustment[contextSeverity]),
  );
}

function severityToRiskScore(severity: RunSecurityFinding["severity"]): number {
  const scores: Record<RunSecurityFinding["severity"], number> = {
    low: 2,
    medium: 5,
    high: 7.5,
    critical: 9.5,
  };

  return scores[severity];
}

function scoreToRiskLevel(
  riskScore: number,
): SecurityOutput["result"]["riskLevel"] {
  if (riskScore >= 90) {
    return "critical";
  }

  if (riskScore >= 70) {
    return "high";
  }

  if (riskScore >= 40) {
    return "medium";
  }

  return "low";
}

function calculateSecurityConfidence(riskScore: number): number {
  return Number(Math.min(0.94, Math.max(0.64, 0.74 + riskScore / 500)).toFixed(2));
}

function getAccuracy(agentName: AgentName): number {
  const scores: Record<AgentName, number> = {
    "Context Doctor": 0.82,
    Planner: 0.84,
    Research: 0.8,
    Coding: 0.78,
    Testing: 0.83,
    Security: 0.81,
    Evaluator: EVALUATOR_MOCK.result.accuracy,
  };

  return scores[agentName];
}

function getReliability(agentName: AgentName): number {
  const scores: Record<AgentName, number> = {
    "Context Doctor": 0.86,
    Planner: 0.88,
    Research: 0.9,
    Coding: 0.88,
    Testing: 0.92,
    Security: 0.89,
    Evaluator: EVALUATOR_MOCK.result.reliability,
  };

  return scores[agentName];
}

function cloneXai(xai: {
  decision: string;
  reason: string;
  evidence: readonly string[];
  confidence: number;
}): XAIAnswer {
  return {
    decision: xai.decision,
    reason: xai.reason,
    evidence: [...xai.evidence],
    confidence: xai.confidence,
  };
}

export { runInputSchema };
