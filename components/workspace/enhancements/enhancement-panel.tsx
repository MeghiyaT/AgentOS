"use client";

import { AgentConfidenceVisualization } from "./agent-confidence-visualization";
import { AgentReplayTimeline } from "./agent-replay-timeline";
import { AICostTracker } from "./ai-cost-tracker";
import { ContextQualityScore } from "./context-quality-score";
import { PromptInjectionSandbox } from "./prompt-injection-sandbox";

export function EnhancementPanel() {
  return (
    <div className="grid gap-3 xl:grid-cols-3">
      <AgentReplayTimeline />
      <AgentConfidenceVisualization />
      <ContextQualityScore />
      <AICostTracker />
      <div className="xl:col-span-2">
        <PromptInjectionSandbox />
      </div>
    </div>
  );
}
