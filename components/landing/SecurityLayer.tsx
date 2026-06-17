"use client";

import { motion } from "framer-motion";
import { LockKeyhole, ShieldCheck, Zap } from "lucide-react";

import { GlassPanel } from "@/components/effects/GlassPanel";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

const threats = ["Prompt Injection", "Credential Leak", "Malicious Tool Call"] as const;

export function SecurityLayer() {
  return (
    <section className="relative z-10 px-5 py-24 sm:px-8 lg:px-12">
      <RevealOnScroll className="mx-auto max-w-7xl">
        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <GlassPanel className="relative min-h-[560px] p-8">
            <div className="absolute inset-8 rounded-[2.5rem] border border-red-300/10" />
            <div className="absolute left-1/2 top-1/2 flex size-52 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-emerald-300/25 bg-emerald-300/10 shadow-[0_0_90px_rgba(34,197,94,0.22)]">
              <div className="absolute inset-0 rounded-full border border-emerald-300/20 [animation:agentos-shield_2.8s_ease-out_infinite]" />
              <div className="absolute inset-6 rounded-full border border-emerald-300/20 [animation:agentos-shield_2.8s_ease-out_infinite_0.7s]" />
              <ShieldCheck className="size-20 text-emerald-100" aria-hidden="true" />
            </div>

            {threats.map((threat, index) => (
              <motion.div
                key={threat}
                className="absolute left-6 flex items-center gap-3 rounded-2xl border border-red-300/25 bg-red-950/30 px-4 py-3 text-sm font-semibold text-red-100 shadow-xl shadow-red-950/20"
                style={{ top: `${18 + index * 25}%` }}
                animate={{
                  x: [0, 250, 0],
                  opacity: [0.24, 1, 0.24],
                }}
                transition={{
                  duration: 4.2,
                  delay: index * 0.55,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Zap className="size-4" aria-hidden="true" />
                {threat}
              </motion.div>
            ))}

            <div className="absolute bottom-8 right-8 rounded-2xl border border-emerald-300/20 bg-emerald-300/10 px-4 py-3 text-sm font-semibold text-emerald-100">
              Blocked before execution
            </div>
          </GlassPanel>

          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-emerald-200">
              Security layer
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-slate-50 md:text-6xl">
              Threats are treated as live traffic, not afterthoughts.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-slate-400">
              The Security agent filters prompt injection, credential exposure,
              and risky tool calls before the evaluator approves the run.
            </p>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {["Policy", "Secrets", "Tools"].map((item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] p-4"
                >
                  <LockKeyhole className="size-5 text-emerald-200" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-slate-100">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
}
