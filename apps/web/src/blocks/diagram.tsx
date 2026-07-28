import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import type { BlockProps } from "./renderer";

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

export function DiagramBlock({ block }: BlockProps) {
  const p = block.payload as { source: string; mermaid?: string; assetId?: string; caption?: string };
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (p.source !== "MERMAID" || !p.mermaid) return;
    let cancelled = false;
    loadMermaid()
      .then(async (m) => {
        const { svg } = await m.default.render(`mmd-${block.id}`, p.mermaid!);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      })
      .catch(() => {
        if (!cancelled) setError("Diagram could not be rendered — check the Mermaid source.");
      });
    return () => {
      cancelled = true;
    };
  }, [block.id, p.mermaid, p.source]);

  return (
    <Card>
      {p.source === "MERMAID" ? (
        error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <div ref={ref} className="overflow-x-auto" />
        )
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
