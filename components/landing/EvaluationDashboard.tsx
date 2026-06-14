"use client";

import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { BarChart3, Gauge, Timer, WalletCards } from "lucide-react";
import { useEffect } from "react";

import { GlassPanel } from "@/components/effects/GlassPanel";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";

const metrics = [
  {
    label: "Accuracy",
    value: 94,
    icon: Gauge,
    formatter: (value: number) => `${Math.round(value)}%`,
  },
  {
    label: "Latency",
    value: 12.8,
    icon: Timer,
    formatter: (value: number) => `${value.toFixed(1)}s`,
  },
  {
    label: "Cost",
    value: 3.42,
    icon: WalletCards,
    formatter: (value: number) => `$${value.toFixed(2)}`,
  },
  {
    label: "Security",
    value: 88,
    icon: BarChart3,
    formatter: (value: number) => `${Math.round(value)}%`,
  },
] as const;

function AnimatedValue({
  value,
  formatter,
}: {
  value: number;
  formatter: (value: number) => string;
}) {
  const count = useMotionValue(0);
  const display = useTransform(count, formatter);

  useEffect(() => {
    const controls = animate(count, value, {
      duration: 1.45,
      ease: [0.16, 1, 0.3, 1],
    });

    return () => controls.stop();
  }, [count, value]);

  return <motion.span>{display}</motion.span>;
}

export function EvaluationDashboard() {
  return (
    <section className="relative z-10 px-5 py-24 sm:px-8 lg:px-12">
      <RevealOnScroll className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-200">
              Evaluation dashboard
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-slate-50 md:text-6xl">
              Metrics animate like live telemetry.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-400">
            Accuracy, latency, cost, and security draw themselves into view so
            the run feels measurable, not mysterious.
          </p>
        </div>

        <GlassPanel className="p-6 lg:p-8">
          <div className="grid gap-4 md:grid-cols-4">
            {metrics.map((metric, index) => {
              const Icon = metric.icon;

              return (
                <motion.article
                  key={metric.label}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{
                    delay: index * 0.1,
                    duration: 0.6,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="rounded-3xl border border-white/10 bg-slate-950/55 p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <Icon className="size-5 text-cyan-200" aria-hidden="true" />
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2 py-1 text-[11px] font-semibold uppercase text-emerald-100">
                      live
                    </span>
                  </div>
                  <p className="mt-8 text-sm uppercase tracking-[0.24em] text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-slate-50">
                    <AnimatedValue value={metric.value} formatter={metric.formatter} />
                  </p>
                  <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800">
                    <motion.div
                      className="h-full rounded-full bg-[linear-gradient(90deg,#7C3AED,#06B6D4,#22C55E)]"
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: metric.value / 100 }}
                      viewport={{ once: true, margin: "-80px" }}
                      transition={{
                        delay: 0.2 + index * 0.08,
                        duration: 1,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      style={{ transformOrigin: "left" }}
                    />
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
