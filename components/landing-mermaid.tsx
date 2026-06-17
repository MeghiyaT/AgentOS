"use client";

import mermaid from "mermaid";
import { useEffect, useId, useRef, useState } from "react";

interface MermaidDiagramProps {
  chart: string;
  className?: string;
}

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const diagramId = useId().replaceAll(":", "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      theme: "dark",
      themeVariables: {
        background: "transparent",
        primaryColor: "#0f172a",
        primaryTextColor: "#f8fafc",
        primaryBorderColor: "#38bdf8",
        lineColor: "#64748b",
        secondaryColor: "#111827",
        tertiaryColor: "#1e293b",
        clusterBkg: "#020617",
        clusterBorder: "#334155",
        fontFamily: "Geist, sans-serif",
      },
    });

    async function renderDiagram() {
      try {
        const { svg } = await mermaid.render(`agentos-${diagramId}`, chart);

        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = svg;
          setError(null);
        }
      } catch (renderError: unknown) {
        if (!isMounted) {
          return;
        }

        setError(
          renderError instanceof Error
            ? renderError.message
            : "Unable to render architecture diagram."
        );
      }
    }

    void renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [chart, diagramId]);

  return (
    <div className={className}>
      {error ? (
        <pre className="overflow-auto rounded-md border border-red-400/30 bg-red-950/40 p-3 text-xs text-red-100">
          {error}
        </pre>
      ) : (
        <div
          ref={containerRef}
          aria-label="Agent orchestration architecture diagram"
          className="[&_svg]:h-auto [&_svg]:max-h-[260px] [&_svg]:w-full"
        />
      )}
    </div>
  );
}
