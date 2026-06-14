"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  FileText,
  GitBranch,
  ImageUp,
  Play,
  RotateCcw,
  ScanSearch,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { MagneticButton } from "@/components/motion/MagneticButton";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress, ProgressLabel, ProgressValue } from "@/components/ui/progress";
import { useAgentExecutionStore } from "@/lib/stores/agent-execution-store";

const runRequestSchema = z.object({
  githubUrl: z.string().url("Enter a valid GitHub URL."),
  screenShotName: z.string().nullable(),
  problemDescription: z
    .string()
    .min(20, "Describe the problem in at least 20 characters."),
});

export function LeftPanel() {
  const [githubUrl, setGithubUrl] = useState("");
  const [screenShotName, setScreenShotName] = useState<string | null>(null);
  const [problemDescription, setProblemDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadBurst, setUploadBurst] = useState(false);
  const startRun = useAgentExecutionStore((state) => state.startRun);
  const resetRun = useAgentExecutionStore((state) => state.resetRun);
  const isRunning = useAgentExecutionStore((state) => state.isRunning);
  const runError = useAgentExecutionStore((state) => state.runError);
  const contextDoctor = useAgentExecutionStore(
    (state) => state.agentOutputs["Context Doctor"],
  );
  const lastRunRequest = useAgentExecutionStore((state) => state.lastRunRequest);
  const confidencePercent = Math.round(
    (contextDoctor?.xai.confidence ?? 0) * 100,
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsed = runRequestSchema.safeParse({
      githubUrl,
      screenShotName,
      problemDescription,
    });

    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Review the run inputs.");
      return;
    }

    setFormError(null);
    void startRun(parsed.data);
  }

  return (
    <section
      aria-label="Run configuration"
      className="glass-panel flex min-h-[520px] flex-col rounded-3xl border border-white/10 bg-white/[0.055] p-4 shadow-2xl shadow-black/30 backdrop-blur-2xl"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200">
            <ScanSearch className="size-4" aria-hidden="true" />
            Context Doctor
          </p>
          <h2 className="mt-2 text-lg font-semibold text-slate-50">
            Diagnose the mission
          </h2>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          aria-label="Reset run"
          className="rounded-full text-slate-400 hover:bg-white/10 hover:text-slate-100"
          onClick={resetRun}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
        </Button>
      </div>

      <form className="mt-5 flex flex-1 flex-col gap-4" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <Label htmlFor="githubUrl" className="text-slate-300">
            GitHub URL
          </Label>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/70 px-3 transition focus-within:border-cyan-300/70 focus-within:shadow-[0_0_24px_rgba(6,182,212,0.18)]">
            <GitBranch className="size-4 text-cyan-300/70" aria-hidden="true" />
            <input
              id="githubUrl"
              name="githubUrl"
              type="url"
              value={githubUrl}
              onChange={(event) => setGithubUrl(event.target.value)}
              placeholder="https://github.com/org/repo"
              className="h-11 min-w-0 flex-1 bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-600"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="screenShot" className="text-slate-300">
            Screenshot
          </Label>
          <label
            htmlFor="screenShot"
            className="relative flex h-12 cursor-pointer items-center justify-between gap-3 overflow-hidden rounded-2xl border border-dashed border-white/15 bg-slate-950/70 px-3 text-sm text-slate-400 transition hover:border-cyan-300/60 hover:text-slate-200"
          >
            <AnimatePresence>
              {uploadBurst ? (
                <motion.span
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.32),transparent_55%)]"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1.2 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                />
              ) : null}
            </AnimatePresence>
            <span className="flex min-w-0 items-center gap-2">
              <ImageUp className="size-4 text-violet-200" aria-hidden="true" />
              <span className="truncate">
                {screenShotName ?? "Upload screenshot"}
              </span>
            </span>
            <span className="text-xs text-slate-600">PNG/JPG</span>
          </label>
          <input
            id="screenShot"
            name="screenShot"
            type="file"
            accept="image/png,image/jpeg"
            className="sr-only"
            onChange={(event) => {
              setScreenShotName(event.target.files?.[0]?.name ?? null);
              setUploadBurst(true);
              window.setTimeout(() => setUploadBurst(false), 520);
            }}
          />
        </div>

        <div className="flex flex-1 flex-col space-y-2">
          <Label htmlFor="problemDescription" className="text-slate-300">
            Problem description
          </Label>
          <textarea
            id="problemDescription"
            name="problemDescription"
            value={problemDescription}
            onChange={(event) => setProblemDescription(event.target.value)}
            placeholder="What should AgentOS inspect, explain, and evaluate?"
            className="min-h-32 flex-1 resize-none rounded-2xl border border-white/10 bg-slate-950/70 p-3 text-sm leading-6 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-300/70 focus:shadow-[0_0_24px_rgba(6,182,212,0.18)]"
          />
        </div>

        <AnimatePresence>
          {lastRunRequest ? (
            <motion.div
              className="grid gap-2"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="grid grid-cols-2 gap-2">
                <motion.div
                  className="rounded-2xl border border-cyan-300/15 bg-cyan-300/10 p-3"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.06 }}
                >
                  <GitBranch className="size-4 text-cyan-200" aria-hidden="true" />
                  <p className="mt-2 text-xs font-semibold text-slate-100">
                    Repo mapped
                  </p>
                </motion.div>
                <motion.div
                  className="rounded-2xl border border-violet-300/15 bg-violet-300/10 p-3"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.12 }}
                >
                  <FileText className="size-4 text-violet-200" aria-hidden="true" />
                  <p className="mt-2 text-xs font-semibold text-slate-100">
                    Brief captured
                  </p>
                </motion.div>
              </div>
              <Progress
                value={confidencePercent}
                aria-label="Context Doctor confidence"
                className="[&_[data-slot=progress-indicator]]:bg-cyan-300 [&_[data-slot=progress-track]]:bg-slate-800"
              >
                <ProgressLabel className="text-xs text-slate-500">
                  diagnosis confidence
                </ProgressLabel>
                <ProgressValue className="text-xs text-slate-400" />
              </Progress>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {formError || runError ? (
          <p className="rounded-2xl border border-red-400/30 bg-red-950/30 px-3 py-2 text-xs text-red-100">
            {formError ?? runError}
          </p>
        ) : null}

        <MagneticButton className="w-full">
          <Button
            type="submit"
            disabled={isRunning}
            className="h-11 w-full rounded-2xl border border-cyan-300/20 bg-[linear-gradient(90deg,#7C3AED,#06B6D4)] text-white shadow-[0_0_32px_rgba(124,58,237,0.26)] hover:opacity-95"
          >
            <Play className="size-4" aria-hidden="true" />
            {isRunning ? "Running AgentOS" : "Run AgentOS"}
            <Sparkles className="size-4" aria-hidden="true" />
          </Button>
        </MagneticButton>
      </form>
    </section>
  );
}
