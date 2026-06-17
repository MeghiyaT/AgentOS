"use client";

import { SignalHigh } from "lucide-react";

import { useAgentExecutionStore } from "@/lib/stores/agent-execution-store";
import { AGENT_NAMES } from "@/lib/types/agent-contracts";

export function AgentConfidenceVisualization() {
  const agentOutputs = useAgentExecutionStore((state) => state.agentOutputs);

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-violet-200">
        <SignalHigh className="size-4" aria-hidden="true" />
        Agent confidence
      </p>
      <div className="mt-4 space-y-3">
        {AGENT_NAMES.map((agentName) => {
          const confidence = agentOutputs[agentName]?.xai.confidence ?? 0;
          const percent = Math.round(confidence * 100);

          return (
            <div key={agentName}>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-300">{agentName}</span>
                <span className="font-mono text-slate-400">{percent}%</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-[linear-gradient(90deg,#7C3AED,#06B6D4,#34D399)] transition-[width] duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
