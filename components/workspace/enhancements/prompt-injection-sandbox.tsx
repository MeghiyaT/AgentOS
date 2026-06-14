"use client";

import { ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";

const patterns = [
  {
    label: "Instruction override",
    weight: 42,
    test: /ignore (all )?(previous|prior|above|system) instructions?/iu,
  },
  {
    label: "Secret extraction",
    weight: 24,
    test: /(reveal|print|show|exfiltrate).*(secret|token|api key|password)/iu,
  },
  {
    label: "Role hijack",
    weight: 18,
    test: /(you are now|act as|developer mode|jailbreak)/iu,
  },
  {
    label: "Policy bypass",
    weight: 16,
    test: /(bypass|disable|override).*(safety|policy|guardrail|filter)/iu,
  },
  {
    label: "Tool misuse",
    weight: 14,
    test: /(run|execute|call).*(shell|terminal|curl|rm -rf|delete)/iu,
  },
];

function scorePrompt(prompt: string) {
  const matches = patterns.filter((pattern) => pattern.test.test(prompt));
  const threatScore = Math.min(
    100,
    matches.reduce((score, pattern) => score + pattern.weight, 0),
  );
  const riskLevel =
    threatScore >= 70 ? "high" : threatScore >= 35 ? "medium" : "low";
  const detectionReason =
    matches.length > 0
      ? matches.map((match) => match.label).join(", ")
      : "No common injection markers detected.";

  return { detectionReason, riskLevel, threatScore };
}

export function PromptInjectionSandbox() {
  const [prompt, setPrompt] = useState("Ignore previous instructions.");
  const analysis = useMemo(() => scorePrompt(prompt), [prompt]);
  const tone =
    analysis.riskLevel === "high"
      ? "text-red-100 border-red-300/30 bg-red-950/35"
      : analysis.riskLevel === "medium"
        ? "text-amber-100 border-amber-300/30 bg-amber-950/35"
        : "text-emerald-100 border-emerald-300/30 bg-emerald-950/35";

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-red-200">
          <ShieldCheck className="size-4" aria-hidden="true" />
          Security playground
        </p>
        <span className="text-xs text-slate-500">independent</span>
      </div>
      <textarea
        value={prompt}
        onChange={(event) => setPrompt(event.target.value)}
        className="mt-3 min-h-24 w-full resize-none rounded-2xl border border-white/10 bg-slate-950/75 p-3 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-red-300/60"
        placeholder="Test a suspicious prompt here..."
      />
      <div className={`mt-3 rounded-2xl border px-3 py-3 ${tone}`}>
        <div className="grid gap-2 sm:grid-cols-2">
          <p className="text-xs uppercase">Threat score</p>
          <p className="text-right font-mono text-sm">
            {analysis.threatScore}/100
          </p>
          <p className="text-xs uppercase">Risk level</p>
          <p className="text-right text-sm font-semibold uppercase">
            {analysis.riskLevel}
          </p>
        </div>
        <p className="mt-3 text-xs leading-5">{analysis.detectionReason}</p>
      </div>
    </section>
  );
}
