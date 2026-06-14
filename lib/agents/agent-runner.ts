import OpenAI from "openai";
import { z } from "zod";

import {
  type AgentName,
  type AgentOutput,
  type AgentResult,
  type EvaluationMetrics,
  type RunErrorResponse,
  type RunRequest,
  type RunResponse,
  type Xai,
  AgentOutputSchema,
  AgentResultSchema,
  RunErrorResponseSchema,
  RunRequestSchema,
  RunResponseSchema,
  XaiSchema,
} from "../schemas/api-schemas";

const OPENAI_MODEL = "gpt-4o";

export type AgentConfig = {
  order: number;
  id: string;
  name: AgentName;
  usesOpenAI: boolean;
};

type NormalizedRunRequest = Omit<RunRequest, "screenshot"> & {
  screenshot: string | null;
};

type ChatMessage = {
  role: "system" | "user";
  content: string;
};

export type ChatCompletionRequest = {
  model: string;
  messages: ChatMessage[];
  response_format: {
    type: "json_object";
  };
  temperature: number;
};

export type ChatCompletionResult = {
  content: string | null;
  totalTokens: number;
};

export type ChatCompletionClient = {
  createChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResult>;
};

export type AgentRunnerOptions = {
  completionClient?: ChatCompletionClient;
  allowOpenAIFallback?: boolean;
};

const OpenAIAgentPayloadSchema = z.object({
  xai: XaiSchema,
  result: AgentResultSchema,
});

export const AGENT_CONFIG: readonly AgentConfig[] = [
  {
    order: 1,
    id: "context-doctor",
    name: "Context Doctor",
    usesOpenAI: true,
  },
  {
    order: 2,
    id: "planner",
    name: "Planner",
    usesOpenAI: false,
  },
  {
    order: 3,
    id: "researcher",
    name: "Research",
    usesOpenAI: true,
  },
  {
    order: 4,
    id: "coder",
    name: "Coding",
    usesOpenAI: false,
  },
  {
    order: 5,
    id: "tester",
    name: "Testing",
    usesOpenAI: false,
  },
  {
    order: 6,
    id: "security",
    name: "Security",
    usesOpenAI: false,
  },
  {
    order: 7,
    id: "evaluator",
    name: "Evaluator",
    usesOpenAI: false,
  },
];

export async function runAgentOrchestrator(
  input: unknown,
  options: AgentRunnerOptions = {},
): Promise<RunResponse> {
  const startedAt = Date.now();
  const validated = RunRequestSchema.parse(input);
  const normalizedInput: NormalizedRunRequest = {
    ...validated,
    screenshot: validated.screenshot ?? null,
  };
  const agents: AgentOutput[] = [];
  const orderedConfig = [...AGENT_CONFIG].sort((left, right) => left.order - right.order);
  const contextDoctor = orderedConfig[0];
  const planner = orderedConfig[1];
  const parallelAgents = orderedConfig.slice(2, 6);
  const evaluator = orderedConfig[6];

  if (!contextDoctor || !planner || !evaluator || parallelAgents.length !== 4) {
    throw new Error("AGENT_CONFIG must define seven ordered agents.");
  }

  const contextOutput = await runAgent(
    contextDoctor,
    normalizedInput,
    agents,
    options,
  );
  agents.push(contextOutput);

  if (contextOutput.status === "complete") {
    const plannerOutput = await runAgent(
      planner,
      normalizedInput,
      agents,
      options,
    );
    agents.push(plannerOutput);
  }

  if (agents.every((agent) => agent.status === "complete")) {
    const parallelResults = await Promise.all(
      parallelAgents.map((agentConfig) =>
        runAgent(agentConfig, normalizedInput, agents, options),
      ),
    );
    agents.push(...parallelResults);
  }

  if (agents.every((agent) => agent.status === "complete")) {
    agents.push(await runAgent(evaluator, normalizedInput, agents, options));
  }

  const totalLatencyMs = Date.now() - startedAt;
  const evaluation = aggregateResults(agents, totalLatencyMs);
  const response: RunResponse = {
    agents,
    evaluation,
    status: agents.every((agent) => agent.status === "complete")
      ? "success"
      : "error",
    total_cost: evaluation.totalCost,
    total_latency_ms: totalLatencyMs,
  };

  return RunResponseSchema.parse(response);
}

