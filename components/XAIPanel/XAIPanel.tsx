"use client";

import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, FileSearch, Gauge, MessageSquareText } from "lucide-react";

import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import type { AgentOutput } from "@/lib/types/agent-contracts";

interface XAIPanelProps {
  activeAgent: AgentOutput | null;
}

export function XAIPanel({ activeAgent }: XAIPanelProps) {
  const confidencePercent = Math.round((activeAgent?.xai.confidence ?? 0) * 100);
  const evidenceItems = activeAgent?.xai.evidence ?? [];

  return (
    <section
      aria-label="XAI panel"
      className="glass-panel flex min-h-[620px] flex-col rounded-3xl border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
          Right Panel
        </p>
        <h2 className="mt-2 flex items-center gap-2 text-xl font-semibold text-slate-50">
          <BrainCircuit className="size-5 text-cyan-300" aria-hidden="true" />
          Explainability stream
        </h2>
      </div>

      <div className="mt-5 grid flex-1 grid-rows-[86px_112px_142px_minmax(150px,1fr)_66px] gap-4">
        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
          <p className="text-xs uppercase text-slate-500">active agent</p>
          <p className="mt-1 truncate text-base font-semibold text-slate-50">
            {activeAgent?.agentName ?? "Select an agent"}
          </p>
          <p className="mt-1 text-xs text-sky-200">
            {activeAgent?.status ?? "idle"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeAgent?.agentName ?? "empty"}-decision`}
            className="overflow-hidden rounded-2xl border border-violet-300/15 bg-violet-300/10 p-3"
            initial={{ opacity: 0, x: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="flex items-center gap-2 text-xs uppercase text-violet-200">
              <Gauge className="size-3.5" aria-hidden="true" />
              decision
            </p>
            <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-slate-100">
              {activeAgent?.xai.decision ??
                "Click any AgentNode to inspect its explainability record."}
            </p>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeAgent?.agentName ?? "empty"}-reason`}
            className="overflow-hidden rounded-2xl border border-cyan-300/15 bg-cyan-300/10 p-3"
            initial={{ opacity: 0, x: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -12 }}
            transition={{ delay: 0.08, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="flex items-center gap-2 text-xs uppercase text-cyan-200">
              <MessageSquareText className="size-3.5" aria-hidden="true" />
              reason
            </p>
            <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-300">
              {activeAgent?.xai.reason ??
                "The selected agent's rationale will appear here without resizing the panel."}
            </p>
          </motion.div>
        </AnimatePresence>

        <div className="min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-slate-950/55 p-3">
          <p className="text-xs uppercase text-slate-500">evidence</p>
          <div className="mt-2 max-h-full space-y-2 overflow-auto pr-1">
            {evidenceItems.length > 0 ? (
              evidenceItems.map((item, index) => (
                <motion.p
                  key={item}
                  className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs leading-5 text-slate-300"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    delay: 0.16 + index * 0.08,
                    duration: 0.35,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <FileSearch
                    className="mt-0.5 size-3.5 shrink-0 text-cyan-300/70"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </motion.p>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 bg-slate-950/70 px-3 py-2 text-xs leading-5 text-slate-500">
                Evidence entries will render as stable file/API finding rows.
              </p>
            )}
          </div>
        </div>

        <Progress
          value={confidencePercent}
          aria-label="XAI confidence"
          className="[&_[data-slot=progress-indicator]]:bg-cyan-300 [&_[data-slot=progress-track]]:bg-slate-800"
        >
          <ProgressLabel className="text-xs text-slate-500">
            confidence
          </ProgressLabel>
          <ProgressValue className="text-xs text-slate-400" />
        </Progress>
      </div>
    </section>
  );
}
