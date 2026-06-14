"use client";

import { BarChart3 } from "lucide-react";

import { EvaluationDashboard } from "@/components/Dashboard/EvaluationDashboard";
import { SecurityDashboard } from "@/components/Dashboard/SecurityDashboard";
import { useDashboardMetrics } from "@/components/Dashboard/use-dashboard-metrics";
import { useAgentExecutionStore } from "@/lib/stores/agent-execution-store";

export function BottomPanel() {
  const activeAgent = useAgentExecutionStore((state) => state.activeAgent);
  const profile = activeAgent?.status === "error" ? "high-risk" : "standard";
  const { data, error, status } = useDashboardMetrics(profile);

  return (
    <section
      aria-label="Evaluation and security dashboards"
      className="glass-panel grid gap-3 rounded-3xl border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl xl:grid-cols-2"
    >
      <div className="xl:col-span-2">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-emerald-200">
          <BarChart3 className="size-4" aria-hidden="true" />
          Evaluation and security telemetry
        </p>
      </div>
      <EvaluationDashboard
        error={error}
        metrics={data?.evaluation ?? null}
        status={status}
      />
      <SecurityDashboard
        error={error}
        metrics={data?.security ?? null}
        status={status}
      />
    </section>
  );
}
