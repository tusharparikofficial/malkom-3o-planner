import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { BlockShell } from "@/features/authoring/block-shell";
import { useSectionId } from "@/features/authoring/section-context";
import { BlockRenderer, type BlockProps } from "./renderer";

const sentiment = {
  POSITIVE: { tone: "success" as const, accent: "#16A34A" },
  NEUTRAL: { tone: "neutral" as const, accent: "#94A3B8" },
  NEGATIVE: { tone: "danger" as const, accent: "#B91C1C" },
};

export function ThemeGroupBlock({ block, embeds }: BlockProps) {
  const p = block.payload as { title: string; implication: string };
  const sectionId = useSectionId();
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-soft to-white ring-1 ring-primary/10">
          <Icon name="forum" className="text-xl text-primary" />
        </span>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{p.title}</h3>
          <p className="text-sm text-slate-600">
            <span className="font-medium text-primary">Implication: </span>
            {p.implication}
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {block.children.map((child, i) => (
          <div key={child.id} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
            <BlockShell
              block={child}
              sectionId={sectionId}
              prev={i > 0 ? block.children[i - 1] : undefined}
              next={i < block.children.length - 1 ? block.children[i + 1] : undefined}
            >
              <BlockRenderer block={child} embeds={embeds} />
            </BlockShell>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function QuoteBlock({ block }: BlockProps) {
  const p = block.payload as {
    text: string;
    personaName: string;
    personaRole?: string;
    sentiment: keyof typeof sentiment;
  };
  const cfg = sentiment[p.sentiment] ?? sentiment.NEUTRAL;
  return (
    <figure
      className="relative h-full overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/60 p-5"
      style={{ borderLeft: `3px solid ${cfg.accent}` }}
    >
      <Icon
        name="format_quote"
        className="pointer-events-none absolute -right-2 -top-3 select-none text-7xl text-slate-200/70"
      />
      <blockquote className="relative text-sm italic leading-relaxed text-slate-700">
        “{p.text}”
      </blockquote>
      <figcaption className="relative mt-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
            {p.personaName.charAt(0)}
          </span>
          <div className="text-xs">
            <div className="font-semibold text-slate-700">{p.personaName}</div>
            {p.personaRole && <div className="text-slate-400">{p.personaRole}</div>}
          </div>
        </div>
        <Badge tone={cfg.tone}>{p.sentiment.toLowerCase()}</Badge>
      </figcaption>
    </figure>
  );
}
