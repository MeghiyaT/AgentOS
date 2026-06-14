"use client";

import { ClipboardCheck } from "lucide-react";

import { useAgentExecutionStore } from "@/lib/stores/agent-execution-store";

function calculateContextScore(result: Record<string, unknown> | undefined) {
  const missingInputs = Array.isArray(result?.missingInputs)
    ? result.missingInputs.length
    : 0;
  const promptHealth =
    typeof result?.promptHealth === "string" ? result.promptHealth : "healthy";
  const healthPenalty =
    promptHealth === "blocked" ? 24 : promptHealth === "needs-context" ? 12 : 0;
  const missingPenalty = Math.min(42, missingInputs * 14);

  return Math.max(0, Math.round(100 - healthPenalty - missingPenalty));
}

export function ContextQualityScore() {
  const contextDoctor = useAgentExecutionStore(
    (state) => state.agentOutputs["Context Doctor"],
  );
  const score = calculateContextScore(contextDoctor?.result);
  const missingInputs = Array.isArray(contextDoctor?.result.missingInputs)
    ? contextDoctor.result.missingInputs
    : [];

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
        <ClipboardCheck className="size-4" aria-hidden="true" />
        Context quality score
      </p>
      <div className="mt-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-4xl font-semibold text-slate-50">{score}/100</p>
          <p className="mt-1 text-xs text-slate-500">
            Derived from Context Doctor output
          </p>
        </div>
        <div className="h-16 w-16 rounded-full border border-emerald-300/30 bg-emerald-300/10 p-1">
          <div
            className="grid h-full w-full place-items-center rounded-full bg-slate-950 text-sm font-semibold text-emerald-100"
            style={{
              boxShadow: `0 0 ${Math.max(8, score / 3)}px rgba(52,211,153,0.28)`,
            }}
          >
            {score}
          </div>
        </div>
      </div>
      <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
        <p className="text-xs uppercase text-slate-500">Missing context</p>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">
          {missingInputs.length > 0
            ? missingInputs.join(", ")
            : "No missing context reported yet."}
        </p>
      </div>
    </section>
  );
}
