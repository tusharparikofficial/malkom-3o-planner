import { Card } from "@/components/ui/card";
import type { BlockProps } from "./renderer";

export function KpiStripBlock({ block, embeds }: BlockProps) {
  const p = block.payload as { metrics: { key: string; label?: string }[] };
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {p.metrics.map((m, i) => (
        <Card
          key={m.key}
          className="group relative animate-fade-up overflow-hidden py-5 text-center"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <span className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary to-primary-hover opacity-60 transition-opacity group-hover:opacity-100" />
          <div className="tnum text-3xl font-bold tracking-tight text-primary">
            {embeds.kpis[m.key] ?? "—"}
          </div>
          <div className="mt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {m.label ?? m.key}
          </div>
        </Card>
      ))}
    </div>
  );
}
