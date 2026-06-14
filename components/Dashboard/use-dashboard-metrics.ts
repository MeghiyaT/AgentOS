"use client";

import { useEffect, useState } from "react";

import {
  dashboardMetricsResponseSchema,
  type DashboardMetricsResponse,
  type DashboardProfile,
} from "@/lib/types/dashboard-contracts";

type DashboardStatus = "loading" | "ready" | "error";

interface DashboardMetricsState {
  data: DashboardMetricsResponse | null;
  error: string | null;
  status: DashboardStatus;
}

export function useDashboardMetrics(profile: DashboardProfile) {
  const [state, setState] = useState<DashboardMetricsState>({
    data: null,
    error: null,
    status: "loading",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboardMetrics() {
      setState((current) => ({
        data: current.data,
        error: null,
        status: "loading",
      }));

      try {
        const response = await fetch(`/api/dashboard?profile=${profile}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Dashboard API failed with ${response.status}`);
        }

        const payload: unknown = await response.json();
        const parsed = dashboardMetricsResponseSchema.parse(payload);

        setState({
          data: parsed,
          error: null,
          status: "ready",
        });
      } catch (error: unknown) {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          data: null,
          error:
            error instanceof Error
              ? error.message
              : "Dashboard metrics failed to load.",
          status: "error",
        });
      }
    }

    void loadDashboardMetrics();

    return () => controller.abort();
  }, [profile]);

  return state;
}
