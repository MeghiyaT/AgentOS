import type { AgentName } from "@/lib/types/agent-contracts";

export interface AgentPersona {
  name: AgentName;
  role: string;
  signal: string;
  accent: "violet" | "cyan" | "green" | "amber" | "red";
}

export const AGENT_PERSONAS = [
  {
    name: "Context Doctor",
    role: "Diagnoses input quality, missing context, and task ambiguity.",
    signal: "Context integrity",
    accent: "cyan",
  },
  {
    name: "Planner",
    role: "Turns ambiguous intent into a sequenced multi-agent route.",
    signal: "Execution graph",
    accent: "violet",
  },
  {
    name: "Research",
    role: "Grounds decisions in repository, product, and API evidence.",
    signal: "Evidence retrieval",
    accent: "cyan",
  },
  {
    name: "Coding",
    role: "Applies scoped implementation changes with typed contracts.",
    signal: "Patch synthesis",
    accent: "green",
  },
  {
    name: "Testing",
    role: "Validates behavior with deterministic gates before handoff.",
    signal: "Verification loop",
    accent: "amber",
  },
  {
    name: "Security",
    role: "Blocks prompt injection, credential leakage, and unsafe tool calls.",
    signal: "Threat filter",
    accent: "red",
  },
  {
    name: "Evaluator",
    role: "Scores cost, latency, reliability, confidence, and demo readiness.",
    signal: "Quality verdict",
    accent: "green",
  },
] as const satisfies readonly AgentPersona[];
