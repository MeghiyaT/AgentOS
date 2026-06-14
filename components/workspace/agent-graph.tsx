"use client";

import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";

import { AGENT_NAMES } from "@/lib/types/agent-contracts";
import type { AgentName, AgentStatus } from "@/lib/types/agent-contracts";

interface AgentGraphProps {
  agentGraph: Record<string, AgentStatus>;
}

const positions: Record<AgentName, { x: number; y: number }> = {
  "Context Doctor": { x: 20, y: 120 },
  Planner: { x: 230, y: 120 },
  Research: { x: 440, y: 20 },
  Coding: { x: 440, y: 220 },
  Testing: { x: 650, y: 120 },
  Security: { x: 860, y: 120 },
  Evaluator: { x: 1070, y: 120 },
};

const edges: Edge[] = [
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
  markerEnd: {
    type: MarkerType.ArrowClosed,
    color: "#38bdf8",
  },
  style: {
    stroke: "#38bdf8",
    strokeWidth: 1.5,
  },
}));

const statusClasses: Record<AgentStatus, string> = {
  idle: "border-slate-700 bg-slate-950 text-slate-400",
  running: "border-sky-300 bg-sky-950 text-sky-100 shadow-[0_0_28px_rgba(56,189,248,0.28)]",
  complete: "border-emerald-300 bg-emerald-950 text-emerald-100",
  error: "border-red-300 bg-red-950 text-red-100",
};

export function AgentGraph({ agentGraph }: AgentGraphProps) {
  const nodes: Node[] = AGENT_NAMES.map((agentName) => {
    const status = agentGraph[agentName] ?? "idle";

    return {
      id: agentName,
      position: positions[agentName],
      data: {
        label: (
          <div
            className={`w-36 rounded-md border px-3 py-2 ${statusClasses[status]}`}
          >
            <p className="text-sm font-semibold leading-5">{agentName}</p>
            <p className="mt-1 text-xs uppercase">{status}</p>
          </div>
        ),
      },
      type: "default",
      draggable: false,
      selectable: false,
    };
  });

  return (
    <div className="h-full min-h-[360px] overflow-hidden rounded-md border border-slate-800 bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.18 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        colorMode="dark"
      >
        <Background color="#334155" gap={18} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
