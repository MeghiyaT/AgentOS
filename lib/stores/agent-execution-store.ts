import { create } from "zustand";

import { AGENT_NAMES } from "@/lib/types/agent-contracts";
import type { AgentName, AgentOutput, AgentStatus } from "@/lib/types/agent-contracts";

export interface AgentRunRequest {
  githubUrl: string;
  screenShotName: string | null;
  problemDescription: string;
}

export interface AgentExecutionState {
  activeAgent: AgentOutput | null;
  agentGraph: Record<string, AgentStatus>;
  agentOutputs: Partial<Record<AgentName, AgentOutput>>;
  lastRunRequest: AgentRunRequest | null;
  startRun: (request: AgentRunRequest) => void;
  selectAgent: (agentName: AgentName) => void;
  resetRun: () => void;
}

const idleGraph: Record<string, AgentStatus> = Object.fromEntries(
  AGENT_NAMES.map((agentName) => [agentName, "idle"])
) as Record<string, AgentStatus>;

function createTransitionSequence(request: AgentRunRequest) {
  const shouldSimulateError = request.problemDescription
    .toLowerCase()
    .includes("trigger error");
  const securityOutcome: AgentStatus = shouldSimulateError ? "error" : "complete";
  const evaluatorSteps: Array<{ agentName: AgentName; status: AgentStatus }> =
    shouldSimulateError
      ? []
      : [
          { agentName: "Evaluator", status: "running" },
          { agentName: "Evaluator", status: "complete" },
        ];

  return [
    { agentName: "Context Doctor", status: "complete" },
    { agentName: "Planner", status: "running" },
    { agentName: "Planner", status: "complete" },
    { agentName: "Research", status: "running" },
    { agentName: "Research", status: "complete" },
    { agentName: "Coding", status: "running" },
    { agentName: "Coding", status: "complete" },
    { agentName: "Testing", status: "running" },
    { agentName: "Testing", status: "complete" },
    { agentName: "Security", status: "running" },
    { agentName: "Security", status: securityOutcome },
    ...evaluatorSteps,
  ] satisfies Array<{ agentName: AgentName; status: AgentStatus }>;
}

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
  lastRunRequest: null,
  startRun: (request) => {
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
      lastRunRequest: request,
    });

    transitionTimers = createTransitionSequence(request).map((step, index) =>
      setTimeout(() => {
        const currentRequest = get().lastRunRequest;

        if (!currentRequest) {
          return;
        }

        const output = createAgentOutput(
          step.agentName,
          step.status,
          currentRequest
        );

        set((state) => ({
          agentGraph: {
            ...state.agentGraph,
            [step.agentName]: step.status,
          },
          agentOutputs: {
            ...state.agentOutputs,
            [step.agentName]: output,
          },
          activeAgent:
            state.activeAgent?.agentName === step.agentName ||
            step.status === "running"
              ? output
              : state.activeAgent,
        }));
      }, (index + 1) * 650)
    );
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
      lastRunRequest: null,
    });
  },
}));
