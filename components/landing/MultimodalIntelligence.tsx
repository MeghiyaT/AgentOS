"use client";

import { motion } from "framer-motion";
import { FileText, GitBranch, Image, Mic2, Network } from "lucide-react";

import { GlassPanel } from "@/components/effects/GlassPanel";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { TiltCard } from "@/components/motion/TiltCard";

const inputs = [
  { label: "GitHub", icon: GitBranch, tone: "text-cyan-200", position: "lg:translate-x-8 lg:translate-y-2" },
  { label: "Screenshot", icon: Image, tone: "text-violet-200", position: "lg:-translate-x-5 lg:translate-y-16" },
  { label: "Voice", icon: Mic2, tone: "text-emerald-200", position: "lg:translate-x-12 lg:-translate-y-10" },
  { label: "Documentation", icon: FileText, tone: "text-amber-200", position: "lg:-translate-x-10 lg:-translate-y-3" },
  { label: "Architecture Diagram", icon: Network, tone: "text-cyan-100", position: "lg:translate-x-2 lg:translate-y-24" },
] as const;

export function MultimodalIntelligence() {
  return (
    <section className="relative z-10 px-5 py-24 sm:px-8 lg:px-12">
      <RevealOnScroll className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-200">
              Multimodal intelligence
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-50 md:text-6xl">
              Every input becomes one shared agent memory.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400">
              Repository context, screenshots, voice notes, docs, and diagrams
              merge into a single intelligence hub before execution begins.
            </p>
          </div>

          <div className="relative min-h-[560px]">
            <GlassPanel className="absolute left-1/2 top-1/2 flex size-56 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-cyan-300/20 bg-cyan-300/10 text-center shadow-[0_0_80px_rgba(6,182,212,0.22)]">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-200">
                  Unified
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-50">
                  Intelligence Hub
                </p>
              </div>
            </GlassPanel>

            {inputs.map((input, index) => {
              const Icon = input.icon;

              return (
                <motion.div
                  key={input.label}
                  className={`absolute left-1/2 top-1/2 w-56 -translate-x-1/2 -translate-y-1/2 ${input.position}`}
                  animate={{
                    rotate: [0, index % 2 === 0 ? 1.8 : -1.8, 0],
                    y: [0, index % 2 === 0 ? -14 : 14, 0],
                  }}
                  transition={{
                    duration: 5 + index * 0.35,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <TiltCard>
                    <GlassPanel className="rounded-3xl p-5">
                      <Icon className={`size-6 ${input.tone}`} aria-hidden="true" />
                      <p className="mt-4 text-lg font-semibold text-slate-50">
                        {input.label}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-slate-500">
                        Normalized into agent-readable context.
                      </p>
                    </GlassPanel>
                  </TiltCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
}
