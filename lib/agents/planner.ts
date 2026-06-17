import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

import {
  contextDoctorAgentOutputSchema,
} from "./context-doctor";
import { xaiSchema } from "../prompts/agent-prompts";

export const plannerInputSchema = z
  .object({
    description: z.string().min(1),
    contextDoctor: contextDoctorAgentOutputSchema,
  });

export const plannerAgentOutputSchema = z
  .object({
    tasks: z
      .array(
        z.object({
          name: z.string().min(1),
          duration: z.string().min(1),
          dependencies: z.array(z.string().min(1)),
        }),
      )
      .min(3),
    milestones: z
      .array(
        z.object({
          name: z.string().min(1),
          criteria: z.string().min(1),
        }),
      )
      .min(2),
    strategy: z.string().min(1),
    xai: xaiSchema,
  })
  .superRefine((output, context) => {
    const taskNames = new Set(output.tasks.map((task) => task.name));

    output.tasks.forEach((task, taskIndex) => {
      task.dependencies.forEach((dependency, dependencyIndex) => {
        if (!taskNames.has(dependency)) {
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Dependency "${dependency}" must match a task name.`,
            path: ["tasks", taskIndex, "dependencies", dependencyIndex],
          });
        }
      });
    });
  });

export type PlannerInput = z.infer<typeof plannerInputSchema>;
export type PlannerAgentOutput = z.infer<typeof plannerAgentOutputSchema>;

type PlannerOptions = {
  openai?: OpenAI;
  model?: string;
  allowMockFallback?: boolean;
};

const DEFAULT_MODEL = "gpt-4o";

const PLANNER_SYSTEM_PROMPT = [
  "You are Planner, the live intelligence agent responsible for orchestrating work in AgentOS.",
  "Create an execution plan from the user description and Context Doctor diagnosis.",
  "Tasks must be realistic, sequenced, and named so dependencies can reference exact task names.",
  "Dependencies MUST exactly match the `name` of an earlier task in the array. Never depend on a task name that isn't defined.",
  "Milestones must include crisp pass/fail criteria.",
  "Use the Context Doctor missing_items and severity as planning evidence.",
  "Always include top-level xai with decision, reason, evidence, and confidence (0-100).",
].join(" ");

const aiPlannerSchema = z.object({
  tasks: z
    .array(
      z.object({
        name: z.string().min(1),
        duration: z.string().min(1),
        dependencies: z.array(z.string().min(1)),
      }),
    )
    .min(3),
  milestones: z
    .array(
      z.object({
        name: z.string().min(1),
        criteria: z.string().min(1),
      }),
    )
    .min(2),
  strategy: z.string().min(1),
  xai: z.object({
    decision: z.string().min(1),
    reason: z.string().min(1),
    evidence: z.array(z.string().min(1)).min(1),
    confidence: z.number().min(0).max(100),
  }),
});

export async function runPlanner(
  rawInput: PlannerInput,
  options: PlannerOptions = {},
): Promise<PlannerAgentOutput> {
  const startTime = Date.now();
  const input = plannerInputSchema.parse(rawInput);

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
            aiPlannerSchema,
            "planner_execution_plan",
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

      // First parse the raw generated format
      const parsedRaw = aiPlannerSchema.parse(JSON.parse(content));
      
      // Attempt to satisfy the superRefine constraint. 
      // If the LLM hallucinated dependencies, the superRefine will throw, jumping to the catch block and triggering a retry.
      const strictParsed = plannerAgentOutputSchema.parse({
        tasks: parsedRaw.tasks,
        milestones: parsedRaw.milestones,
        strategy: parsedRaw.strategy,
        xai: {
          decision: parsedRaw.xai.decision,
          reason: parsedRaw.xai.reason,
          evidence: parsedRaw.xai.evidence,
          confidence: parsedRaw.xai.confidence / 100,
        }
      });

      const latencyMs = Date.now() - startTime;
      const tokens = completion.usage?.total_tokens ?? 0;

      // Inject telemetry
      return {
        ...strictParsed,
        xai: {
          ...strictParsed.xai,
          evidence: [
            ...strictParsed.xai.evidence,
            `[Telemetry] Latency: ${latencyMs}ms`,
            `[Telemetry] Tokens: ${tokens}`,
          ],
        },
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (attempts > MAX_RETRIES) {
        if (options.allowMockFallback !== false) {
          return buildGracefulFallback(input, getErrorMessage(error), Date.now() - startTime);
        }
        throw error;
      }
      // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
    }
  }

  return buildGracefulFallback(input, "Max retries exceeded", Date.now() - startTime);
}

function buildMessages(input: PlannerInput): ChatCompletionMessageParam[] {
  return [
    { role: "system", content: PLANNER_SYSTEM_PROMPT },
    {
      role: "user",
      content: [
        "User description:",
        input.description,
        "Context Doctor output:",
        JSON.stringify(input.contextDoctor, null, 2),
        "Generate the structured execution plan. Ensure every task dependency exactly matches a generated task name.",
      ].join("\n\n"),
    },
  ];
}

function createOpenAIClient(client?: OpenAI): OpenAI {
  if (client) {
    return client;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for live Planner runs.");
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
  input: PlannerInput,
  fallbackReason: string,
  latencyMs: number,
): PlannerAgentOutput {
  return plannerAgentOutputSchema.parse({
    tasks: [
      {
        name: "Analyze codebase",
        duration: "1h",
        dependencies: [],
      },
      {
        name: "Establish safety guardrails",
        duration: "30m",
        dependencies: ["Analyze codebase"],
      },
      {
        name: "Execute minimal intervention",
        duration: "1h",
        dependencies: ["Establish safety guardrails"],
      },
    ],
    milestones: [
      {
        name: "Analysis Complete",
        criteria: "Codebase fully understood and mapped.",
      },
      {
        name: "Safety Verified",
        criteria: "Guardrails active.",
      },
    ],
    strategy: "Graceful degraded planner execution due to API failure.",
    xai: {
      decision: "Triggered graceful degraded fallback for planning.",
      reason: `Planner agent failed after retries: ${fallbackReason}`,
      evidence: [
        `Fallback triggered due to timeout or parsing failure.`,
        `[Telemetry] Failed after ${latencyMs}ms`,
      ],
      confidence: 0.1,
    },
  });
}
