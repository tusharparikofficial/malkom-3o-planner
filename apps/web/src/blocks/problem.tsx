import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BlockProps } from "./renderer";

function severityTone(severity: number) {
  if (severity >= 4) return "danger" as const;
  if (severity === 3) return "warn" as const;
  return "neutral" as const;
}

export function ProblemStatementBlock({ block }: BlockProps) {
  const p = block.payload as {
    title: string;
    narrative: string;
    impact: string;
    severity: number;
    stakeholders: string[];
  };
  return (
    <Card>
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-lg font-semibold text-slate-900">{p.title}</h3>
        <Badge tone={severityTone(p.severity)}>Severity {p.severity}/5</Badge>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-700">{p.narrative}</p>
      <p className="mt-3 text-sm text-slate-700">
        <span className="font-semibold text-slate-900">Impact: </span>
        {p.impact}
      </p>
      {p.stakeholders.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
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
