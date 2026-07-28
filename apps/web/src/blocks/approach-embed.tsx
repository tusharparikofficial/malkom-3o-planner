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
    <Card className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-slate-900">{approach.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{approach.context}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {approach.options.map((option) => (
          <OptionCard
            key={option.id}
            option={option}
            recommended={option.id === approach.recommendedOptionId}
          />
        ))}
      </div>

      <ComparisonMatrix approach={approach} />

      {approach.rationale && (
        <div className="rounded border-l-4 border-primary bg-primary-soft p-4 text-sm text-slate-800">
          <span className="font-semibold">Recommendation rationale: </span>
          {approach.rationale}
        </div>
      )}

      <Considerations approach={approach} />
    </Card>
  );
}

function OptionCard({ option, recommended }: { option: ApproachOptionData; recommended: boolean }) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        recommended ? "border-primary bg-primary-soft/50" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-semibold text-slate-900">{option.title}</h4>
        {recommended && <Badge tone="primary">Recommended</Badge>}
      </div>
      <p className="mt-1 text-sm text-slate-600">{option.description}</p>
      <div className="mt-3 space-y-1">
        {option.pros.map((pro) => (
          <div key={pro} className="flex items-start gap-1.5 text-sm text-slate-700">
            <Icon name="add_circle" className="mt-0.5 text-base text-green-600" />
            {pro}
          </div>
        ))}
        {option.cons.map((con) => (
          <div key={con} className="flex items-start gap-1.5 text-sm text-slate-700">
            <Icon name="do_not_disturb_on" className="mt-0.5 text-base text-red-500" />
            {con}
          </div>
        ))}
      </div>
      <div className="mt-3 flex gap-2 text-xs text-slate-500">
        {option.effort != null && <Badge tone="neutral">Effort {option.effort}/5</Badge>}
        {option.risk != null && <Badge tone="neutral">Risk {option.risk}/5</Badge>}
      </div>
    </div>
  );
}

function ComparisonMatrix({ approach }: { approach: ApproachData }) {
  if (approach.criteria.length === 0) return null;
  const scoreFor = (criterionId: string, optionId: string) =>
    approach.options
      .find((o) => o.id === optionId)
      ?.scores.find((s) => s.criterionId === criterionId)?.score ?? null;

  return (
    <div className="overflow-x-auto">
      <h4 className="mb-2 font-semibold text-slate-900">Comparison matrix</h4>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-3 py-2 text-left font-semibold text-slate-700">Criterion</th>
            {approach.options.map((o) => (
              <th key={o.id} className="px-3 py-2 text-left font-semibold text-slate-700">
                {o.title.split("—")[0]?.trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {approach.criteria.map((c) => (
            <tr key={c.id} className="border-b border-slate-100 last:border-0">
              <td className="px-3 py-2 text-slate-700">
                {c.label} <span className="text-xs text-slate-400">(w{c.weight})</span>
              </td>
              {approach.options.map((o) => {
                const score = scoreFor(c.id, o.id);
                return (
                  <td key={o.id} className="px-3 py-2">
                    {score == null ? (
                      <span className="text-slate-400">to assess</span>
                    ) : (
                      <ScoreDots score={score} />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
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

const considerationIcons: Record<string, string> = {
  CONSTRAINT: "lock",
  DEPENDENCY: "link",
  ASSUMPTION: "psychology",
  RISK: "warning",
};

function Considerations({ approach }: { approach: ApproachData }) {
  if (approach.considerations.length === 0) return null;
  return (
    <div>
      <h4 className="mb-2 font-semibold text-slate-900">Considerations</h4>
      <div className="grid gap-2 sm:grid-cols-2">
        {approach.considerations.map((c) => (
          <div
            key={c.id}
            className="flex items-start gap-2 rounded border border-slate-200 p-3 text-sm text-slate-700"
          >
            <Icon
              name={considerationIcons[c.kind] ?? "info"}
              className="mt-0.5 text-base text-primary"
            />
            <div>
              <span className="mr-1.5 text-xs font-semibold uppercase text-slate-400">{c.kind}</span>
              {c.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
