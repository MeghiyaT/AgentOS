"use client";

import { motion } from "framer-motion";
import { Gauge, Timer, WalletCards } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import type { EvaluationMetrics } from "@/lib/types/dashboard-contracts";

interface EvaluationDashboardProps {
  error: string | null;
  metrics: EvaluationMetrics | null;
  status: "loading" | "ready" | "error";
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

function formatSeconds(value: number) {
  return `${value.toFixed(2)} seconds`;
}

function toPercent(value: number) {
  return Math.round(value * 100);
}

function MetricTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <motion.div
      className="rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase text-slate-500">{label}</p>
        <span className="text-cyan-200">{icon}</span>
      </div>
      <p className="mt-2 text-xl font-semibold text-slate-50">{value}</p>
    </motion.div>
  );
}

function ScoreProgress({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <Progress
      value={value}
      className="[&_[data-slot=progress-indicator]]:bg-cyan-300 [&_[data-slot=progress-track]]:bg-slate-800"
    >
      <ProgressLabel className="text-xs text-slate-500">{label}</ProgressLabel>
      <ProgressValue className="text-xs text-slate-400" />
    </Progress>
  );
}

export function EvaluationDashboard({
  error,
  metrics,
  status,
}: EvaluationDashboardProps) {
  const loading = status === "loading" && metrics === null;

  return (
    <Card
      data-dashboard="evaluation"
      className="rounded-3xl border-white/10 bg-slate-950/55 text-slate-100 shadow-xl shadow-black/20"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-50">
          <Gauge className="size-4 text-cyan-300" aria-hidden="true" />
          Evaluation Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
        {error ? (
          <p className="rounded-md border border-red-400/30 bg-red-950/40 px-3 py-2 text-xs text-red-100 lg:col-span-2">
            {error}
          </p>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <MetricTile
            label="Total Cost"
            value={loading ? "$0.00" : formatCurrency(metrics?.totalCostUsd ?? 0)}
            icon={<WalletCards className="size-4" aria-hidden="true" />}
          />
          <MetricTile
            label="Total Latency"
            value={
              loading
                ? "0.00 seconds"
                : formatSeconds(metrics?.totalLatencySeconds ?? 0)
            }
            icon={<Timer className="size-4" aria-hidden="true" />}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <ScoreProgress
            label="Accuracy"
            value={toPercent(metrics?.accuracy ?? 0)}
          />
          <ScoreProgress
            label="Reliability"
            value={toPercent(metrics?.reliability ?? 0)}
          />
          <ScoreProgress
            label="Confidence"
            value={toPercent(metrics?.confidence ?? 0)}
          />
        </div>
        <div className="lg:col-span-2">
          <div className="grid h-20 grid-cols-12 items-end gap-1 rounded-2xl border border-white/10 bg-slate-950/45 p-3">
            {Array.from({ length: 12 }, (_, index) => (
              <motion.span
                key={index}
                className="rounded-t bg-[linear-gradient(180deg,#06B6D4,#7C3AED)]"
                initial={{ scaleY: 0.12, opacity: 0.35 }}
                animate={{ scaleY: 0.35 + ((index * 19) % 60) / 100, opacity: 1 }}
                transition={{
                  duration: 0.7,
                  delay: index * 0.035,
                  ease: [0.16, 1, 0.3, 1],
                }}
                style={{ height: "100%", transformOrigin: "bottom" }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
