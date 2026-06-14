"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowRight, BrainCircuit, CircleDotDashed, Sparkles } from "lucide-react";
import Link from "next/link";
import type { MouseEvent } from "react";

import { ParticleOrb } from "@/components/effects/ParticleOrb";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const networkNodes = [
  { id: "context", x: 18, y: 32, label: "Context" },
  { id: "plan", x: 38, y: 19, label: "Plan" },
  { id: "research", x: 62, y: 28, label: "Research" },
  { id: "code", x: 77, y: 53, label: "Code" },
  { id: "security", x: 52, y: 70, label: "Security" },
  { id: "eval", x: 28, y: 63, label: "Eval" },
] as const;

const networkEdges = [
  ["context", "plan"],
  ["plan", "research"],
  ["research", "code"],
  ["code", "security"],
  ["security", "eval"],
  ["eval", "context"],
  ["plan", "security"],
] as const;

function getNode(id: (typeof networkNodes)[number]["id"]) {
  return networkNodes.find((node) => node.id === id);
}

function HeroNetwork() {
  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 h-full w-full opacity-80"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="agentos-edge" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#7C3AED" stopOpacity="0.1" />
          <stop offset="0.5" stopColor="#06B6D4" stopOpacity="0.72" />
          <stop offset="1" stopColor="#22C55E" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      {networkEdges.map(([sourceId, targetId]) => {
        const source = getNode(sourceId);
        const target = getNode(targetId);

        if (!source || !target) {
          return null;
        }

        return (
          <motion.line
            key={`${sourceId}-${targetId}`}
            x1={source.x}
            y1={source.y}
            x2={target.x}
            y2={target.y}
            stroke="url(#agentos-edge)"
            strokeWidth="0.22"
            strokeDasharray="1.4 1.2"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: [0.18, 0.8, 0.18] }}
            transition={{
              duration: 3.4,
              repeat: Infinity,
              repeatType: "mirror",
              ease: "easeInOut",
            }}
          />
        );
      })}
      {networkNodes.map((node, index) => (
        <motion.g
          key={node.id}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: [1, 1.08, 1] }}
          transition={{
            delay: index * 0.12,
            duration: 2.6,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
          }}
        >
          <circle cx={node.x} cy={node.y} r="1.5" fill="#06B6D4" opacity="0.9" />
          <circle
            cx={node.x}
            cy={node.y}
            r="4.5"
            fill="none"
            stroke="#7C3AED"
            strokeOpacity="0.18"
            strokeWidth="0.3"
          />
        </motion.g>
      ))}
    </svg>
  );
}

export function HeroSection() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 80, damping: 18 });
  const smoothY = useSpring(mouseY, { stiffness: 80, damping: 18 });
  const networkX = useTransform(smoothX, [-0.5, 0.5], [-22, 22]);
  const networkY = useTransform(smoothY, [-0.5, 0.5], [-16, 16]);
  const contentX = useTransform(smoothX, [-0.5, 0.5], [10, -10]);
  const contentY = useTransform(smoothY, [-0.5, 0.5], [8, -8]);

  function handleMouseMove(event: MouseEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    mouseX.set((event.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((event.clientY - rect.top) / rect.height - 0.5);
  }

  return (
    <section
      className="relative z-10 flex min-h-screen items-center overflow-hidden px-5 py-12 sm:px-8 lg:px-12"
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="absolute inset-x-4 top-20 h-[62vh] rounded-[3rem] border border-white/10 bg-white/[0.025] shadow-2xl shadow-violet-950/40 backdrop-blur-sm"
        style={{ x: networkX, y: networkY }}
      >
        <HeroNetwork />
        <ParticleOrb particleCount={30} />
      </motion.div>

      <motion.div
        className="relative mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[1.1fr_0.9fr]"
        style={{ x: contentX, y: contentY }}
      >
        <div className="flex min-h-[620px] flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100"
          >
            <CircleDotDashed className="size-4" aria-hidden="true" />
            Autonomous agent control plane
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40, filter: "blur(16px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.12, duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
            className="mt-10 max-w-5xl text-[clamp(4.7rem,14vw,12rem)] font-black uppercase leading-[0.78] tracking-[-0.12em] text-slate-50"
          >
            AgentOS
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 max-w-2xl text-2xl font-medium leading-9 text-slate-200 md:text-3xl"
          >
            The Operating System for AI Agents.
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.34, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 max-w-2xl text-base leading-7 text-slate-400"
          >
            Inspect context, planning, tool calls, explainability, security, and
            evaluation scores from one cinematic command center.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.46, duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            className="mt-9 flex flex-wrap items-center gap-4"
          >
            <MagneticButton>
              <Link
                href="/workspace"
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "h-12 rounded-full border border-violet-300/20 bg-[linear-gradient(90deg,#7C3AED,#06B6D4)] px-6 text-sm font-semibold text-white shadow-[0_0_42px_rgba(124,58,237,0.36)] hover:opacity-95",
                )}
              >
                Launch Workspace
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </MagneticButton>
            <span className="text-sm text-slate-500">
              7-agent workflow. XAI-native. Eval-gated.
            </span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.32, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="hidden items-center justify-center lg:flex"
        >
          <div className="agentos-scanline relative aspect-square w-full max-w-[520px] rounded-[3rem] border border-white/10 bg-slate-950/40 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur-2xl">
            <div className="absolute inset-8 rounded-full border border-cyan-300/10" />
            <div className="absolute inset-20 rounded-full border border-violet-300/10" />
            <div className="absolute left-1/2 top-1/2 flex size-36 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 shadow-[0_0_70px_rgba(6,182,212,0.28)]">
              <BrainCircuit className="size-16 text-cyan-100" aria-hidden="true" />
            </div>
            <div className="agentos-orbit absolute left-[18%] top-[22%] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              Context
            </div>
            <div className="agentos-orbit absolute bottom-[20%] right-[14%] rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200 [animation-duration:24s]">
              Security
            </div>
            <div className="absolute bottom-8 left-8 flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-4 py-2 text-xs font-semibold text-emerald-100">
              <Sparkles className="size-4" aria-hidden="true" />
              Living system online
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
