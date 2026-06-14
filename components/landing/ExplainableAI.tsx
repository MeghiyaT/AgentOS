"use client";

import { motion } from "framer-motion";
import { BrainCircuit, FileSearch, Gauge, MessageSquareText } from "lucide-react";

import { GlassPanel } from "@/components/effects/GlassPanel";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

const reasoningSteps = [
  {
    label: "Decision",
    value: "Proceed with scoped remediation",
    icon: BrainCircuit,
    tone: "text-violet-200",
  },
  {
    label: "Evidence",
    value: "3 files, 2 APIs, 1 screenshot signal",
    icon: FileSearch,
    tone: "text-cyan-200",
  },
  {
    label: "Reason",
    value: "The graph isolated a safe implementation boundary.",
    icon: MessageSquareText,
    tone: "text-emerald-200",
  },
  {
    label: "Confidence",
    value: "91%",
    icon: Gauge,
    tone: "text-amber-200",
  },
] as const;

export function ExplainableAI() {
  return (
    <section className="relative z-10 px-5 py-24 sm:px-8 lg:px-12">
      <RevealOnScroll className="mx-auto max-w-7xl">
        <GlassPanel className="grid gap-8 p-6 lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">
              Explainable AI
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-50 md:text-6xl">
              Reasoning appears like a story, not a JSON dump.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400">
              AgentOS reveals decision, evidence, reason, and confidence in a
              progressive chain so the operator can follow the why before the
              final score.
            </p>
          </div>

          <div className="relative space-y-4">
            <div className="absolute left-7 top-10 h-[calc(100%-5rem)] w-px bg-gradient-to-b from-violet-300 via-cyan-300 to-emerald-300 opacity-30" />
            {reasoningSteps.map((step, index) => {
              const Icon = step.icon;

              return (
                <motion.article
                  key={step.label}
                  initial={{ opacity: 0, x: 36, filter: "blur(10px)" }}
                  whileInView={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{
                    delay: index * 0.16,
                    duration: 0.62,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="relative rounded-3xl border border-white/10 bg-slate-950/50 p-5 shadow-xl shadow-black/20"
                >
                  <div className="flex items-start gap-4">
                    <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                      <Icon className={`size-6 ${step.tone}`} aria-hidden="true" />
                    </span>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                        {step.label}
                      </p>
                      <p className="mt-2 text-lg font-semibold text-slate-50">
                        {step.value}
                      </p>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </GlassPanel>
      </RevealOnScroll>
    </section>
  );
}
