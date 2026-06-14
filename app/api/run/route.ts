import { NextResponse } from "next/server";
import { z } from "zod";

import {
  createMethodNotAllowedResponse,
  createRunErrorResponse,
  runAgentOrchestrator,
} from "../../../lib/agents/agent-runner";
import {
  RunRequestSchema,
  RunResponseSchema,
} from "../../../lib/schemas/api-schemas";

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body: unknown = await request.json();
    const validated = RunRequestSchema.parse(body);
    const response = await runAgentOrchestrator(validated);
    const totalLatencyMs = Date.now() - startTime;

    return NextResponse.json(
      RunResponseSchema.parse({
        ...response,
        evaluation: {
          ...response.evaluation,
          latencyMs: totalLatencyMs,
        },
        total_latency_ms: totalLatencyMs,
      }),
    );
  } catch (error) {
    const status = error instanceof z.ZodError ? 400 : 500;
    const response = createRunErrorResponse(error, Date.now() - startTime);

    return NextResponse.json(response, { status });
  }
}

export async function GET() {
  const response = createMethodNotAllowedResponse("GET", 0);

  return NextResponse.json(
    response,
    {
      status: 405,
      headers: {
        Allow: "POST",
      },
    },
  );
}
