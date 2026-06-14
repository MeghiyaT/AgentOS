"use client";

import { Clock3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAgentExecutionStore } from "@/lib/stores/agent-execution-store";
import { AGENT_NAMES } from "@/lib/types/agent-contracts";
import type { AgentName, AgentStatus } from "@/lib/types/agent-contracts";

type TimelineEvent = {
  id: string;
  agentName: AgentName;
  label: string;
  status: AgentStatus;
  time: string;
};

const statusLabel: Record<AgentStatus, string> = {
  idle: "Idle",
  running: "Started",
  complete: "Finished",
  error: "Errored",
};

export function AgentReplayTimeline() {
  const agentGraph = useAgentExecutionStore((state) => state.agentGraph);
  const lastRunRequest = useAgentExecutionStore((state) => state.lastRunRequest);
  const previousGraph = useRef<Record<string, AgentStatus> | null>(null);
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  useEffect(() => {
    previousGraph.current = null;
    setEvents([]);
  }, [lastRunRequest]);

  useEffect(() => {
    const previous = previousGraph.current;
    const nextEvents: TimelineEvent[] = [];

    AGENT_NAMES.forEach((agentName) => {
      const status = agentGraph[agentName] ?? "idle";
      const previousStatus = previous?.[agentName] ?? "idle";

      if (status !== previousStatus && status !== "idle") {
        nextEvents.push({
          id: `${agentName}-${status}-${Date.now()}`,
          agentName,
          label: `${agentName} ${statusLabel[status]}`,
          status,
          time: new Intl.DateTimeFormat(undefined, {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }).format(new Date()),
        });
      }
    });

    if (nextEvents.length > 0) {
      setEvents((current) => [...current, ...nextEvents].slice(-18));
    }

    previousGraph.current = { ...agentGraph };
  }, [agentGraph]);

  return (
    <section className="rounded-3xl border border-white/10 bg-slate-950/55 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">
          <Clock3 className="size-4" aria-hidden="true" />
          Agent replay timeline
        </p>
        <span className="text-xs text-slate-500">read-only</span>
      </div>
      <div className="mt-3 max-h-56 space-y-2 overflow-auto pr-1">
        {events.length > 0 ? (
          events.map((event) => (
            <article
              key={event.id}
              className="grid grid-cols-[78px_1fr] gap-3 rounded-2xl border border-white/10 bg-white/[0.045] px-3 py-2 text-xs"
            >
              <span className="font-mono text-cyan-100">{event.time}</span>
              <span className="text-slate-300">{event.label}</span>
            </article>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-white/10 bg-slate-950/70 px-3 py-3 text-xs leading-5 text-slate-500">
            Start a run to replay agent start and finish events here.
          </p>
        )}
      </div>
    </section>
  );
}
