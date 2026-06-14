import { EvaluationDashboard } from "@/components/landing/EvaluationDashboard";
import { LandingChrome } from "@/components/landing/LandingChrome";
import { PageHero } from "@/components/landing/PageHero";
import { StoryNavigation } from "@/components/landing/StoryNavigation";

export default function EvaluationPage() {
  return (
    <LandingChrome>
      <PageHero
        eyebrow="06 / Evaluation"
        title="Every run ends with measurable confidence."
        description="This page makes AgentOS feel like an evaluation console: accuracy, latency, cost, confidence, and security all become live telemetry."
        meta="Workspace equivalent: the bottom panel pulls typed mock backend metrics and color-codes security risk."
      />
      <EvaluationDashboard />
      <StoryNavigation currentHref="/evaluation" />
    </LandingChrome>
  );
}