export async function runAgent(
  agentConfig: AgentConfig,
  input: NormalizedRunRequest,
  previousResults: readonly AgentOutput[],
  options: AgentRunnerOptions = {},
): Promise<AgentOutput> {
  const startedAt = Date.now();
  const startTime = new Date(startedAt).toISOString();

  try {
    const data = agentConfig.usesOpenAI
      ? await generateOpenAIAgentData(
          agentConfig,
          input,
          previousResults,
          options,
        )
      : generateMockAgentData(agentConfig, input, previousResults);
    const finishedAt = Date.now();

    return AgentOutputSchema.parse({
      id: agentConfig.id,
      name: agentConfig.name,
      status: "complete",
      startTime,
      endTime: new Date(finishedAt).toISOString(),
      latencyMs: finishedAt - startedAt,
      xai: data.xai,
      result: data.result,
    });
  } catch (error) {
    const finishedAt = Date.now();

    return AgentOutputSchema.parse({
      id: agentConfig.id,
      name: agentConfig.name,
      status: "error",
      startTime,
      endTime: new Date(finishedAt).toISOString(),
      latencyMs: finishedAt - startedAt,
      xai: {
        decision: "Stop sequential execution",
        reason:
          "The agent failed before producing a schema-valid completion payload.",
        evidence: [
          `Agent: ${agentConfig.name}`,
          `Error: ${getErrorMessage(error)}`,
        ],
        confidence: 0.2,
      },
      result: {
        error: getErrorMessage(error),
      },
    });
  }
}

export function generateMockAgentData(
  agentConfig: AgentConfig,
  input: NormalizedRunRequest,
  previousResults: readonly AgentOutput[] = [],
): {
  xai: Xai;
  result: AgentResult;
} {
  switch (agentConfig.id) {
    case "planner":
      return {
        xai: {
          decision: "Use sequential demo-first planning",
          reason:
            "The prior Context Doctor result is available, so the next safest step is a compact execution plan.",
          evidence: [
            "Context Doctor completed before Planner",
            `Repository: ${extractRepositoryName(input.githubUrl)}`,
            `${previousResults.length} upstream result available`,
          ],
          confidence: 0.84,
        },
        result: {
          strategy:
            "Inspect context, research scope, coding readiness, tests, security, then synthesize evaluator metrics.",
          tasks: [
            {
              name: "Confirm inspection context",
              duration: "1 min",
              dependencies: [],
            },
            {
              name: "Map demo-critical risks",
              duration: "2 min",
              dependencies: ["Confirm inspection context"],
            },
            {
              name: "Prepare evaluator summary",
              duration: "1 min",
              dependencies: ["Map demo-critical risks"],
            },
          ],
        },
      };
    case "coder":
      return {
        xai: {
          decision: "Report implementation readiness",
          reason:
            "The API contract is schema-first and the runner can return typed agent outputs without frontend coupling.",
          evidence: [
            "AgentOutputSchema validates each runner result",
            "RunResponseSchema validates aggregate output",
          ],
          confidence: 0.8,
        },
        result: {
          implementationStatus: "ready-for-integration",
          filesToReview: [
            "lib/agents/agent-runner.ts",
            "app/api/run/route.ts",
          ],
          nextCodeStep:
            "Replace remaining mock agents one at a time after endpoint demos are stable.",
        },
      };
    case "tester":
      return {
        xai: {
          decision: "Prioritize contract tests",
          reason:
            "The highest-risk backend failure is schema drift between agent outputs and the API response.",
          evidence: [
            "Strict TypeScript is enabled",
            "Runtime Zod parsing is required for every AgentOutput",
          ],
          confidence: 0.82,
        },
        result: {
          testPlan: [
            "Validate AGENT_CONFIG count and order",
            "Parse every AgentOutput with AgentOutputSchema",
            "Run orchestrator with injected OpenAI-compatible fake client",
          ],
          status: "covered-by-agent-runner-test",
        },
      };
    case "security":
      return {
        xai: {
          decision: "Keep graceful failures structured",
          reason:
            "The runner should fail closed with schema-valid error outputs instead of leaking raw provider responses.",
          evidence: [
            "OpenAI responses are parsed through Zod",
            "Agent errors include sanitized messages in result.error",
          ],
          confidence: 0.78,
        },
        result: {
          riskLevel: "medium",
          mitigations: [
            "Use environment variables for OpenAI keys",
            "Avoid logging provider payloads with secrets",
            "Return structured errors from failed agents",
          ],
        },
      };
    case "evaluator":
      return {
        xai: {
          decision: "Synthesize final metrics",
          reason:
            "All previous complete outputs include confidence-bearing XAI, enabling a deterministic aggregate score.",
          evidence: [
            `${previousResults.length} upstream agent outputs received`,
            `${previousResults.filter((agent) => agent.status === "complete").length} upstream agents complete`,
          ],
          confidence: 0.85,
        },
        result: {
          recommendation:
            "Proceed with the demo if the route build and runner tests stay green.",
          completedAgents: previousResults.filter(
            (agent) => agent.status === "complete",
          ).length,
          summary:
            "The orchestrator produces a coherent seven-agent trace with explainability on every step.",
        },
      };
    default:
      throw new Error(`No mock data configured for ${agentConfig.id}.`);
  }
}

