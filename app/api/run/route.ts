import { NextResponse } from "next/server";
import { z } from "zod";

import { runAgentOSInspection } from "@/lib/agents/orchestrator";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const response = await runAgentOSInspection(body);

    return NextResponse.json(response);
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 500;
    const message =
      error instanceof Error ? error.message : "AgentOS run failed.";

    return NextResponse.json(
      {
        agents: [],
        evaluation: {
          totalCostUsd: 0,
          totalLatencySeconds: 0,
          accuracy: 0,
          reliability: 0,
          confidence: 0,
        },
        security: {
          riskScore: 100,
          vulnerabilitiesFound: 1,
          findings: [
            {
              id: "run-001",
              title: "Run failed",
              severity: "high",
              source: "AgentOS API",
              detail: message,
            },
          ],
        },
        status: "error",
        generatedAt: new Date().toISOString(),
        totalCostUsd: 0,
        totalLatencyMs: 0,
        error: message,
      },
      { status },
    );
  }
}

export function GET() {
  return NextResponse.json(
    { error: "Use POST /api/run to start AgentOS inspection." },
    { status: 405, headers: { Allow: "POST" } },
  );
}
