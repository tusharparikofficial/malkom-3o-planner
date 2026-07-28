import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import type { BlockProps } from "./renderer";

function severityColor(severity: number) {
  if (severity >= 4) return "#B91C1C";
  if (severity === 3) return "#D97706";
  return "#64748B";
}

export function ProblemStatementBlock({ block }: BlockProps) {
  const p = block.payload as {
    title: string;
    narrative: string;
    impact: string;
    severity: number;
    stakeholders: string[];
  };
  const color = severityColor(p.severity);

  return (
    <Card className="hover:shadow-card-hover">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: `${color}14` }}
          >
            <Icon name="report_problem" className="text-xl" />
          </span>
          <h3 className="text-lg font-semibold text-slate-900">{p.title}</h3>
        </div>
        <div className="shrink-0 text-right">
          <div className="flex gap-1" aria-label={`Severity ${p.severity} of 5`}>
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className="h-1.5 w-4 rounded-full"
                style={{ backgroundColor: i <= p.severity ? color : "#E2E8F0" }}
              />
            ))}
          </div>
          <span className="tnum mt-1 block text-[11px] font-medium text-slate-400">
            severity {p.severity}/5
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-slate-700">{p.narrative}</p>

      <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50/70 px-4 py-3 text-sm text-slate-700">
        <span className="font-semibold text-slate-900">Impact: </span>
        {p.impact}
      </div>

      {p.stakeholders.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-1.5">
          <Icon name="group" className="mr-1 text-base text-slate-400" />
          {p.stakeholders.map((s) => (
            <Badge key={s} tone="primary">
              {s}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
