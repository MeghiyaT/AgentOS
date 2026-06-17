"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  BrainCircuit,
  Eye,
  GitBranch,
  Layers3,
  ShieldCheck,
  Sparkles,
  TimerReset,
} from "lucide-react";
import Link from "next/link";

import { GlassPanel } from "@/components/effects/GlassPanel";
import { ParticleOrb } from "@/components/effects/ParticleOrb";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { TiltCard } from "@/components/motion/TiltCard";
import { buttonVariants } from "@/components/ui/button";
import { landingRoutes } from "@/lib/landing/routes";
import { cn } from "@/lib/utils";

const overviewCards = [
  {
    href: "/problem",
    label: "Problem Visualization",
    description: "Show how AgentOS turns black-box automation into inspectable system flow.",
    icon: Eye,
    tone: "text-violet-200",
  },
  {
    href: "/agent-graph",
    label: "Agent Graph",
    description: "A seven-agent workflow with animated transitions and live state language.",
    icon: GitBranch,
    tone: "text-cyan-200",
  },
  {
    href: "/multimodal",
    label: "Multimodal Context",
    description: "GitHub, screenshots, docs, voice, and diagrams converge into one hub.",
    icon: Layers3,
    tone: "text-emerald-200",
  },
  {
    href: "/explainability",
    label: "Explainability",
    description: "Decision, evidence, reason, and confidence unfold as a reasoning chain.",
    icon: BrainCircuit,
    tone: "text-amber-200",
  },
  {
    href: "/security",
    label: "Security Layer",
    description: "Threat traffic is blocked before unsafe agent execution can proceed.",
    icon: ShieldCheck,
    tone: "text-red-200",
  },
  {
    href: "/evaluation",
    label: "Evaluation",
    description: "Cost, latency, accuracy, confidence, and security score animate as telemetry.",
    icon: TimerReset,
    tone: "text-cyan-100",
  },
] as const;

export function OverviewPage() {
  return (
    <>
      <section className="relative flex min-h-screen items-center px-5 pb-16 pt-32 sm:px-8 lg:px-12">
        <ParticleOrb className="opacity-80" particleCount={26} />
        <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <motion.div
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100"
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <Sparkles className="size-4" aria-hidden="true" />
              Reimagined AI-native interface
            </motion.div>
            <motion.h1
              className="mt-8 max-w-5xl text-[clamp(4.5rem,13vw,11rem)] font-black uppercase leading-[0.78] tracking-[-0.12em] text-slate-50"
              initial={{ opacity: 0, y: 42, filter: "blur(16px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ delay: 0.1, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
            >
              AgentOS
            </motion.h1>
            <motion.p
              className="mt-8 max-w-2xl text-2xl font-medium leading-9 text-slate-200 md:text-3xl"
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            >
              The Control Center for Autonomous AI Agents.
            </motion.p>
            <motion.p
              className="mt-5 max-w-2xl text-base leading-7 text-slate-400"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            >
              A structured premium product experience: each capability now has
              its own focused page, and the workspace remains the live cockpit.
            </motion.p>
            <motion.div
              className="mt-9 flex flex-wrap items-center gap-4"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.42, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            >
              <MagneticButton>
                <Link
                  href="/workspace"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-12 rounded-full border border-cyan-300/20 bg-[linear-gradient(90deg,#7C3AED,#06B6D4)] px-6 font-semibold text-white shadow-[0_0_42px_rgba(124,58,237,0.34)] hover:opacity-95",
                  )}
                >
                  Launch Workspace
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </MagneticButton>
              <Link
                href="/problem"
                className="text-sm font-semibold text-slate-300 transition hover:text-cyan-100"
              >
                Start product story
              </Link>
            </motion.div>
          </div>

          <GlassPanel className="agentos-scanline p-5 lg:p-6">
            <div className="grid gap-3">
              {landingRoutes.slice(1).map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  className="group flex items-center justify-between rounded-2xl border border-white/10 bg-slate-950/50 px-4 py-3 transition hover:border-cyan-300/30 hover:bg-cyan-300/10"
                >
                  <span>
                    <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-600">
                      {route.eyebrow}
                    </span>
                    <span className="ml-3 text-sm font-semibold text-slate-200">
                      {route.label}
                    </span>
                  </span>
                  <ArrowRight
                    className="size-4 text-slate-600 transition group-hover:translate-x-1 group-hover:text-cyan-200"
                    aria-hidden="true"
                  />
                </Link>
              ))}
            </div>
          </GlassPanel>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-12">
        <RevealOnScroll className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-col justify-between gap-3 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-violet-200">
                Site structure
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-50 md:text-5xl">
                One focused page per capability.
              </h2>
            </div>
            <p className="max-w-lg text-sm leading-6 text-slate-400">
              Judges can understand the product story in clear chapters, then
              jump into the functional workspace for the live demo.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {overviewCards.map((card) => {
              const Icon = card.icon;

              return (
                <TiltCard key={card.href}>
                  <Link href={card.href} className="block h-full">
                    <GlassPanel className="h-full p-5 transition hover:border-cyan-300/30">
                      <Icon className={cn("size-6", card.tone)} aria-hidden="true" />
                      <h3 className="mt-6 text-xl font-semibold text-slate-50">
                        {card.label}
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-slate-400">
                        {card.description}
                      </p>
                    </GlassPanel>
                  </Link>
                </TiltCard>
              );
            })}
          </div>
        </RevealOnScroll>
      </section>
    </>
  );
}
