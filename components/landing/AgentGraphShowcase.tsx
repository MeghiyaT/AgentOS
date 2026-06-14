"use client";

import {
  Background,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { Activity, CircleCheckBig } from "lucide-react";

import { GlassPanel } from "@/components/effects/GlassPanel";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import { AGENT_NAMES } from "@/lib/types/agent-contracts";
import type { AgentName } from "@/lib/types/agent-contracts";

const graphPositions: Record<AgentName, { x: number; y: number }> = {
  "Context Doctor": { x: 80, y: 80 },
  Planner: { x: 320, y: 80 },
  Research: { x: 160, y: 230 },
  Coding: { x: 480, y: 230 },
  Testing: { x: 320, y: 380 },
  Security: { x: 320, y: 530 },
  Evaluator: { x: 320, y: 680 },
};

function createShowcaseNode(agentName: AgentName, index: number): Node {
  const active = index < 4;

  return {
    id: agentName,
    position: graphPositions[agentName],
    draggable: false,
    data: {
      label: (
        <div
          className={`w-48 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-xl ${
            active
              ? "agent-node-running border-cyan-300/40 bg-cyan-300/10 text-cyan-50 shadow-cyan-950/30"
              : "border-white/10 bg-white/[0.045] text-slate-300 shadow-black/20"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">{agentName}</span>
            {active ? (
              <Activity className="size-4 text-cyan-200" aria-hidden="true" />
            ) : (
              <CircleCheckBig className="size-4 text-emerald-200" aria-hidden="true" />
            )}
          </div>
          <p className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-500">
            {active ? "active signal" : "ready"}
          </p>
        </div>
      ),
    },
    type: "default",
  };
}

const showcaseEdges: Edge[] = [
  { id: "context-planner", source: "Context Doctor", target: "Planner" },
  { id: "planner-research", source: "Planner", target: "Research" },
  { id: "planner-coding", source: "Planner", target: "Coding" },
  { id: "research-testing", source: "Research", target: "Testing" },
  { id: "coding-testing", source: "Coding", target: "Testing" },
  { id: "testing-security", source: "Testing", target: "Security" },
  { id: "security-evaluator", source: "Security", target: "Evaluator" },
].map((edge) => ({
  ...edge,
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed, color: "#06B6D4" },
  style: { stroke: "#06B6D4", strokeWidth: 1.8 },
}));

export function AgentGraphShowcase() {
  const nodes = AGENT_NAMES.map((agentName, index) =>
    createShowcaseNode(agentName, index),
  );

  return (
    <section className="relative z-10 px-5 py-24 sm:px-8 lg:px-12">
      <RevealOnScroll className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-violet-200">
              Agent graph
            </p>
            <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-slate-50 md:text-6xl">
              Watch autonomous work move through a living orchestration graph.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-slate-400">
            Animated edge particles, pulsing active agents, and status-aware
            nodes make the workflow readable from across the room.
          </p>
        </div>

        <GlassPanel className="h-[720px] p-3">
          <ReactFlow
            nodes={nodes}
            edges={showcaseEdges}
            fitView
            fitViewOptions={{ padding: 0.16 }}
            nodesDraggable={false}
            nodesConnectable={false}
            colorMode="dark"
            proOptions={{ hideAttribution: true }}
          >
            <Background color="#334155" gap={22} />
          </ReactFlow>
        </GlassPanel>
      </RevealOnScroll>
    </section>
  );
}
