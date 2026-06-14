export const AGENT_NAMES = [
  "Context Doctor",
  "Planner",
  "Research",
  "Coding",
  "Testing",
  "Security",
  "Evaluator",
] as const;

export type AgentName = (typeof AGENT_NAMES)[number];

export type AgentStatus = "idle" | "running" | "complete" | "error";

export interface XAIAnswer {
  decision: string;
  reason: string;
  evidence: string[];
  confidence: number;
}

export interface AgentOutput {
  agentName: AgentName;
  status: AgentStatus;
  xai: XAIAnswer;
  result: Record<string, unknown>;
}

export interface ContextDoctorResult {
  promptHealth: "healthy" | "needs-context" | "blocked";
  missingInputs: string[];
  clarifiedObjective: string;
}

export interface PlannerResult {
  planId: string;
  steps: string[];
  dependencies: string[];
}

export interface ResearchResult {
  findings: string[];
  sources: string[];
  openQuestions: string[];
}

export interface CodingResult {
  filesChanged: string[];
  implementationSummary: string;
  riskNotes: string[];
}

export interface TestingResult {
  checksRun: string[];
  passed: boolean;
  failures: string[];
}

export interface SecurityResult {
  riskLevel: "low" | "medium" | "high" | "critical";
  findings: string[];
  mitigations: string[];
}

export interface EvaluatorResult {
  score: number;
  rubric: Record<string, number>;
  recommendation: string;
}

export type ContextDoctorOutput = AgentOutput & {
  agentName: "Context Doctor";
  result: ContextDoctorResult;
};

export type PlannerOutput = AgentOutput & {
  agentName: "Planner";
  result: PlannerResult;
};

export type ResearchOutput = AgentOutput & {
  agentName: "Research";
  result: ResearchResult;
};

export type CodingOutput = AgentOutput & {
  agentName: "Coding";
  result: CodingResult;
};

export type TestingOutput = AgentOutput & {
  agentName: "Testing";
  result: TestingResult;
};

export type SecurityOutput = AgentOutput & {
  agentName: "Security";
  result: SecurityResult;
};

export type EvaluatorOutput = AgentOutput & {
  agentName: "Evaluator";
  result: EvaluatorResult;
};

export type AgentRunOutput =
  | ContextDoctorOutput
  | PlannerOutput
  | ResearchOutput
  | CodingOutput
  | TestingOutput
  | SecurityOutput
  | EvaluatorOutput;
