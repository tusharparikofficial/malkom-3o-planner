import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { BlockProps } from "./renderer";
import type { TimelinePhaseData } from "./types";

/**
 * Clean Gantt chart for delivery phases.
 * Status colors validated for CVD + contrast (dataviz six checks):
 * DONE #16A34A · IN_PROGRESS #0070AD · AT_RISK #D97706 · SLIPPED #B91C1C.
 * PLANNED renders as an outlined (unfilled) bar — status is never color-alone:
 * every row carries a text chip, and a milestone table follows the chart.
 */

const STATUS = {
  DONE: { label: "Done", fill: "#16A34A", tone: "success" as const },
  IN_PROGRESS: { label: "In progress", fill: "#0070AD", tone: "primary" as const },
  PLANNED: { label: "Planned", fill: null, tone: "neutral" as const },
  AT_RISK: { label: "At risk", fill: "#D97706", tone: "warn" as const },
  SLIPPED: { label: "Slipped", fill: "#B91C1C", tone: "danger" as const },
};

type StatusKey = keyof typeof STATUS;

const DAY = 86_400_000;

function statusOf(key: string) {
  return STATUS[key as StatusKey] ?? STATUS.PLANNED;
}

function fmt(date: Date, withYear = false) {
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

function monthTicks(min: Date, max: Date) {
  const ticks: Date[] = [];
  const d = new Date(min.getFullYear(), min.getMonth(), 1);
  while (d <= max) {
    ticks.push(new Date(d));
    d.setMonth(d.getMonth() + 1);
  }
  return ticks;
}

export function TimelineEmbedBlock({ embeds }: BlockProps) {
  const phases = embeds.timeline;
  if (phases.length === 0) {
    return <Card className="text-sm text-slate-500">No timeline defined yet.</Card>;
  }

  const allDates = phases.flatMap((p) => [
    new Date(p.startDate).getTime(),
    new Date(p.endDate).getTime(),
    ...p.milestones.map((m) => new Date(m.dueDate).getTime()),
  ]);
  const rawMin = new Date(Math.min(...allDates));
  const rawMax = new Date(Math.max(...allDates));
  const min = new Date(rawMin.getFullYear(), rawMin.getMonth(), 1);
  const max = new Date(rawMax.getFullYear(), rawMax.getMonth() + 1, 1);
  const span = max.getTime() - min.getTime();
  const pct = (t: number) => ((t - min.getTime()) / span) * 100;

  const ticks = monthTicks(min, max);
  const today = Date.now();
  const todayVisible = today >= min.getTime() && today <= max.getTime();
  const usedStatuses = [
    ...new Set(phases.flatMap((p) => [p.status, ...p.milestones.map((m) => m.status)])),
  ] as StatusKey[];

  return (
    <Card className="space-y-5 overflow-hidden">
      {/* Legend — text label with every swatch, never color alone */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
        {usedStatuses.map((s) => {
          const cfg = statusOf(s);
          return (
            <span key={s} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-sm"
                style={
                  cfg.fill
                    ? { backgroundColor: cfg.fill }
                    : { border: "1.5px dashed #94a3b8", backgroundColor: "#fff" }
                }
              />
              {cfg.label}
            </span>
          );
        })}
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span className="h-3 w-px bg-slate-900" /> Today
        </span>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          {/* Month axis */}
          <div className="relative ml-56 h-6 border-b border-slate-200">
            {ticks.map((t) => (
              <span
                key={t.toISOString()}
                className="tnum absolute -translate-x-1/2 text-[11px] font-medium text-slate-400"
                style={{ left: `${pct(t.getTime())}%` }}
              >
                {t.toLocaleDateString(undefined, { month: "short" })}
                {t.getMonth() === 0 && ` '${String(t.getFullYear()).slice(2)}`}
              </span>
            ))}
          </div>

          {/* Rows */}
          <div className="relative">
            {/* recessive month gridlines */}
            <div className="pointer-events-none absolute inset-y-0 left-56 right-0">
              {ticks.map((t) => (
                <span
                  key={t.toISOString()}
                  className="absolute inset-y-0 w-px bg-slate-100"
                  style={{ left: `${pct(t.getTime())}%` }}
                />
              ))}
              {todayVisible && (
                <span
                  className="absolute inset-y-0 w-px bg-slate-900/70"
                  style={{ left: `${pct(today)}%` }}
                />
              )}
            </div>

            {phases.map((phase) => (
              <GanttRow key={phase.id} phase={phase} pct={pct} />
            ))}
          </div>
        </div>
      </div>

      <MilestoneTable phases={phases} />
    </Card>
  );
}

function GanttRow({ phase, pct }: { phase: TimelinePhaseData; pct: (t: number) => number }) {
  const cfg = statusOf(phase.status);
  const start = new Date(phase.startDate);
  const end = new Date(phase.endDate);
  const left = pct(start.getTime());
  const width = Math.max(pct(end.getTime()) - left, 1.5);
  const days = Math.round((end.getTime() - start.getTime()) / DAY);

  return (
    <div className="flex items-center border-b border-slate-50 py-3 last:border-0">
      {/* Row header: direct labels live here, in ink — not on the bar */}
      <div className="w-56 shrink-0 pr-4">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-900">{phase.title}</span>
          <Badge tone={cfg.tone}>{cfg.label}</Badge>
        </div>
        <div className="tnum mt-0.5 text-xs text-slate-400">
          {fmt(start)} – {fmt(end)} · {days}d
        </div>
      </div>

      {/* Track */}
      <div className="relative h-8 flex-1">
        <div
          className="group absolute top-1/2 h-3.5 -translate-y-1/2 cursor-default rounded-full transition-[height] hover:h-4"
          style={{
            left: `${left}%`,
            width: `${width}%`,
            ...(cfg.fill
              ? { backgroundColor: cfg.fill }
              : { border: "1.5px dashed #94a3b8", backgroundColor: "#fff" }),
          }}
        >
          <Tooltip>
            <strong>{phase.title}</strong> · {cfg.label}
            <br />
            {fmt(start, true)} → {fmt(end, true)}
          </Tooltip>
        </div>

        {/* Milestone diamonds — 2px surface ring so they read over bars */}
        {phase.milestones.map((m) => {
          const mCfg = statusOf(m.status);
          return (
            <div
              key={m.id}
              className="group absolute top-1/2 z-10 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rotate-45 cursor-default rounded-[3px] ring-2 ring-white transition-transform hover:scale-125"
              style={{
                left: `${pct(new Date(m.dueDate).getTime())}%`,
                backgroundColor: mCfg.fill ?? "#94a3b8",
              }}
            >
              <Tooltip unrotate>
                <strong>{m.title}</strong> · {mCfg.label}
                <br />
                Due {fmt(new Date(m.dueDate), true)}
              </Tooltip>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tooltip({ children, unrotate }: { children: React.ReactNode; unrotate?: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[240px] -translate-x-1/2 rounded-lg bg-slate-900 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 ${
        unrotate ? "-rotate-45" : ""
      }`}
    >
      {children}
    </div>
  );
}

/** Accessible table view of every milestone — the non-graphic reading of the chart. */
function MilestoneTable({ phases }: { phases: TimelinePhaseData[] }) {
  const rows = phases.flatMap((p) => p.milestones.map((m) => ({ phase: p.title, ...m })));
  if (rows.length === 0) return null;
  return (
    <details className="group">
      <summary className="cursor-pointer select-none text-xs font-medium text-slate-500 hover:text-primary">
        Milestone details ({rows.length})
      </summary>
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-400">
            <th className="py-2 pr-4 font-medium">Milestone</th>
            <th className="py-2 pr-4 font-medium">Phase</th>
            <th className="py-2 pr-4 font-medium">Due</th>
            <th className="py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const cfg = statusOf(r.status);
            return (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="py-2 pr-4 text-slate-700">{r.title}</td>
                <td className="py-2 pr-4 text-slate-500">{r.phase}</td>
                <td className="tnum py-2 pr-4 text-slate-500">{fmt(new Date(r.dueDate), true)}</td>
                <td className="py-2">
                  <Badge tone={cfg.tone}>{cfg.label}</Badge>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </details>
  );
}
