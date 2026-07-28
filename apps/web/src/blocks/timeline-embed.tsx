import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import type { BlockProps } from "./renderer";

const statusTone = {
  DONE: "success",
  IN_PROGRESS: "primary",
  PLANNED: "neutral",
  AT_RISK: "warn",
  SLIPPED: "danger",
} as const;

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export function TimelineEmbedBlock({ embeds }: BlockProps) {
  if (embeds.timeline.length === 0) {
    return <Card className="text-sm text-slate-500">No timeline defined yet.</Card>;
  }
  return (
    <div className="space-y-4">
      {embeds.timeline.map((phase) => (
        <Card key={phase.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-slate-900">{phase.title}</h3>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">
                {formatDate(phase.startDate)} → {formatDate(phase.endDate)}
              </span>
              <Badge tone={statusTone[phase.status as keyof typeof statusTone] ?? "neutral"}>
                {phase.status.replaceAll("_", " ").toLowerCase()}
              </Badge>
            </div>
          </div>
          {phase.description && <p className="mt-1 text-sm text-slate-600">{phase.description}</p>}
          {phase.milestones.length > 0 && (
            <ul className="mt-3 space-y-2 border-l-2 border-primary-soft pl-4">
              {phase.milestones.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-1.5 text-slate-700">
                    <Icon name="flag" className="text-base text-primary" />
                    {m.title}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">{formatDate(m.dueDate)}</span>
                    <Badge tone={statusTone[m.status as keyof typeof statusTone] ?? "neutral"}>
                      {m.status.replaceAll("_", " ").toLowerCase()}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
