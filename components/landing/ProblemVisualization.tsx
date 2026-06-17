"use client";

import { motion } from "framer-motion";
import { ArrowDown, Brain, EyeOff, ShieldCheck } from "lucide-react";

import { GlassPanel } from "@/components/effects/GlassPanel";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

const blackBoxFlow = ["Prompt", "Agent", "Black Box"] as const;
const agentOsFlow = [
  "Prompt",
  "AgentOS",
  "Context",
  "Planning",
  "Security",
  "Evaluation",
] as const;

function FlowStack({
  items,
  variant,
}: {
  items: readonly string[];
  variant: "blackbox" | "agentos";
}) {
  return (
    <div className="flex flex-col items-center gap-3">
      {items.map((item, index) => (
        <motion.div
          key={item}
          initial={{ opacity: 0, y: 18, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{
            delay: index * 0.12,
            duration: 0.55,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="flex w-full flex-col items-center gap-3"
        >
          <div
            className={
              variant === "blackbox"
                ? "w-full rounded-2xl border border-slate-700/80 bg-slate-950/70 px-5 py-4 text-center text-sm font-semibold text-slate-300"
                : "w-full rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-5 py-4 text-center text-sm font-semibold text-cyan-50 shadow-[0_0_34px_rgba(6,182,212,0.1)]"
            }
          >
            {item}
          </div>
          {index < items.length - 1 ? (
            <ArrowDown
              className={
                variant === "blackbox"
                  ? "size-4 text-slate-600"
                  : "size-4 text-cyan-300"
              }
              aria-hidden="true"
            />
          ) : null}
        </motion.div>
      ))}
    </div>
  );
}

export function ProblemVisualization() {
  return (
    <section className="relative z-10 px-5 py-24 sm:px-8 lg:px-12">
      <RevealOnScroll className="mx-auto max-w-7xl">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">
              The trust gap
            </p>
            <h2 className="mt-5 text-4xl font-semibold tracking-[-0.04em] text-slate-50 md:text-6xl">
              From invisible agent chains to an inspectable operating system.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400">
              AgentOS turns a single opaque answer into a visible sequence of
              context diagnosis, planning, security checks, and evaluation
              signals that judges can understand instantly.
            </p>
          </div>

          <GlassPanel className="grid gap-5 p-5 md:grid-cols-2">
            <div className="rounded-[2rem] border border-red-300/10 bg-red-950/10 p-5">
              <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-red-100">
                <EyeOff className="size-4" aria-hidden="true" />
                Standard agent flow
              </div>
              <FlowStack items={blackBoxFlow} variant="blackbox" />
            </div>

            <div className="rounded-[2rem] border border-cyan-300/15 bg-cyan-300/[0.045] p-5">
              <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-cyan-100">
                <ShieldCheck className="size-4" aria-hidden="true" />
                AgentOS inspection flow
              </div>
              <FlowStack items={agentOsFlow} variant="agentos" />
            </div>
          </GlassPanel>
        </div>
      </RevealOnScroll>

      <Brain
        className="pointer-events-none absolute bottom-10 right-10 size-40 text-violet-300/5"
        aria-hidden="true"
      />
    </section>
  );
}
