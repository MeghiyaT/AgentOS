import { LandingChrome } from "@/components/landing/LandingChrome";
import { PageHero } from "@/components/landing/PageHero";
import { SecurityLayer } from "@/components/landing/SecurityLayer";
import { StoryNavigation } from "@/components/landing/StoryNavigation";

export default function SecurityPage() {
  return (
    <LandingChrome>
      <PageHero
        eyebrow="05 / Security"
        title="Threats are visible before they become failures."
        description="The security page turns prompt injection, credential leakage, and unsafe tool calls into live blocked traffic."
        meta="Demo trigger: include 'trigger error' in the workspace problem description to show high-risk dashboard behavior."
      />
      <SecurityLayer />
      <StoryNavigation currentHref="/security" />
    </LandingChrome>
  );
}
