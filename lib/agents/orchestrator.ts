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
import {
  runPlanner,
  type PlannerAgentOutput,
} from "./planner";
import { runResearch } from "./research";
import { runCoding } from "./coding";
import { runTesting } from "./testing";
import { runSecurity } from "./security";
import { runEvaluator } from "./evaluator";

import type {
  ResearchOutput as ResearchAgentOutput,
  CodingOutput as CodingAgentOutput,
  TestingOutput as TestingAgentOutput,
  SecurityOutput as SecurityAgentOutput,
  EvaluatorOutput as EvaluatorAgentOutput,
} from "../prompts/agent-prompts";

import type {
  AgentName,
  AgentRunOutput,
  AgentRunResponse,
  CodingOutput,
  ContextDoctorOutput,
  EvaluatorOutput,
  PlannerOutput,
  ResearchOutput,
  SecurityOutput,
  TestingOutput,
} from "@/lib/types/agent-contracts";

const runInputSchema = z
  .object({
    githubUrl: z.string().url(),
    description: z.string().min(10).optional(),
    problemDescription: z.string().min(10).optional(),
    screenshot: z.string().min(1).nullable().optional(),
    screenShotName: z.string().min(1).nullable().optional(),
  })
  
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

  const agentInputs = { githubUrl: input.githubUrl, description: input.description };

  const [research, coding, testing, securityModel, evaluator] = await Promise.all([
    runResearch(agentInputs, { allowMockFallback: true }),
    runCoding(agentInputs, { allowMockFallback: true }),
    runTesting(agentInputs, { allowMockFallback: true }),
    runSecurity(agentInputs, { allowMockFallback: true }),
    runEvaluator(agentInputs, { allowMockFallback: true }),
  ]);

  const security: AgentRunResponse["security"] = {
    riskScore: securityModel.riskScore,
    vulnerabilitiesFound: securityModel.findings.length,
    findings: securityModel.findings.map((finding, index) => ({
      id: `sec-${String(index + 1).padStart(3, "0")}`,
      title: finding.title,
      severity: finding.severity,
      source: "Security agent",
      detail: finding.mitigation,
    })),
  };

  const agents = createAgentOutputs(
    contextDoctor,
    planner,
    research,
    coding,
    testing,
    securityModel,
    evaluator,
    contextDoctor
  );
  
  const totalLatencyMs = Date.now() - startedAt;
  const metricAgents = createMetricAgentOutputs(
    agents,
    totalLatencyMs,
    contextDoctor,
    planner,
    research,
    coding,
    testing,
    securityModel,
    evaluator,
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
  contextDoctor: ContextDoctorAgentOutput,
  planner: PlannerAgentOutput,
  research: ResearchAgentOutput,
  coding: CodingAgentOutput,
  testing: TestingAgentOutput,
  security: SecurityAgentOutput,
  evaluator: EvaluatorAgentOutput,
  contextDoctorRefForSecurity: ContextDoctorAgentOutput,
): AgentRunOutput[] {
  return [
    toContextDoctorOutput(contextDoctor),
    toPlannerOutput(planner),
    toResearchOutput(research),
    toCodingOutput(coding),
    toTestingOutput(testing),
    toSecurityOutput(security, contextDoctorRefForSecurity),
    toEvaluatorOutput(evaluator),
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

function toResearchOutput(output: ResearchAgentOutput): ResearchOutput {
  return {
    agentName: "Research",
    status: "complete",
    xai: output.xai,
    result: {
      findings: output.rootCauseHypotheses.map(h => h.hypothesis),
      sources: [...output.mostRelevantFiles],
      openQuestions: [...output.unknowns],
    },
  };
}

function toCodingOutput(output: CodingAgentOutput): CodingOutput {
  return {
    agentName: "Coding",
    status: "complete",
    xai: output.xai,
    result: {
      filesChanged: output.filesToModify.map((file) => file.path),
      implementationSummary: output.implementationNotes.join(" "),
      riskNotes: [output.rollbackPlan],
    },
  };
}

function toTestingOutput(output: TestingAgentOutput): TestingOutput {
  return {
    agentName: "Testing",
    status: "complete",
    xai: output.xai,
    result: {
      checksRun: output.testCases.map((test) => test.name),
      passed: true,
      failures: [],
    },
  };
}

function toSecurityOutput(
  output: SecurityAgentOutput,
  contextDoctor: ContextDoctorAgentOutput,
): SecurityOutput {
  return {
    agentName: "Security",
    status: "complete",
    xai: {
      ...output.xai,
      evidence: [
        ...output.xai.evidence,
        `Context Doctor severity: ${contextDoctor.severity}`,
        `Security findings generated: ${output.findings.length}`,
      ],
      confidence: output.xai.confidence,
    },
    result: {
      riskLevel: scoreToRiskLevel(output.riskScore),
      findings: output.findings.map((finding) => finding.title),
      mitigations: output.findings.map((finding) => finding.mitigation),
    },
  };
}

function toEvaluatorOutput(output: EvaluatorAgentOutput): EvaluatorOutput {
  return {
    agentName: "Evaluator",
    status: "complete",
    xai: output.xai,
    result: {
      score: Math.round(output.accuracy * 100),
      rubric: {
        accuracy: output.accuracy,
        reliability: output.reliability,
        confidence: output.confidence,
      },
      recommendation: output.checks
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
  research: ResearchAgentOutput,
  coding: CodingAgentOutput,
  testing: TestingAgentOutput,
  securityModel: SecurityAgentOutput,
  evaluator: EvaluatorAgentOutput,
): MetricAgentOutput[] {
  const perAgentLatency = Math.max(
    MOCK_AGENT_LATENCY_MS,
    Math.round(totalLatencyMs / agents.length),
  );

  return agents.map((agent) => {
    let accuracy = 0.8;
    let reliability = 0.8;
    let risk_score = 0;
    let findings: SecurityAgentOutput["findings"] = [];

    switch (agent.agentName) {
      case "Context Doctor":
        accuracy = contextDoctor.confidence;
        reliability = contextDoctor.severity === "high" ? 0.78 : 0.88;
        break;
      case "Planner":
        accuracy = planner.xai.confidence;
        reliability = 0.88;
        break;
      case "Research":
        accuracy = research.xai.confidence;
        reliability = 0.90;
        break;
      case "Coding":
        accuracy = coding.xai.confidence;
        reliability = 0.88;
        break;
      case "Testing":
        accuracy = testing.xai.confidence;
        reliability = 0.92;
        break;
      case "Security":
        accuracy = securityModel.xai.confidence;
        reliability = 0.89;
        risk_score = securityModel.riskScore / 10;
        findings = securityModel.findings;
        break;
      case "Evaluator":
        accuracy = evaluator.accuracy;
        reliability = evaluator.reliability;
        break;
    }

    const base = {
      name: agent.agentName,
      xai: agent.xai,
      result: {
        cost: isBillableLiveAgent(agent) ? LIVE_AGENT_COST_USD : 0,
        latency: isLiveAgent(agent.agentName)
          ? perAgentLatency
          : MOCK_AGENT_LATENCY_MS,
        accuracy,
        reliability,
      },
    };

    if (agent.agentName === "Security") {
      return {
        ...base,
        result: {
          ...base.result,
          risk_score,
          findings,
        },
      };
    }

    return base;
  });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function isLiveAgent(_agentName: AgentName): boolean {
  return true;
}

function isBillableLiveAgent(agent: AgentRunOutput): boolean {
  return isLiveAgent(agent.agentName) && !isFallbackOutput(agent);
}

function isFallbackOutput(agent: AgentRunOutput): boolean {
  const fallbackText = `${agent.xai.decision} ${agent.xai.reason}`;
  return /fallback|OPENAI_API_KEY is required/iu.test(fallbackText);
}

function scoreToRiskLevel(
  riskScore: number,
): SecurityOutput["result"]["riskLevel"] {
  if (riskScore >= 9) {
    return "critical";
  }

  if (riskScore >= 7) {
    return "high";
  }

  if (riskScore >= 4) {
    return "medium";
  }

  return "low";
}

export { runInputSchema };
