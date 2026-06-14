import { create } from "zustand";

import {
  AGENT_NAMES,
  agentRunResponseSchema,
} from "@/lib/types/agent-contracts";
import type {
  AgentName,
  AgentOutput,
  AgentRunResponse,
  AgentStatus,
  RunEvaluationMetrics,
  RunSecurityMetrics,
} from "@/lib/types/agent-contracts";

export interface AgentRunRequest {
  githubUrl: string;
  screenShotName: string | null;
  problemDescription: string;
}

export interface AgentExecutionState {
  activeAgent: AgentOutput | null;
  agentGraph: Record<string, AgentStatus>;
  agentOutputs: Partial<Record<AgentName, AgentOutput>>;
  evaluation: RunEvaluationMetrics | null;
  isRunning: boolean;
  lastRunRequest: AgentRunRequest | null;
  runError: string | null;
  security: RunSecurityMetrics | null;
  startRun: (request: AgentRunRequest) => Promise<void>;
  selectAgent: (agentName: AgentName) => void;
  resetRun: () => void;
}

const idleGraph: Record<string, AgentStatus> = Object.fromEntries(
  AGENT_NAMES.map((agentName) => [agentName, "idle"])
) as Record<string, AgentStatus>;

let transitionTimers: Array<ReturnType<typeof setTimeout>> = [];

function clearTransitionTimers() {
  transitionTimers.forEach((timer) => clearTimeout(timer));
  transitionTimers = [];
}

function createAgentOutput(
  agentName: AgentName,
  status: AgentStatus,
  request: AgentRunRequest
): AgentOutput {
  const hasRepo = request.githubUrl.trim().length > 0;
  const hasScreenshot = request.screenShotName !== null;
  const evidence = [
    hasRepo ? "Repository URL received" : "Repository URL missing",
    hasScreenshot ? "Screenshot attached" : "No screenshot attached",
    `${request.problemDescription.trim().length} problem characters captured`,
  ];

  const xaiByAgent: Record<
    AgentName,
    Pick<AgentOutput["xai"], "decision" | "reason" | "confidence">
  > = {
    "Context Doctor": {
      decision: "Normalize intake and identify missing context.",
      reason:
        "The first run validates repository, screenshot, and problem inputs before planning begins.",
      confidence: hasRepo && request.problemDescription.trim().length > 20 ? 0.82 : 0.58,
    },
    Planner: {
      decision: "Create an execution route across specialist agents.",
      reason:
        "The request has enough detail to decompose into research, coding, testing, security, and evaluation phases.",
      confidence: 0.78,
    },
    Research: {
      decision: "Gather implementation context before code changes.",
      reason:
        "The graph state depends on existing contracts, store shape, and current UI panel boundaries.",
      confidence: 0.74,
    },
    Coding: {
      decision: "Patch the workspace UI with a dedicated React Flow graph.",
      reason:
        "The center panel is already isolated, so a targeted component swap keeps the blast radius low.",
      confidence: 0.86,
    },
    Testing: {
      decision: "Verify state propagation with browser-driven interaction.",
      reason:
        "The gate requires proof that LeftPanel form submission changes CenterPanel and RightPanel state.",
      confidence: 0.88,
    },
    Security: {
      decision: "Keep uploaded screenshot data local to the browser state.",
      reason:
        "The current step only stores the file name, avoiding accidental binary or secret transfer.",
      confidence: 0.81,
    },
    Evaluator: {
      decision: "Mark the workflow ready when all visual state gates pass.",
      reason:
        "The evaluator can summarize graph completion, XAI visibility, and dashboard readiness for the demo.",
      confidence: 0.9,
    },
  };

  return {
    agentName,
    status,
    xai: {
      ...xaiByAgent[agentName],
      evidence,
    },
    result: {
      agentStage: agentName,
      status,
      clarifiedObjective: request.problemDescription.trim(),
    },
  };
}

function createIdleOutputs(request: AgentRunRequest) {
  return Object.fromEntries(
    AGENT_NAMES.map((agentName) => [
      agentName,
      createAgentOutput(agentName, "idle", request),
    ])
  ) as Record<AgentName, AgentOutput>;
}

