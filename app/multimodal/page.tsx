import { LandingChrome } from "@/components/landing/LandingChrome";
import { MultimodalIntelligence } from "@/components/landing/MultimodalIntelligence";
import { PageHero } from "@/components/landing/PageHero";
import { StoryNavigation } from "@/components/landing/StoryNavigation";

export default function MultimodalPage() {
  return (
    <LandingChrome>
      <PageHero
        eyebrow="03 / Multimodal"
        title="Inputs converge into one agent memory."
        description="This page shows how GitHub, screenshots, voice, documentation, and architecture diagrams merge into a single intelligence hub."
        meta="UX goal: make multimodal context feel operational, not like a feature checklist."
      />
      <MultimodalIntelligence />
      <StoryNavigation currentHref="/multimodal" />
    </LandingChrome>
  );
}
