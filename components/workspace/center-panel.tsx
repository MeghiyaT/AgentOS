"use client";

import { motion } from "framer-motion";
import { Network } from "lucide-react";

import { AgentGraph } from "@/components/AgentGraph/AgentGraph";
import { useAgentExecutionStore } from "@/lib/stores/agent-execution-store";
import { AGENT_NAMES } from "@/lib/types/agent-contracts";

export function CenterPanel() {
  const agentGraph = useAgentExecutionStore((state) => state.agentGraph);
  const selectAgent = useAgentExecutionStore((state) => state.selectAgent);
  const activeCount = AGENT_NAMES.filter(
    (agentName) => agentGraph[agentName] === "running",
  ).length;
  const completeCount = AGENT_NAMES.filter(
    (agentName) => agentGraph[agentName] === "complete",
  ).length;

  return (
    <section
      aria-label="Agent graph"
      className="glass-panel flex min-h-[620px] flex-col rounded-3xl border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl lg:min-h-0"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-violet-200">
            Center Panel
          </p>
          <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold text-slate-50">
            <Network className="size-5 text-cyan-300" aria-hidden="true" />
            Agent orchestration graph
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <motion.span
            className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1.5 text-cyan-100"
            animate={{ opacity: activeCount > 0 ? [0.7, 1, 0.7] : 0.75 }}
            transition={{ duration: 1.6, repeat: activeCount > 0 ? Infinity : 0 }}
          >
            active {activeCount}
          </motion.span>
          <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-emerald-100">
            complete {completeCount}
          </span>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <AgentGraph agentGraph={agentGraph} onSelectAgent={selectAgent} />
      </div>
    </section>
  );
}
