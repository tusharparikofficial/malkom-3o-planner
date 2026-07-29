import { useEffect, useRef, useState } from "react";
import type { DiagramDefinition } from "diagram-engine";
import { Card } from "@/components/ui/card";
import { DiagramViewer } from "@/components/shared/diagram-viewer";
import type { BlockProps } from "./renderer";

interface DiagramPayload {
  source: string;
  mermaid?: string;
  assetId?: string;
  libraryDiagramId?: string;
  caption?: string;
}

export function DiagramBlock({ block, embeds }: BlockProps) {
  const p = block.payload as unknown as DiagramPayload;

  if (p.source === "LIBRARY") {
    const diagram = p.libraryDiagramId ? embeds.diagrams[p.libraryDiagramId] : undefined;
    return (
      <Card>
        {diagram ? (
          <DiagramViewer definition={diagram.definition as DiagramDefinition} />
        ) : (
          <p className="text-sm text-slate-500">
            This diagram is no longer in the library — edit the block to pick another.
          </p>
        )}
        {(p.caption ?? diagram?.title) && (
          <p className="mt-2 text-center text-xs text-slate-500">{p.caption ?? diagram?.title}</p>
        )}
      </Card>
    );
  }

  return (
    <Card>
      {p.source === "MERMAID" ? (
        <MermaidDiagram id={block.id} source={p.mermaid ?? ""} />
      ) : (
        <img
          src={`/api/v1/assets/${p.assetId}`}
          alt={p.caption ?? "Diagram"}
          className="max-w-full"
        />
      )}
      {p.caption && <p className="mt-2 text-center text-xs text-slate-500">{p.caption}</p>}
    </Card>
  );
}

let mermaidReady: Promise<typeof import("mermaid")> | null = null;

function loadMermaid() {
  if (!mermaidReady) {
    mermaidReady = import("mermaid").then((m) => {
      m.default.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral" });
      return m;
    });
  }
  return mermaidReady;
}

function MermaidDiagram({ id, source }: { id: string; source: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    loadMermaid()
      .then(async (m) => {
        const { svg } = await m.default.render(`mmd-${id}`, source);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      })
      .catch(() => {
        if (!cancelled) setError("Diagram could not be rendered — check the Mermaid source.");
      });
    return () => {
      cancelled = true;
    };
  }, [id, source]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  return <div ref={ref} className="overflow-x-auto" />;
}
