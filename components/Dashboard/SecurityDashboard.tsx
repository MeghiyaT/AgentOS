"use client";

import { motion } from "framer-motion";
import { ShieldAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import type { SecurityFinding, SecurityMetrics } from "@/lib/types/dashboard-contracts";

interface SecurityDashboardProps {
  error: string | null;
  metrics: SecurityMetrics | null;
  status: "loading" | "ready" | "error";
}

const severityClasses: Record<SecurityFinding["severity"], string> = {
  info: "border-sky-400/30 bg-sky-950/50 text-sky-100",
  low: "border-emerald-400/30 bg-emerald-950/50 text-emerald-100",
  medium: "border-amber-400/30 bg-amber-950/50 text-amber-100",
  high: "border-red-400/30 bg-red-950/50 text-red-100",
  critical: "border-red-300 bg-red-950 text-red-50",
};

export function SecurityDashboard({
  error,
  metrics,
  status,
}: SecurityDashboardProps) {
  const loading = status === "loading" && metrics === null;
  const riskScore = metrics?.riskScore ?? 0;
  const riskTone = riskScore > 50 ? "red" : "green";
  const findings = metrics?.findings ?? [];

  return (
    <Card
      data-dashboard="security"
      data-risk-tone={riskTone}
      className="rounded-3xl border-white/10 bg-slate-950/55 text-slate-100 shadow-xl shadow-black/20"
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-50">
          <ShieldAlert
            className={`size-4 ${
              riskTone === "red" ? "text-red-300" : "text-emerald-300"
            }`}
            aria-hidden="true"
          />
          Security Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 lg:grid-cols-[220px_1fr]">
        {error ? (
          <p className="rounded-md border border-red-400/30 bg-red-950/40 px-3 py-2 text-xs text-red-100 lg:col-span-2">
            {error}
          </p>
        ) : null}

        <div className="space-y-3">
          <Progress
            value={riskScore}
            className={
              riskTone === "red"
                ? "[&_[data-slot=progress-indicator]]:bg-red-300 [&_[data-slot=progress-track]]:bg-slate-800"
                : "[&_[data-slot=progress-indicator]]:bg-emerald-300 [&_[data-slot=progress-track]]:bg-slate-800"
            }
          >
            <ProgressLabel className="text-xs text-slate-500">
              Security Risk Score
            </ProgressLabel>
            <ProgressValue className="text-xs text-slate-400" />
          </Progress>

          <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-3 py-3">
            <p className="text-xs uppercase text-slate-500">
              Vulnerabilities Found
            </p>
            <p className="mt-1 text-2xl font-semibold text-slate-50">
              {loading ? 0 : metrics?.vulnerabilitiesFound ?? 0}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs uppercase text-slate-500">Findings</p>
          <div className="mt-2 grid max-h-36 gap-2 overflow-auto pr-1 md:grid-cols-2">
            {findings.length > 0 ? (
              findings.map((finding) => (
                <motion.article
                  key={finding.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/55 p-3"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold leading-5 text-slate-100">
                      {finding.title}
                    </h3>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[11px] uppercase ${severityClasses[finding.severity]}`}
                    >
                      {finding.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{finding.source}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    {finding.detail}
                  </p>
                </motion.article>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 bg-slate-950/55 px-3 py-2 text-xs text-slate-500">
                No backend findings loaded yet.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
