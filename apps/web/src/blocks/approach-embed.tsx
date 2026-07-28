import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import type { ApproachData, ApproachOptionData } from "./types";
import type { BlockProps } from "./renderer";

export function ApproachEmbedBlock({ block, embeds }: BlockProps) {
  const p = block.payload as { approachId: string };
  const approach = embeds.approaches[p.approachId];
  if (!approach) {
    return <Card className="text-sm text-slate-500">Approach not found.</Card>;
  }
  return (
    <Card className="space-y-7 p-6 sm:p-7">
      <div>
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-soft to-white ring-1 ring-primary/10">
            <Icon name="alt_route" className="text-xl text-primary" />
          </span>
          <h3 className="text-xl font-semibold tracking-tight text-slate-900">{approach.title}</h3>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">{approach.context}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {approach.options.map((option, i) => (
          <div key={option.id} className="animate-fade-up" style={{ animationDelay: `${i * 70}ms` }}>
            <OptionCard option={option} recommended={option.id === approach.recommendedOptionId} />
          </div>
        ))}
      </div>

      <ComparisonMatrix approach={approach} />

      {approach.rationale && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/15 bg-primary-soft/60 p-4 text-sm leading-relaxed text-slate-800">
          <Icon name="verified" className="mt-0.5 text-xl text-primary" />
          <div>
            <span className="font-semibold text-primary">Recommendation rationale: </span>
            {approach.rationale}
          </div>
        </div>
      )}

      <Considerations approach={approach} />
    </Card>
  );
}

function OptionCard({ option, recommended }: { option: ApproachOptionData; recommended: boolean }) {
  return (
    <div
      className={`relative h-full rounded-xl p-5 transition-shadow hover:shadow-card-hover ${
        recommended
          ? "bg-gradient-to-b from-primary-soft/70 to-white ring-2 ring-primary/50"
          : "border border-slate-200/80 bg-white shadow-card"
      }`}
    >
      {recommended && (
        <span className="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
          <Icon name="star" className="text-sm" /> Recommended
        </span>
      )}
      <h4 className="pr-2 font-semibold leading-snug text-slate-900">{option.title}</h4>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{option.description}</p>

      <div className="mt-4 space-y-1.5">
        {option.pros.map((pro) => (
          <div key={pro} className="flex items-start gap-2 text-sm text-slate-700">
            <Icon name="add_circle" className="mt-0.5 text-base text-status-done" />
            {pro}
          </div>
        ))}
        {option.cons.map((con) => (
          <div key={con} className="flex items-start gap-2 text-sm text-slate-700">
            <Icon name="do_not_disturb_on" className="mt-0.5 text-base text-status-slipped" />
            {con}
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-4 border-t border-slate-100 pt-3">
        {option.effort != null && <MiniMeter label="Effort" value={option.effort} />}
        {option.risk != null && <MiniMeter label="Risk" value={option.risk} />}
      </div>
    </div>
  );
}

function MiniMeter({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2" aria-label={`${label} ${value} of 5`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className={`h-1.5 w-2.5 rounded-full ${i <= value ? "bg-slate-500" : "bg-slate-200"}`}
          />
        ))}
      </span>
      <span className="tnum text-xs font-medium text-slate-500">{value}/5</span>
    </div>
  );
}

function ComparisonMatrix({ approach }: { approach: ApproachData }) {
  if (approach.criteria.length === 0) return null;
  const scoreFor = (criterionId: string, optionId: string) =>
    approach.options
      .find((o) => o.id === optionId)
      ?.scores.find((s) => s.criterionId === criterionId)?.score ?? null;

  const weightedTotal = (optionId: string) => {
    let total = 0;
    let hasAny = false;
    for (const c of approach.criteria) {
      const s = scoreFor(c.id, optionId);
      if (s != null) {
        total += s * c.weight;
        hasAny = true;
      }
    }
    return hasAny ? total : null;
  };
  const maxTotal = approach.criteria.reduce((sum, c) => sum + 5 * c.weight, 0);
  const totals = approach.options.map((o) => weightedTotal(o.id));
  const bestTotal = Math.max(...totals.filter((t): t is number => t != null), 0);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200/80">
      <div className="flex items-center gap-2 border-b border-slate-200/80 bg-slate-50/80 px-4 py-3">
        <Icon name="table_chart" className="text-lg text-primary" />
        <h4 className="text-sm font-semibold text-slate-900">Comparison matrix</h4>
        <span className="ml-auto text-xs text-slate-400">weighted, 1–5 per criterion</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left">
              <th className="px-4 py-2.5 font-medium text-slate-500">Criterion</th>
              {approach.options.map((o) => (
                <th key={o.id} className="px-4 py-2.5 font-semibold text-slate-700">
                  {o.title.split("—")[0]?.trim()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {approach.criteria.map((c) => (
              <tr key={c.id} className="border-b border-slate-50 even:bg-slate-50/40">
                <td className="px-4 py-2.5 text-slate-700">
                  {c.label}{" "}
                  <span className="tnum rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500">
                    ×{c.weight}
                  </span>
                </td>
                {approach.options.map((o) => {
                  const score = scoreFor(c.id, o.id);
                  return (
                    <td key={o.id} className="px-4 py-2.5">
                      {score == null ? (
                        <span className="text-xs italic text-slate-400">to assess</span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <ScoreDots score={score} />
                          <span className="tnum text-xs font-medium text-slate-500">{score}</span>
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t border-slate-200 bg-slate-50/80">
              <td className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Weighted total <span className="tnum font-normal normal-case">/ {maxTotal}</span>
              </td>
              {approach.options.map((o, i) => {
                const total = totals[i];
                const isBest = total != null && total === bestTotal && bestTotal > 0;
                return (
                  <td key={o.id} className="px-4 py-3">
                    {total == null ? (
                      <span className="text-xs italic text-slate-400">—</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span
                          className={`tnum text-base font-bold ${isBest ? "text-primary" : "text-slate-700"}`}
                        >
                          {total}
                        </span>
                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                          <span
                            className="block h-full rounded-full bg-primary"
                            style={{ width: `${(total / maxTotal) * 100}%` }}
                          />
                        </span>
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScoreDots({ score }: { score: number }) {
  return (
    <span className="flex gap-0.5" aria-label={`Score ${score} of 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full ${i <= score ? "bg-primary" : "bg-slate-200"}`}
        />
      ))}
    </span>
  );
}

const considerationStyle: Record<string, { icon: string; color: string }> = {
  CONSTRAINT: { icon: "lock", color: "#64748B" },
  DEPENDENCY: { icon: "link", color: "#0070AD" },
  ASSUMPTION: { icon: "psychology", color: "#7C3AED" },
  RISK: { icon: "warning", color: "#D97706" },
};

function Considerations({ approach }: { approach: ApproachData }) {
  if (approach.considerations.length === 0) return null;
  return (
    <div>
      <h4 className="mb-3 text-sm font-semibold text-slate-900">Considerations</h4>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {approach.considerations.map((c) => {
          const style = considerationStyle[c.kind] ?? { icon: "info", color: "#64748B" };
          return (
            <div
              key={c.id}
              className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 text-sm leading-relaxed text-slate-700 shadow-card"
            >
              <span
                className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ backgroundColor: `${style.color}14`, color: style.color }}
              >
                <Icon name={style.icon} className="text-base" />
              </span>
              <div>
                <span
                  className="mr-1.5 text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: style.color }}
                >
                  {c.kind}
                </span>
                {c.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
