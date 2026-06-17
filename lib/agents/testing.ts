import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

import {
  testingOutputSchema,
  type AgentInputs,
  type TestingOutput as TestingAgentOutput,
} from "../prompts/agent-prompts";

const DEFAULT_MODEL = "gpt-4o";

type TestingOptions = {
  openai?: OpenAI;
  model?: string;
  allowMockFallback?: boolean;
};

// Internal schema used to shape the LLM response accurately
const aiTestingSchema = z.object({
  test_cases: z.array(
    z.object({
      name: z.string().min(1),
      type: z.enum(["unit", "integration", "e2e", "security", "manual"]),
      target: z.string().min(1),
      steps: z.array(z.string().min(1)).min(1),
      expected_result: z.string().min(1),
    })
  ).min(1),
  edge_cases: z.array(z.string().min(1)),
  automation_priority: z.array(z.string().min(1)),
  xai: z.object({
    decision: z.string().min(1),
    reason: z.string().min(1),
    evidence: z.array(z.string().min(1)).min(1),
    confidence: z.number().min(0).max(100),
  }),
});

const SYSTEM_PROMPT = `You are an elite, production-grade AI Testing and QA Agent.
Your responsibilities are to design comprehensive test suites, validate execution flows, and identify edge cases for code changes.

Tasks:
1. Test Case Generation: Define clear unit, integration, and e2e test cases. Specify execution steps and expected outcomes.
2. Edge Cases: Identify unusual states, boundaries, and failure scenarios.
3. Automation Priority: List tests that should be automated first.
4. Validation Strategy: Formulate a strategy based on the repository context.
5. XAI & Confidence: Always populate the XAI decision, reason, evidence, and confidence (0-100) fields. No placeholders.

You must output valid JSON strictly matching the provided schema.`;

export async function runTesting(
  input: AgentInputs,
  options: TestingOptions = {},
): Promise<TestingAgentOutput> {
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
            aiTestingSchema,
            "testing_output",
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

      const parsed = aiTestingSchema.parse(JSON.parse(content));
      const latencyMs = Date.now() - startTime;
      const tokens = completion.usage?.total_tokens ?? 0;
      
      return testingOutputSchema.parse({
        testCases: parsed.test_cases.map((tc) => ({
          name: tc.name,
          type: tc.type,
          target: tc.target,
          steps: tc.steps,
          expectedResult: tc.expected_result,
        })),
        edgeCases: parsed.edge_cases,
        automationPriority: parsed.automation_priority,
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
Generate an optimal testing strategy. Generate structured JSON output only.`,
    },
  ];
}

function createOpenAIClient(client?: OpenAI): OpenAI {
  if (client) {
    return client;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for live Testing runs.");
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function buildGracefulFallback(
  input: AgentInputs,
  reason: string,
  latencyMs: number,
): TestingAgentOutput {
  // Graceful fallback to prevent pipeline crashes when LLM is unavailable
  return testingOutputSchema.parse({
    testCases: [
      {
        name: "Pipeline Failure Graceful Degrade",
        type: "manual",
        target: "Agent System",
        steps: ["Review OpenAI logs", "Verify API key", "Restart orchestrator pipeline"],
        expectedResult: "LLM operations resume successfully",
      }
    ],
    edgeCases: [
      "AI failure limits automated test generation",
      "Missing test coverage due to pipeline collapse"
    ],
    automationPriority: ["Restore AI functionality"],
    xai: {
      decision: "Triggered graceful degraded fallback.",
      reason: `Testing Agent failed after retries: ${reason}`,
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
