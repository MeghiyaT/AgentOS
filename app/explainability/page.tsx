import { ExplainableAI } from "@/components/landing/ExplainableAI";
import { LandingChrome } from "@/components/landing/LandingChrome";
import { PageHero } from "@/components/landing/PageHero";
import { StoryNavigation } from "@/components/landing/StoryNavigation";

export default function ExplainabilityPage() {
  return (
    <LandingChrome>
      <PageHero
        eyebrow="04 / Explainability"
        title="Reasoning unfolds as a story."
        description="This page highlights the XAI contract: decision, evidence, reason, and confidence appear progressively so users can trust the system."
        meta="Data contract: every agent output includes decision, reason, evidence, and confidence."
      />
      <ExplainableAI />
      <StoryNavigation currentHref="/explainability" />
    </LandingChrome>
  );
}