export const useAgentExecutionStore = create<AgentExecutionState>((set, get) => ({
  activeAgent: null,
  agentGraph: { ...idleGraph },
  agentOutputs: {},
  evaluation: null,
  isRunning: false,
  lastRunRequest: null,
  runError: null,
  security: null,
  startRun: async (request) => {
    clearTransitionTimers();
    const agentOutputs = createIdleOutputs(request);
    const contextDoctorOutput = createAgentOutput(
      "Context Doctor",
      "running",
      request
    );

    set({
      activeAgent: contextDoctorOutput,
      agentGraph: {
        ...idleGraph,
        "Context Doctor": "running",
      },
      agentOutputs: {
        ...agentOutputs,
        "Context Doctor": contextDoctorOutput,
      },
      evaluation: null,
      isRunning: true,
      lastRunRequest: request,
      runError: null,
      security: null,
    });

    try {
      const runResponse = await requestAgentRun(request);
      scheduleRunPlayback(runResponse);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "AgentOS run failed.";
      const output = createErrorOutput(request, message);

      set((state) => ({
        activeAgent: output,
        agentGraph: {
          ...state.agentGraph,
          "Context Doctor": "error",
        },
        agentOutputs: {
          ...state.agentOutputs,
          "Context Doctor": output,
        },
        isRunning: false,
        runError: message,
      }));
    }
  },
  selectAgent: (agentName) => {
    const state = get();
    const request =
      state.lastRunRequest ??
      ({
        githubUrl: "",
        screenShotName: null,
        problemDescription: "No run request has been submitted yet.",
      } satisfies AgentRunRequest);
    const status = state.agentGraph[agentName] ?? "idle";
    const output =
      state.agentOutputs[agentName] ?? createAgentOutput(agentName, status, request);

    set({
      activeAgent: output,
      agentOutputs: {
        ...state.agentOutputs,
        [agentName]: output,
      },
    });
  },
  resetRun: () => {
    clearTransitionTimers();

    set({
      activeAgent: null,
      agentGraph: { ...idleGraph },
      agentOutputs: {},
      evaluation: null,
      isRunning: false,
      lastRunRequest: null,
      runError: null,
      security: null,
    });
  },
}));

async function requestAgentRun(
  request: AgentRunRequest,
): Promise<AgentRunResponse> {
  const response = await fetch("/api/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    const message =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : `AgentOS API failed with ${response.status}`;
    throw new Error(message);
  }

  return agentRunResponseSchema.parse(payload) as AgentRunResponse;
}

function scheduleRunPlayback(runResponse: AgentRunResponse) {
  const steps = runResponse.agents.flatMap((agent) => [
    {
      agentName: agent.agentName,
      status: "running" as const,
      output: {
        ...agent,
        status: "running" as const,
      },
    },
    {
      agentName: agent.agentName,
      status: agent.status,
      output: agent,
    },
  ]);

  transitionTimers = steps.map((step, index) =>
    setTimeout(() => {
      useAgentExecutionStore.setState((state) => ({
        activeAgent:
          state.activeAgent?.agentName === step.agentName ||
          step.status === "running"
            ? step.output
            : state.activeAgent,
        agentGraph: {
          ...state.agentGraph,
          [step.agentName]: step.status,
        },
        agentOutputs: {
          ...state.agentOutputs,
          [step.agentName]: step.output,
        },
        evaluation:
          index === steps.length - 1 ? runResponse.evaluation : state.evaluation,
        isRunning: index === steps.length - 1 ? false : state.isRunning,
        runError: runResponse.status === "error" ? "AgentOS run failed." : null,
        security:
          index === steps.length - 1 ? runResponse.security : state.security,
      }));
    }, (index + 1) * 280),
  );
}

function createErrorOutput(
  request: AgentRunRequest,
  message: string,
): AgentOutput {
  return {
    agentName: "Context Doctor",
    status: "error",
    xai: {
      decision: "Stop run after API failure",
      reason: message,
      evidence: [
        `Repository: ${request.githubUrl}`,
        `Problem length: ${request.problemDescription.length}`,
      ],
      confidence: 0.2,
    },
    result: {
      error: message,
    },
  };
}
