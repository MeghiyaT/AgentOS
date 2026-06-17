import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

import {
  agentPrompts,
  evaluatorOutputSchema,
  type AgentInputs,
  type EvaluatorOutput as EvaluatorAgentOutput,
} from "../prompts/agent-prompts";

const promptDef = agentPrompts.find((p) => p.name === "Evaluator")!;
const DEFAULT_MODEL = "gpt-4o";

type EvaluatorOptions = {
  openai?: OpenAI;
  model?: string;
  allowMockFallback?: boolean;
};

const aiEvaluatorSchema = z.object({
  verdict: z.enum(["ready", "needs_revision", "blocked"]),
  accuracy: z.number().min(0).max(100),
  reliability: z.number().min(0).max(100),
  hallucinationRisk: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  checks: z
    .array(
      z.object({
        name: z.string().min(1),
        status: z.enum(["pass", "warn", "fail"]),
        note: z.string().min(1),
      }),
    )
    .min(1),
  xai: z.object({
    decision: z.string().min(1),
    reason: z.string().min(1),
    evidence: z.array(z.string().min(1)).min(1),
    confidence: z.number().min(0).max(100),
  }),
});

export async function runEvaluator(
  input: AgentInputs,
  options: EvaluatorOptions = {},
): Promise<EvaluatorAgentOutput> {
  const startTime = Date.now();
  let attempts = 0;
  const MAX_RETRIES = 2;
  const TIMEOUT_MS = 30000;

  while (attempts <= MAX_RETRIES) {
    attempts++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const client = createOpenAIClient(options.openai);
      const completion = await client.chat.completions.create(
        {
          model: options.model ?? DEFAULT_MODEL,
          messages: buildMessages(input),
          response_format: zodResponseFormat(
            aiEvaluatorSchema,
            "evaluator_output",
          ),
          temperature: 0.2,
        },
        { signal: controller.signal },
      );

      clearTimeout(timeoutId);

      const content = completion.choices[0]?.message.content;
      if (!content) {
        throw new Error("OpenAI response did not include message content.");
      }

      const parsedRaw = aiEvaluatorSchema.parse(JSON.parse(content));
      const latencyMs = Date.now() - startTime;
      const tokens = completion.usage?.total_tokens ?? 0;

      return evaluatorOutputSchema.parse({
        verdict: parsedRaw.verdict,
        accuracy: parsedRaw.accuracy / 100,
        reliability: parsedRaw.reliability / 100,
        hallucinationRisk: parsedRaw.hallucinationRisk / 100,
        confidence: parsedRaw.confidence / 100,
        checks: parsedRaw.checks,
        xai: {
          decision: parsedRaw.xai.decision,
          reason: parsedRaw.xai.reason,
          evidence: [
            ...parsedRaw.xai.evidence,
            `[Telemetry] Latency: ${latencyMs}ms`,
            `[Telemetry] Tokens: ${tokens}`,
          ],
          confidence: parsedRaw.xai.confidence / 100,
        },
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (attempts > MAX_RETRIES) {
        if (options.allowMockFallback !== false) {
          return buildGracefulFallback(input, getErrorMessage(error), Date.now() - startTime);
        }
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
    }
  }

  return buildGracefulFallback(input, "Max retries exceeded", Date.now() - startTime);
}

function buildMessages(input: AgentInputs): ChatCompletionMessageParam[] {
  return [
    { role: "system", content: promptDef.systemPrompt },
    { role: "user", content: promptDef.userTemplate(input) },
  ];
}

function createOpenAIClient(client?: OpenAI): OpenAI {
  if (client) {
    return client;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for live Evaluator runs.");
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "AbortError") return "API request timed out";
    return error.message;
  }
  return "Unknown error";
}

function buildGracefulFallback(
  input: AgentInputs,
  fallbackReason: string,
  latencyMs: number,
): EvaluatorAgentOutput {
  return evaluatorOutputSchema.parse({
    verdict: "needs_revision",
    accuracy: 0.1,
    reliability: 0.1,
    hallucinationRisk: 0.9,
    confidence: 0.1,
    checks: [
      {
        name: "Pipeline Verification",
        status: "fail",
        note: "Evaluation system unreachable or degraded.",
      },
      {
        name: "Security Review",
        status: "warn",
        note: "Could not evaluate security agent payload.",
      },
    ],
    xai: {
      decision: "Triggered graceful degraded fallback for evaluation.",
      reason: `Evaluator agent failed after retries: ${fallbackReason}`,
      evidence: [
        `Description length: ${input.description?.length ?? 0}`,
        `[Telemetry] Failed after ${latencyMs}ms`,
      ],
      confidence: 0.1,
    },
  });
}
