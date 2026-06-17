import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";

import {
  securityOutputSchema,
  type AgentInputs,
  type SecurityOutput as SecurityAgentOutput,
} from "../prompts/agent-prompts";

const DEFAULT_MODEL = "gpt-4o";

type SecurityOptions = {
  openai?: OpenAI;
  model?: string;
  allowMockFallback?: boolean;
};

// Internal schema used to shape the LLM response accurately
const aiSecuritySchema = z.object({
  risk_score: z.number().min(0).max(10),
  findings: z.array(
    z.object({
      title: z.string().min(1),
      severity: z.enum(["info", "low", "medium", "high", "critical"]),
      affected_surface: z.string().min(1),
      evidence: z.array(z.string().min(1)).min(1),
      mitigation: z.string().min(1),
    })
  ),
  security_posture: z.enum(["acceptable", "watch", "at_risk", "blocked"]),
  xai: z.object({
    decision: z.string().min(1),
    reason: z.string().min(1),
    evidence: z.array(z.string().min(1)).min(1),
    confidence: z.number().min(0).max(100),
  }),
});

const SYSTEM_PROMPT = `You are an elite, production-grade AI Security Agent (DevSecOps Specialist).
Your responsibilities are to analyze repository contexts and proposed implementations to identify security risks.

Tasks:
1. Threat Detection: Detect Prompt Injection Risks, Credential Exposure, Hardcoded Secrets, Dangerous Patterns, and Data Leakage.
2. Findings: Generate specific security findings. Provide a title, severity (info/low/medium/high/critical), affected surface, evidence, and clear mitigation steps.
3. Scoring: Provide an overall Risk Score (0-10, where 10 is critically vulnerable) and an overall Security Posture (acceptable/watch/at_risk/blocked).
4. XAI & Confidence: Always populate the XAI decision, reason, evidence, and confidence (0-100) fields. No placeholders.

You must output valid JSON strictly matching the provided schema.`;

export async function runSecurity(
  input: AgentInputs,
  options: SecurityOptions = {},
): Promise<SecurityAgentOutput> {
  const startTime = Date.now();
  let attempts = 0;
  const MAX_RETRIES = 2;
  const TIMEOUT_MS = 30000;

  while (attempts <= MAX_RETRIES) {
    attempts++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const client = createOpenAIClient(options.openai);
      const completion = await client.chat.completions.create(
        {
          model: options.model ?? DEFAULT_MODEL,
          messages: buildMessages(input),
          response_format: zodResponseFormat(
            aiSecuritySchema,
            "security_output",
          ),
          temperature: 0.2,
        },
        { signal: controller.signal },
      );

      clearTimeout(timeoutId);

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI response did not include message content.");
      }

      const parsed = aiSecuritySchema.parse(JSON.parse(content));
      const latencyMs = Date.now() - startTime;
      const tokens = completion.usage?.total_tokens ?? 0;
      
      return securityOutputSchema.parse({
        riskScore: parsed.risk_score,
        findings: parsed.findings.map((f) => ({
          title: f.title,
          severity: f.severity,
          affectedSurface: f.affected_surface,
          evidence: f.evidence,
          mitigation: f.mitigation,
        })),
        securityPosture: parsed.security_posture,
        xai: {
          decision: parsed.xai.decision,
          reason: parsed.xai.reason,
          evidence: [
            ...parsed.xai.evidence,
            `[Telemetry] Latency: ${latencyMs}ms`,
            `[Telemetry] Tokens: ${tokens}`,
          ],
          confidence: parsed.xai.confidence / 100, // Normalize to 0-1
        },
      });
    } catch (error) {
      clearTimeout(timeoutId);
      if (attempts > MAX_RETRIES) {
        if (options.allowMockFallback) {
          return buildGracefulFallback(input, getErrorMessage(error), Date.now() - startTime);
        }
        throw error;
      }
      // Wait before retrying (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempts));
    }
  }

  // Fallback if loop ends unexpectedly
  return buildGracefulFallback(input, "Max retries exceeded", Date.now() - startTime);
}

function buildMessages(input: AgentInputs): ChatCompletionMessageParam[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    {
      role: "user",
      content: `Repository: ${input.githubUrl}\nTask Description: ${
        input.description || "No description provided."
      }\n      
Evaluate the security posture and provide a threat analysis. Generate structured JSON output only.`,
    },
  ];
}

function createOpenAIClient(client?: OpenAI): OpenAI {
  if (client) {
    return client;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for live Security runs.");
  }

  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function buildGracefulFallback(
  input: AgentInputs,
  reason: string,
  latencyMs: number,
): SecurityAgentOutput {
  // Graceful fallback to prevent pipeline crashes when LLM is unavailable
  return securityOutputSchema.parse({
    riskScore: 5,
    findings: [
      {
        title: "Security Scan Degraded",
        severity: "info",
        affectedSurface: "Pipeline Integrity",
        evidence: ["AI threat analysis system was unreachable or timed out."],
        mitigation: "Review system logs and manually verify code changes until AI is restored.",
      }
    ],
    securityPosture: "watch",
    xai: {
      decision: "Triggered graceful degraded fallback.",
      reason: `Security Agent failed after retries: ${reason}`,
      evidence: [
        `Target Repository: ${input.githubUrl}`,
        `[Telemetry] Failed after ${latencyMs}ms`,
      ],
      confidence: 0.1,
    },
  });
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "AbortError") return "API request timed out";
    return error.message;
  }
  return "Unknown error";
}
