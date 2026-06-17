import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

import {
  researchOutputSchema,
  type AgentInputs,
  type ResearchOutput as ResearchAgentOutput,
} from "../prompts/agent-prompts";

const DEFAULT_MODEL = "gpt-4o";

type ResearchOptions = {
  openai?: OpenAI;
  model?: string;
  allowMockFallback?: boolean;
};

// Internal schema used to shape the LLM response accurately
const aiResearchSchema = z.object({
  hypothesis: z.string().min(1),
  likelihood: z.number().min(0).max(100),
  relevant_files: z.array(z.string().min(1)),
  evidence: z.array(z.string().min(1)).min(1),
  unknowns: z.array(z.string().min(1)),
  investigation_target: z.string().min(1),
  confidence: z.number().min(0).max(100),
  xai: z.object({
    decision: z.string().min(1),
    reason: z.string().min(1),
    evidence: z.array(z.string().min(1)).min(1),
    confidence: z.number().min(0).max(100),
  }),
});

const SYSTEM_PROMPT = `You are an elite, production-grade AI Research Agent.
Your responsibilities are to deeply analyze the repository context and identify the exact root causes of problems.

Tasks:
1. Repository Analysis: Determine architecture and likely file relationships.
2. Root Cause Investigation: Formulate a primary hypothesis with a likelihood score (0-100).
3. Relevant File Identification: List the exact paths to the most suspicious files.
4. Evidence Generation: Produce a clear reasoning chain and factual evidence.
5. Unknowns: List open questions or required investigations.
6. Confidence: Generate a confidence score (0-100).
7. XAI: Always populate the XAI decision, reason, evidence, and confidence (0-100) fields. No placeholders.

You must output valid JSON strictly matching the provided schema. If there is uncertainty, reflect it in the confidence score and the unknowns array.`;

export async function runResearch(
  input: AgentInputs,
  options: ResearchOptions = {},
): Promise<ResearchAgentOutput> {
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
            aiResearchSchema,
            "research_output",
          ),
          temperature: 0.2,
        },
        { signal: controller.signal },
      );

      clearTimeout(timeoutId);

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI response did not include message content.");
      }

      const parsed = aiResearchSchema.parse(JSON.parse(content));
      const latencyMs = Date.now() - startTime;
      const tokens = completion.usage?.total_tokens ?? 0;
      
      return researchOutputSchema.parse({
        rootCauseHypotheses: [
          {
            hypothesis: parsed.hypothesis,
            likelihood: parsed.likelihood / 100, // Normalize to 0-1
            relevantFiles: parsed.relevant_files,
            evidence: parsed.evidence,
            validationStep: parsed.investigation_target,
          },
        ],
        mostRelevantFiles: parsed.relevant_files,
        unknowns: parsed.unknowns,
        xai: {
          decision: parsed.xai.decision,
          reason: parsed.xai.reason,
          evidence: [
            ...parsed.xai.evidence,
            `[Telemetry] Latency: ${latencyMs}ms`,
            `[Telemetry] Tokens: ${tokens}`,
          ],
          confidence: parsed.xai.confidence / 100, // Normalize to 0-1
        },
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (attempts > MAX_RETRIES) {
        if (options.allowMockFallback) {
          return buildGracefulFallback(input, getErrorMessage(error), Date.now() - startTime);
        }
        throw error;
      }
      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
    }
  }

  // Fallback if loop ends unexpectedly
  return buildGracefulFallback(input, "Max retries exceeded", Date.now() - startTime);
}

function buildMessages(input: AgentInputs): ChatCompletionMessageParam[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Repository: ${input.githubUrl}\nDescription: ${
        input.description || "No description provided."
      }\n      
Perform your deep research analysis. Generate structured JSON output only.`,
    },
  ];
}

function createOpenAIClient(client?: OpenAI): OpenAI {
  if (client) {
    return client;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for live Research runs.");
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function buildGracefulFallback(
  input: AgentInputs,
  reason: string,
  latencyMs: number,
): ResearchAgentOutput {
  // Graceful fallback to prevent pipeline crashes when LLM is unavailable
  return researchOutputSchema.parse({
    rootCauseHypotheses: [
      {
        hypothesis: "Unable to complete deep analysis due to AI engine failure.",
        likelihood: 0.1,
        relevantFiles: [],
        evidence: ["LLM generation failed"],
        validationStep: "Review system logs to diagnose LLM failure.",
      },
    ],
    mostRelevantFiles: [],
    unknowns: ["Actual root cause (analysis failed)", "Affected files"],
    xai: {
      decision: "Triggered graceful degraded fallback.",
      reason: `Research Agent failed after retries: ${reason}`,
      evidence: [
        `Target Repository: ${input.githubUrl}`,
        `[Telemetry] Failed after ${latencyMs}ms`,
      ],
      confidence: 0.1,
    },
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "AbortError") return "API request timed out";
    return error.message;
  }
  return "Unknown error";
}
