"use client";

import { Gauge, Timer, WalletCards } from "lucide-react";

import { useAgentExecutionStore } from "@/lib/stores/agent-execution-store";
import { AGENT_NAMES } from "@/lib/types/agent-contracts";
import type { AgentName } from "@/lib/types/agent-contracts";

const liveAgents = new Set<AgentName>(["Context Doctor", "Planner"]);

function formatCurrency(value: number) {
  return `$${value.toFixed(4)}`;
}

export function AICostTracker() {
  const evaluation = useAgentExecutionStore((state) => state.evaluation);
  const agentOutputs = useAgentExecutionStore((state) => state.agentOutputs);
  const totalCost = evaluation?.totalCostUsd ?? 0;
  const totalLatency = evaluation?.totalLatencySeconds ?? 0;
  const billableLiveAgents = AGENT_NAMES.filter((agentName) => {
    const output = agentOutputs[agentName];

    return liveAgents.has(agentName) && output && !isFallbackOutput(output.xai);
  });
  const liveAgentCost =
    billableLiveAgents.length > 0 ? totalCost / billableLiveAgents.length : 0;

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
        <WalletCards className="size-4" aria-hidden="true" />
        AI cost tracker
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-cyan-300/15 bg-cyan-300/10 p-3">
          <p className="flex items-center gap-2 text-xs uppercase text-cyan-100">
            <Gauge className="size-3.5" aria-hidden="true" />
            Total cost
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-50">
            {formatCurrency(totalCost)}
          </p>
        </div>
        <div className="rounded-2xl border border-violet-300/15 bg-violet-300/10 p-3">
          <p className="flex items-center gap-2 text-xs uppercase text-violet-100">
            <Timer className="size-3.5" aria-hidden="true" />
            Latency
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-50">
            {totalLatency.toFixed(2)}s
          </p>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        {AGENT_NAMES.map((agentName) => {
          const output = agentOutputs[agentName];
          const isLiveAgent = liveAgents.has(agentName);
          const isFallback = output ? isFallbackOutput(output.xai) : false;
          const cost = isLiveAgent && !isFallback ? liveAgentCost : 0;
          const label = isLiveAgent
            ? output
              ? isFallback
                ? "fallback"
                : "live OpenAI"
              : "pending"
            : "mock";

          return (
            <div
              key={agentName}
              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs"
            >
              <span className="text-slate-300">{agentName}</span>
              <span className="text-slate-500">{label}</span>
              <span className="font-mono text-slate-200">
                {formatCurrency(cost)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function isFallbackOutput(xai: { decision: string; reason: string }) {
  return /fallback|OPENAI_API_KEY is required/iu.test(
    `${xai.decision} ${xai.reason}`,
  );
}
