import { Card } from "@/components/ui/card";
import type { BlockProps } from "./renderer";

export function KpiStripBlock({ block, embeds }: BlockProps) {
  const p = block.payload as { metrics: { key: string; label?: string }[] };
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {p.metrics.map((m) => (
        <Card key={m.key} className="text-center">
          <div className="text-3xl font-bold text-primary">{embeds.kpis[m.key] ?? "—"}</div>
          <div className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
            {m.label ?? m.key}
          </div>
        </Card>
      ))}
    </div>
  );
}
