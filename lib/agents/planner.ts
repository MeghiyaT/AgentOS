import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

import {
  contextDoctorAgentOutputSchema,
  type ContextDoctorAgentOutput,
} from "./context-doctor";
import { xaiSchema } from "../prompts/agent-prompts";

export const plannerInputSchema = z
  .object({
    description: z.string().min(1),
    contextDoctor: contextDoctorAgentOutputSchema,
  })
  .strict();

export const plannerAgentOutputSchema = z
  .object({
    tasks: z
      .array(
        z
          .object({
            name: z.string().min(1),
            duration: z.string().min(1),
            dependencies: z.array(z.string().min(1)),
          })
          .strict(),
      )
      .min(3),
    milestones: z
      .array(
        z
          .object({
            name: z.string().min(1),
            criteria: z.string().min(1),
          })
          .strict(),
      )
      .min(2),
    strategy: z.string().min(1),
    xai: xaiSchema,
  })
  .strict()
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
  "You are Planner, the second live intelligence agent in AgentOS Inspector.",
  "Create an execution plan from the user description and Context Doctor diagnosis.",
  "Optimize for a 5-hour hackathon demo with three teams: Frontend Lead, AI Systems Lead, and Backend Lead.",
  "Tasks must be realistic, sequenced, and named so dependencies can reference exact task names.",
  "Milestones must include crisp pass/fail criteria.",
  "Use the Context Doctor missing_items and severity as planning evidence.",
  "Return only JSON that matches the provided schema.",
  "Always include top-level xai with decision, reason, evidence, and confidence.",
].join(" ");

export async function runPlanner(
  rawInput: PlannerInput,
  options: PlannerOptions = {},
): Promise<PlannerAgentOutput> {
  const input = plannerInputSchema.parse(rawInput);

  try {
    const client = createOpenAIClient(options.openai);
    const output = await requestPlannerExecutionPlan(client, input, {
      model: options.model ?? DEFAULT_MODEL,
    });

    return plannerAgentOutputSchema.parse(output);
  } catch (error) {
    if (options.allowMockFallback !== true) {
      throw error;
    }

    return buildMockPlannerOutput(input, getErrorMessage(error));
  }
}

async function requestPlannerExecutionPlan(
  client: OpenAI,
  input: PlannerInput,
  options: { model: string },
): Promise<PlannerAgentOutput> {
  const completion = await client.chat.completions.create({
    model: options.model,
    messages: buildMessages(input),
    response_format: zodResponseFormat(
      plannerAgentOutputSchema,
      "planner_execution_plan",
    ),
    temperature: 0.2,
  });

  const content = completion.choices[0]?.message.content;

  if (!content) {
    throw new Error("OpenAI response did not include message content.");
  }

  const parsed: unknown = JSON.parse(content);
  return plannerAgentOutputSchema.parse(parsed);
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
        "Generate the execution plan. Keep task durations short enough for the 5-hour build window.",
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

function buildMockPlannerOutput(
  input: PlannerInput,
  fallbackReason: string,
): PlannerAgentOutput {
  const missingContextTask =
    input.contextDoctor.missing_items.length > 0
      ? "Resolve critical context gaps"
      : "Confirm available context";

  return plannerAgentOutputSchema.parse({
    tasks: [
      {
        name: missingContextTask,
        duration: "30 minutes",
        dependencies: [],
      },
      {
        name: "Define integration contract",
        duration: "45 minutes",
        dependencies: [missingContextTask],
      },
      {
        name: "Implement agent orchestration path",
        duration: "90 minutes",
        dependencies: ["Define integration contract"],
      },
      {
        name: "Run demo validation",
        duration: "45 minutes",
        dependencies: ["Implement agent orchestration path"],
      },
    ],
    milestones: [
      {
        name: "Plan accepted",
        criteria: "All owners understand scope, dependencies, and demo-critical exclusions.",
      },
      {
        name: "Demo path validated",
        criteria: "Context Doctor and Planner return structured outputs with populated XAI.",
      },
    ],
    strategy:
      "Front-load missing context and contracts, then build the narrowest end-to-end path that proves the two live agents before adding polish.",
    xai: {
      decision: "Used deterministic Planner fallback.",
      reason: fallbackReason,
      evidence: [
        `Context Doctor severity: ${input.contextDoctor.severity}`,
        `Missing context items: ${input.contextDoctor.missing_items.length}`,
        `Description length: ${input.description.length}`,
      ],
      confidence: 0.58,
    },
  });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

export function isPlannerOutputRealistic(output: PlannerAgentOutput): boolean {
  const totalTasks = output.tasks.length;
  const totalMilestones = output.milestones.length;
  const hasConcreteDurations = output.tasks.every((task) =>
    /\b\d+\s*(minute|minutes|hour|hours|hr|hrs)\b/iu.test(task.duration),
  );
  const hasUsableMilestones = output.milestones.every(
    (milestone) => milestone.criteria.length >= 12,
  );
  const hasStrategy = output.strategy.length >= 30;
  const criticalPathMinutes = calculateCriticalPathMinutes(output.tasks);

  return (
    totalTasks >= 3 &&
    totalTasks <= 12 &&
    totalMilestones >= 2 &&
    hasConcreteDurations &&
    criticalPathMinutes > 0 &&
    criticalPathMinutes <= 300 &&
    hasUsableMilestones &&
    hasStrategy
  );
}

function calculateCriticalPathMinutes(
  tasks: PlannerAgentOutput["tasks"],
): number {
  const durationByName = new Map(
    tasks.map((task) => [task.name, parseDurationMinutes(task.duration)]),
  );
  const memo = new Map<string, number>();

  const visit = (taskName: string, seen: Set<string>): number => {
    if (seen.has(taskName)) {
      return Number.POSITIVE_INFINITY;
    }

    const cached = memo.get(taskName);

    if (cached !== undefined) {
      return cached;
    }

    const task = tasks.find((candidate) => candidate.name === taskName);

    if (!task) {
      return Number.POSITIVE_INFINITY;
    }

    const ownDuration = durationByName.get(taskName) ?? 0;
    const dependencyDuration = Math.max(
      0,
      ...task.dependencies.map((dependency) =>
        visit(dependency, new Set([...seen, taskName])),
      ),
    );
    const totalDuration = ownDuration + dependencyDuration;
    memo.set(taskName, totalDuration);

    return totalDuration;
  };

  return Math.max(0, ...tasks.map((task) => visit(task.name, new Set())));
}

function parseDurationMinutes(duration: string): number {
  const match = duration.match(/\b(\d+)\s*(minute|minutes|hour|hours|hr|hrs)\b/iu);

  if (!match) {
    return 0;
  }

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();

  if (unit.startsWith("hour") || unit.startsWith("hr")) {
    return amount * 60;
  }

  return amount;
}
