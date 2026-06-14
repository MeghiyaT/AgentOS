import { NextResponse } from "next/server";

import type {
  DashboardMetricsResponse,
  DashboardProfile,
} from "@/lib/types/dashboard-contracts";

function createDashboardMetrics(
  profile: DashboardProfile
): DashboardMetricsResponse {
  const highRisk = profile === "high-risk";

  return {
    profile,
    generatedAt: new Date().toISOString(),
    evaluation: {
      totalCostUsd: highRisk ? 7.42 : 4.28,
      totalLatencySeconds: highRisk ? 18.92 : 11.37,
      accuracy: highRisk ? 0.74 : 0.91,
      reliability: highRisk ? 0.68 : 0.88,
      confidence: highRisk ? 0.63 : 0.84,
    },
    security: {
      riskScore: highRisk ? 72 : 24,
      vulnerabilitiesFound: highRisk ? 3 : 1,
      findings: highRisk
        ? [
            {
              id: "sec-001",
              title: "Potential secret in repository diff",
              severity: "high",
              source: "Security agent",
              detail:
                "A token-shaped string needs manual review before sharing the demo artifact.",
            },
            {
              id: "sec-002",
              title: "Missing upload type enforcement",
              severity: "medium",
              source: "Testing agent",
              detail:
                "The screenshot intake should reject non-image payloads server-side.",
            },
            {
              id: "sec-003",
              title: "Unreviewed external dependency",
              severity: "medium",
              source: "Research agent",
              detail:
                "The graph renderer dependency should stay pinned for repeatable demos.",
            },
          ]
        : [
            {
              id: "sec-001",
              title: "Repo input pending deeper scan",
              severity: "low",
              source: "Security agent",
              detail:
                "No secret leakage detected in the current mock run; continue to full scan before production use.",
            },
          ],
    },
  };
}

export function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const profile =
    searchParams.get("profile") === "high-risk" ? "high-risk" : "standard";

  return NextResponse.json(createDashboardMetrics(profile));
}
