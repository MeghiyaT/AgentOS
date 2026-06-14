import { AgentGraphShowcase } from "@/components/landing/AgentGraphShowcase";
import { LandingChrome } from "@/components/landing/LandingChrome";
import { PageHero } from "@/components/landing/PageHero";
import { StoryNavigation } from "@/components/landing/StoryNavigation";

export default function AgentGraphPage() {
  return (
    <LandingChrome>
      <PageHero
        eyebrow="02 / Agent Graph"
        title="A living map of autonomous work."
        description="The graph page focuses attention on the seven-agent workflow, animated edge particles, and active node states."
        meta="Primary visual: Context Doctor to Evaluator, with continuous motion that communicates flow without distracting from the system."
      />
      <AgentGraphShowcase />
      <StoryNavigation currentHref="/agent-graph" />
    </LandingChrome>
  );
}