export function aggregateResults(
  agents: readonly AgentOutput[],
  totalLatencyMs = sumAgentLatency(agents),
): EvaluationMetrics {
  const completeAgents = agents.filter((agent) => agent.status === "complete");
  const errorAgents = agents.filter((agent) => agent.status === "error");
  const averageConfidence =
    agents.length === 0
      ? 0
      : agents.reduce((sum, agent) => sum + agent.xai.confidence, 0) /
        agents.length;
  const reliability =
    AGENT_CONFIG.length === 0
      ? 0
      : (completeAgents.length / AGENT_CONFIG.length) * 100;
  const confidence = averageConfidence * 100;
  const errorPenalty = errorAgents.length * 12;
  const accuracy = confidence - errorPenalty - missingAgentPenalty(agents);

  return {
    accuracy: clampMetric(accuracy),
    reliability: clampMetric(reliability),
    confidence: clampMetric(confidence),
    totalCost: roundCurrency(sumAgentCosts(agents)),
    latencyMs: Math.max(0, Math.round(totalLatencyMs)),
    hallucinationRisk: computeHallucinationRisk(confidence, errorAgents.length),
  };
}

export function createRunErrorResponse(
  error: unknown,
  latencyMs: number,
): RunErrorResponse {
  const response: RunErrorResponse =
    error instanceof z.ZodError
      ? {
          agents: [],
          evaluation: createFailedEvaluation(latencyMs),
          status: "error",
          total_cost: 0,
          total_latency_ms: latencyMs,
          error: {
            code: "VALIDATION_ERROR",
            message: "Request body did not match RunRequestSchema.",
            issues: error.issues.map((issue) => ({
              path: issue.path.join("."),
              message: issue.message,
            })),
          },
        }
      : {
          agents: [],
          evaluation: createFailedEvaluation(latencyMs),
          status: "error",
          total_cost: 0,
          total_latency_ms: latencyMs,
          error: {
            code: "INTERNAL_ERROR",
            message: getErrorMessage(error),
          },
        };

  return RunErrorResponseSchema.parse(response);
}

export function createMethodNotAllowedResponse(
  method: string,
  latencyMs: number,
): RunErrorResponse {
  return RunErrorResponseSchema.parse({
    agents: [],
    evaluation: createFailedEvaluation(latencyMs),
    status: "error",
    total_cost: 0,
    total_latency_ms: latencyMs,
    error: {
      code: "METHOD_NOT_ALLOWED",
      message: `${method} /api/run is not allowed. Use POST.`,
    },
  });
}

async function generateOpenAIAgentData(
  agentConfig: AgentConfig,
  input: NormalizedRunRequest,
  previousResults: readonly AgentOutput[],
  options: AgentRunnerOptions,
): Promise<{
  xai: Xai;
  result: AgentResult;
}> {
  const completionClient = options.completionClient ?? createDefaultCompletionClient();

  if (!completionClient) {
    if (options.allowOpenAIFallback === false) {
      throw new Error("OPENAI_API_KEY is required for OpenAI-backed agents.");
    }

    return generateOpenAIFallbackData(agentConfig, input, previousResults);
  }

  const completion = await completionClient.createChatCompletion({
    model: OPENAI_MODEL,
    temperature: 0.2,
    response_format: {
      type: "json_object",
    },
    messages: buildOpenAIMessages(agentConfig, input, previousResults),
  });

  if (!completion.content) {
    throw new Error(`${agentConfig.name} returned an empty OpenAI response.`);
  }

  const parsedPayload = OpenAIAgentPayloadSchema.parse(
    parseJsonObject(completion.content),
  );

  return {
    xai: parsedPayload.xai,
    result: {
      ...parsedPayload.result,
      openaiModel: OPENAI_MODEL,
      tokenCount: completion.totalTokens,
      costUsd: estimateCompletionCost(completion.totalTokens),
    },
  };
}

