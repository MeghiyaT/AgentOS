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
  const agents = createAgentOutputs(input, contextDoctor, planner);
  const totalLatencyMs = Date.now() - startedAt;
  const metricAgents = createMetricAgentOutputs(
    agents,
    totalLatencyMs,
    contextDoctor,
    planner,
  );
  const aggregate = aggregateResults(metricAgents);
  const security = createSecurityMetrics();

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
): AgentRunOutput[] {
  return [
    toContextDoctorOutput(contextDoctor),
    toPlannerOutput(planner),
    toResearchOutput(input),
    toCodingOutput(),
    toTestingOutput(),
    toSecurityOutput(),
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

function toSecurityOutput(): SecurityOutput {
  return {
    agentName: "Security",
    status: "complete",
    xai: cloneXai(SECURITY_MOCK.xai),
    result: {
      riskLevel: "high",
      findings: SECURITY_MOCK.result.findings.map((finding) => finding.title),
      mitigations: SECURITY_MOCK.result.findings.map(
        (finding) => finding.mitigation,
      ),
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
        cost: isLiveAgent(agent.agentName) ? LIVE_AGENT_COST_USD : 0,
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
          risk_score: SECURITY_MOCK.result.risk_score,
          findings: SECURITY_MOCK.result.findings,
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

function createSecurityMetrics(): AgentRunResponse["security"] {
  const findings: RunSecurityFinding[] = SECURITY_MOCK.result.findings.map(
    (finding, index) => ({
      id: `sec-${String(index + 1).padStart(3, "0")}`,
      title: finding.title,
      severity: finding.severity,
      source: "Security agent",
      detail: finding.mitigation,
    }),
  );

  return {
    riskScore: SECURITY_MOCK.result.risk_score * 10,
    vulnerabilitiesFound: findings.length,
    findings,
  };
}

function isLiveAgent(agentName: AgentName): boolean {
  return agentName === "Context Doctor" || agentName === "Planner";
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
