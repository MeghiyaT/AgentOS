"use client";

import { Activity, CircuitBoard, Gauge } from "lucide-react";

import { AuroraBackground } from "@/components/effects/AuroraBackground";
import { GradientMesh } from "@/components/effects/GradientMesh";
import { BottomPanel } from "@/components/workspace/bottom-panel";
import { CenterPanel } from "@/components/workspace/center-panel";
import { LeftPanel } from "@/components/workspace/left-panel";
import { XAIPanel } from "@/components/XAIPanel/XAIPanel";
import { useAgentExecutionStore } from "@/lib/stores/agent-execution-store";
import { AGENT_NAMES } from "@/lib/types/agent-contracts";

export function WorkspacePageShell() {
  const activeAgent = useAgentExecutionStore((state) => state.activeAgent);
  const agentGraph = useAgentExecutionStore((state) => state.agentGraph);
  const runningCount = AGENT_NAMES.filter(
    (agentName) => agentGraph[agentName] === "running",
  ).length;
  const completedCount = AGENT_NAMES.filter(
    (agentName) => agentGraph[agentName] === "complete",
  ).length;

  return (
    <main className="agentos-page relative min-h-screen overflow-hidden p-4 text-slate-100">
      <GradientMesh className="fixed inset-0 opacity-65" />
      <AuroraBackground className="fixed inset-0" />
      <div className="agentos-grid pointer-events-none fixed inset-0 opacity-30" />
      <div className="agentos-noise" />

      <div className="relative z-10 mx-auto flex max-w-[1800px] flex-col gap-4">
        <header className="glass-panel flex flex-col justify-between gap-4 rounded-3xl border border-white/10 bg-white/[0.055] px-5 py-4 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:flex-row lg:items-center">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200">
              <CircuitBoard className="size-4" aria-hidden="true" />
              AgentOS Workspace
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-slate-50 md:text-3xl">
              Control Center for Autonomous AI Agents
            </h1>
          </div>
          <div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-3">
            <span className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-3 py-2">
              <Activity className="mr-2 inline size-3.5 text-cyan-200" aria-hidden="true" />
              Running {runningCount}
            </span>
            <span className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-3 py-2">
              <Gauge className="mr-2 inline size-3.5 text-emerald-200" aria-hidden="true" />
              Complete {completedCount}/7
            </span>
            <span className="rounded-2xl border border-violet-300/20 bg-violet-300/10 px-3 py-2">
              Active {activeAgent?.agentName ?? "None"}
            </span>
          </div>
        </header>

        <div className="grid gap-4 xl:min-h-[calc(100vh-8.5rem)] xl:grid-cols-[340px_minmax(560px,1fr)_380px] xl:grid-rows-[minmax(0,1fr)_auto]">
          <LeftPanel />
          <CenterPanel />
          <XAIPanel activeAgent={activeAgent} />
          <div className="xl:col-span-3">
            <BottomPanel />
          </div>
        </div>
      </div>
    </main>
  );
}
