import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { BlockRenderer, type BlockProps } from "./renderer";

const sentimentTone = {
  POSITIVE: "success",
  NEUTRAL: "neutral",
  NEGATIVE: "danger",
} as const;

export function ThemeGroupBlock({ block, embeds }: BlockProps) {
  const p = block.payload as { title: string; implication: string };
  return (
    <Card>
      <h3 className="text-lg font-semibold text-slate-900">{p.title}</h3>
      <p className="mt-1 text-sm text-slate-600">
        <span className="font-medium text-primary">Implication:</span> {p.implication}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {block.children.map((child) => (
          <BlockRenderer key={child.id} block={child} embeds={embeds} />
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
    sentiment: keyof typeof sentimentTone;
  };
  return (
    <div className="rounded border border-slate-200 bg-slate-50 p-4">
      <Icon name="format_quote" className="text-2xl text-primary" />
      <p className="mt-1 text-sm italic text-slate-700">“{p.text}”</p>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs font-medium text-slate-500">
          {p.personaName}
          {p.personaRole ? ` · ${p.personaRole}` : ""}
        </div>
        <Badge tone={sentimentTone[p.sentiment] ?? "neutral"}>{p.sentiment.toLowerCase()}</Badge>
      </div>
    </div>
  );
}
