import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

import {
  codingOutputSchema,
  type AgentInputs,
  type CodingOutput as CodingAgentOutput,
} from "../prompts/agent-prompts";

const DEFAULT_MODEL = "gpt-4o";

type CodingOptions = {
  openai?: OpenAI;
  model?: string;
  allowMockFallback?: boolean;
};

// Internal schema used to shape the LLM response accurately
const aiCodingSchema = z.object({
  files_to_modify: z.array(
    z.object({
      path: z.string().min(1),
      change_type: z.enum(["create", "update", "delete"]),
      rationale: z.string().min(1),
      proposed_changes: z.array(z.string().min(1)).min(1),
    })
  ).min(1),
  implementation_notes: z.array(z.string().min(1)).min(1),
  rollback_plan: z.string().min(1),
  xai: z.object({
    decision: z.string().min(1),
    reason: z.string().min(1),
    evidence: z.array(z.string().min(1)).min(1),
    confidence: z.number().min(0).max(100),
  }),
});

const SYSTEM_PROMPT = `You are an elite, production-grade AI Coding Agent.
Your responsibilities are to analyze research outputs and repository contexts to generate safe, reliable, and well-reasoned code modifications.

Tasks:
1. Implementation Recommendations: Describe technical changes and architecture adjustments.
2. File Modifications: Identify exact files to modify. Specify whether it's a create, update, or delete.
3. Code-Change Plans: Detail the exact proposed changes for each file.
4. Refactoring Suggestions: Include any refactoring advice as implementation notes.
5. Rollback Strategy: Provide a clear string rollback plan in case the deployment fails.
6. XAI & Confidence: Always populate the XAI decision, reason, evidence, and confidence (0-100) fields. No placeholders.

You must output valid JSON strictly matching the provided schema. Ensure your changes are pragmatic and secure.`;

export async function runCoding(
  input: AgentInputs,
  options: CodingOptions = {},
): Promise<CodingAgentOutput> {
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
            aiCodingSchema,
            "coding_output",
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

      const parsed = aiCodingSchema.parse(JSON.parse(content));
      const latencyMs = Date.now() - startTime;
      const tokens = completion.usage?.total_tokens ?? 0;
      
      return codingOutputSchema.parse({
        filesToModify: parsed.files_to_modify.map((file) => ({
          path: file.path,
          changeType: file.change_type,
          rationale: file.rationale,
          proposedChanges: file.proposed_changes,
        })),
        implementationNotes: parsed.implementation_notes,
        rollbackPlan: parsed.rollback_plan,
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
      content: `Repository: ${input.githubUrl}\nTask Description: ${
        input.description || "No description provided."
      }\n      
Generate an optimal implementation plan. Generate structured JSON output only.`,
    },
  ];
}

function createOpenAIClient(client?: OpenAI): OpenAI {
  if (client) {
    return client;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for live Coding runs.");
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function buildGracefulFallback(
  input: AgentInputs,
  reason: string,
  latencyMs: number,
): CodingAgentOutput {
  // Graceful fallback to prevent pipeline crashes when LLM is unavailable
  return codingOutputSchema.parse({
    filesToModify: [
      {
        path: "unknown/path.ts",
        changeType: "update",
        rationale: "Graceful fallback generated to prevent pipeline collapse.",
        proposedChanges: ["Review logs for LLM failure."],
      }
    ],
    implementationNotes: [
      "The Coding Agent failed to generate an implementation plan due to an underlying LLM issue.",
      "Falling back to a safe degraded state."
    ],
    rollbackPlan: "Revert any manual changes. Check OpenAI API status and key configurations.",
    xai: {
      decision: "Triggered graceful degraded fallback.",
      reason: `Coding Agent failed after retries: ${reason}`,
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