function generateOpenAIFallbackData(
  agentConfig: AgentConfig,
  input: NormalizedRunRequest,
  previousResults: readonly AgentOutput[],
): {
  xai: Xai;
  result: AgentResult;
} {
  if (agentConfig.id === "context-doctor") {
    return {
      xai: {
        decision: "Use local context fallback",
        reason:
          "No OpenAI client is available in this environment, so the runner produced a deterministic Context Doctor payload.",
        evidence: [
          `Repository URL: ${input.githubUrl}`,
          `Description length: ${input.description.length}`,
          `Screenshot provided: ${input.screenshot !== null}`,
        ],
        confidence: 0.68,
      },
      result: {
        diagnosis:
          "Context is sufficient for a first-pass inspection, with optional visual context missing if no screenshot was supplied.",
        missing_items:
          input.screenshot === null
            ? ["Screenshot for UI-grounded review"]
            : [],
        severity: input.screenshot === null ? "medium" : "low",
        openaiFallback: true,
      },
    };
  }

  return {
    xai: {
      decision: "Use local research fallback",
      reason:
        "No OpenAI client is available in this environment, so the runner produced deterministic research guidance.",
      evidence: [
        `Repository: ${extractRepositoryName(input.githubUrl)}`,
        `${previousResults.length} upstream agent outputs available`,
      ],
      confidence: 0.66,
    },
    result: {
      focus: "Demo readiness and integration risk",
      insights: [
        "Show all seven agents in a single response",
        "Keep error responses schema-valid",
        "Make XAI evidence visible in the UI",
      ],
      openaiFallback: true,
    },
  };
}

function buildOpenAIMessages(
  agentConfig: AgentConfig,
  input: NormalizedRunRequest,
  previousResults: readonly AgentOutput[],
): ChatMessage[] {
  return [
    {
      role: "system",
      content:
        "You are an AgentOS Inspector backend agent. Return only JSON with shape {\"xai\":{\"decision\":\"string\",\"reason\":\"string\",\"evidence\":[\"string\"],\"confidence\":0.0},\"result\":{}}. Confidence must be 0-1 and evidence must be concrete.",
    },
    {
      role: "user",
      content: JSON.stringify({
        agent: {
          id: agentConfig.id,
          name: agentConfig.name,
        },
        request: input,
        previousAgents: previousResults.map((agent) => ({
          id: agent.id,
          name: agent.name,
          status: agent.status,
          result: agent.result,
        })),
        instruction:
          agentConfig.id === "context-doctor"
            ? "Diagnose context completeness, missing inputs, severity, and confidence."
            : "Research demo-critical risks, positioning, and evidence-backed next actions.",
      }),
    },
  ];
}

function createDefaultCompletionClient(): ChatCompletionClient | null {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return new OpenAICompletionClient();
}

class OpenAICompletionClient implements ChatCompletionClient {
  private readonly client = new OpenAI();

  async createChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<ChatCompletionResult> {
    const completion = await this.client.chat.completions.create(request);

    return {
      content: completion.choices[0]?.message.content ?? null,
      totalTokens: completion.usage?.total_tokens ?? 0,
    };
  }
}

function createFailedEvaluation(latencyMs: number): EvaluationMetrics {
  return {
    accuracy: 0,
    reliability: 0,
    confidence: 0,
    totalCost: 0,
    latencyMs: Math.max(0, Math.round(latencyMs)),
    hallucinationRisk: "high",
  };
}

function computeHallucinationRisk(
  confidence: number,
  errorCount: number,
): EvaluationMetrics["hallucinationRisk"] {
  if (errorCount > 0 || confidence < 65) {
    return "high";
  }

  if (confidence < 82) {
    return "medium";
  }

  return "low";
}

function missingAgentPenalty(agents: readonly AgentOutput[]): number {
  return Math.max(0, AGENT_CONFIG.length - agents.length) * 8;
}

function sumAgentLatency(agents: readonly AgentOutput[]): number {
  return agents.reduce((total, agent) => total + agent.latencyMs, 0);
}

function sumAgentCosts(agents: readonly AgentOutput[]): number {
  return agents.reduce((total, agent) => {
    const value = agent.result.costUsd;

    return typeof value === "number" ? total + value : total;
  }, 0);
}

function estimateCompletionCost(totalTokens: number): number {
  return totalTokens <= 0 ? 0 : (totalTokens / 1000) * 0.01;
}

function roundCurrency(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function clampMetric(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseJsonObject(content: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    const firstBrace = content.indexOf("{");
    const lastBrace = content.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error("OpenAI response did not contain a JSON object.");
    }

    return JSON.parse(content.slice(firstBrace, lastBrace + 1));
  }
}

function extractRepositoryName(githubUrl: string): string {
  try {
    const url = new URL(githubUrl);
    const segments = url.pathname.split("/").filter(Boolean);

    return segments.length >= 2 ? `${segments[0]}/${segments[1]}` : githubUrl;
  } catch {
    return githubUrl;
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}
