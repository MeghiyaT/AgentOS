import { LandingChrome } from "@/components/landing/LandingChrome";
import { PageHero } from "@/components/landing/PageHero";
import { ProblemVisualization } from "@/components/landing/ProblemVisualization";
import { StoryNavigation } from "@/components/landing/StoryNavigation";

export default function ProblemPage() {
  return (
    <LandingChrome>
      <PageHero
        eyebrow="01 / Problem"
        title="Make invisible agent chains inspectable."
        description="This page isolates the core pitch: AgentOS converts a black-box prompt-to-agent flow into a visible operating-system pipeline."
        meta="Demo angle: judges should understand the problem in under ten seconds before seeing the live workspace."
      />
      <ProblemVisualization />
      <StoryNavigation currentHref="/problem" />
    </LandingChrome>
  );
}
