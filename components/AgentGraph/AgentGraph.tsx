"use client";

import {
  Background,
  Controls,
  MarkerType,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import { CheckCircle2, Circle, Loader2, ShieldAlert, XCircle } from "lucide-react";

import { AGENT_NAMES } from "@/lib/types/agent-contracts";
import type { AgentName, AgentStatus } from "@/lib/types/agent-contracts";

interface AgentGraphProps {
  agentGraph: Record<string, AgentStatus>;
  onSelectAgent: (agentName: AgentName) => void;
}

const positions: Record<AgentName, { x: number; y: number }> = {
  "Context Doctor": { x: 260, y: 0 },
  Planner: { x: 260, y: 120 },
  Research: { x: 40, y: 240 },
  Coding: { x: 480, y: 240 },
  Testing: { x: 260, y: 360 },
  Security: { x: 260, y: 480 },
  Evaluator: { x: 260, y: 600 },
};

const workflowEdges: Edge[] = [
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
    stroke: "#06B6D4",
    strokeWidth: 1.8,
    filter: "drop-shadow(0 0 8px rgba(6,182,212,0.38))",
  },
}));

const nodeChrome: Record<AgentStatus, string> = {
  idle: "border-white/10 bg-slate-950/80 text-slate-400 shadow-[0_0_18px_rgba(148,163,184,0.06)]",
  running:
    "agent-node-running border-cyan-300 bg-cyan-950/80 text-cyan-50 shadow-[0_0_34px_rgba(6,182,212,0.34)]",
  complete:
    "border-emerald-300 bg-emerald-950/80 text-emerald-50 shadow-[0_0_34px_rgba(34,197,94,0.26)]",
  error:
    "border-red-300 bg-red-950/85 text-red-50 shadow-[0_0_34px_rgba(239,68,68,0.34)]",
};

function StatusIcon({ status }: { status: AgentStatus }) {
  if (status === "running") {
    return <Loader2 className="size-4 animate-spin text-sky-200" aria-hidden="true" />;
  }

  if (status === "complete") {
    return (
      <CheckCircle2 className="size-4 text-emerald-200" aria-hidden="true" />
    );
  }

  if (status === "error") {
    return <XCircle className="size-4 text-red-200" aria-hidden="true" />;
  }

  return <Circle className="size-4 text-slate-500" aria-hidden="true" />;
}

function createNode(agentName: AgentName, status: AgentStatus): Node {
  return {
    id: agentName,
    position: positions[agentName],
    data: {
      label: (
        <div
          data-agent-node={agentName}
          data-status={status}
          className={`group relative w-52 rounded-2xl border px-4 py-3 backdrop-blur-xl transition-[border-color,box-shadow,background-color,color,transform] duration-300 hover:-translate-y-1 ${nodeChrome[status]}`}
        >
          {status === "running" ? (
            <span className="pointer-events-none absolute inset-0 rounded-2xl border border-cyan-200/20" />
          ) : null}
          <span
            role="tooltip"
            data-agent-tooltip={agentName}
            className="pointer-events-none absolute left-1/2 top-[-38px] z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-xl border border-white/10 bg-slate-950/95 px-3 py-1.5 text-xs text-slate-200 shadow-lg group-hover:block"
          >
            {agentName}: {status}
          </span>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold leading-5">{agentName}</p>
            <StatusIcon status={status} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em]">{status}</p>
            {agentName === "Security" ? (
              <ShieldAlert className="size-3.5 opacity-70" aria-hidden="true" />
            ) : null}
          </div>
        </div>
      ),
    },
    draggable: false,
    selectable: true,
    type: "default",
  };
}

function isAgentName(value: string): value is AgentName {
  return AGENT_NAMES.some((agentName) => agentName === value);
}

export function AgentGraph({ agentGraph, onSelectAgent }: AgentGraphProps) {
  const nodes = AGENT_NAMES.map((agentName) =>
    createNode(agentName, agentGraph[agentName] ?? "idle")
  );

  return (
    <div className="agentos-scanline h-full min-h-[620px] overflow-hidden rounded-[1.6rem] border border-white/10 bg-slate-950/75 shadow-inner shadow-black/40">
      <ReactFlow
        nodes={nodes}
        edges={workflowEdges}
        fitView
        fitViewOptions={{ padding: 0.16 }}
        nodesDraggable={false}
        nodesConnectable={false}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => {
          if (isAgentName(node.id)) {
            onSelectAgent(node.id);
          }
        }}
      >
        <Background color="#334155" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
