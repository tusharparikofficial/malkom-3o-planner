import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { BlockRenderer, type BlockProps } from "./renderer";

const columnClasses: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function GridGroupBlock({ block, embeds }: BlockProps) {
  const p = block.payload as { title?: string; columns: number };
  return (
    <div>
      {p.title && <h3 className="mb-3 text-lg font-semibold text-slate-900">{p.title}</h3>}
      <div className={`grid grid-cols-1 gap-4 ${columnClasses[p.columns] ?? "sm:grid-cols-2"}`}>
        {block.children.map((child) => (
          <BlockRenderer key={child.id} block={child} embeds={embeds} />
        ))}
      </div>
    </div>
  );
}

export function StatBlock({ block }: BlockProps) {
  const p = block.payload as { label: string; value: string; icon?: string; trend?: string };
  return (
    <Card className="flex items-center gap-4">
      {p.icon && <Icon name={p.icon} className="text-3xl text-primary" />}
      <div>
        <div className="text-2xl font-bold text-slate-900">{p.value}</div>
        <div className="text-sm text-slate-500">{p.label}</div>
        {p.trend && <div className="text-xs text-slate-400">{p.trend}</div>}
      </div>
    </Card>
  );
}

export function CardBlock({ block }: BlockProps) {
  const p = block.payload as { title: string; body: string; icon?: string; href?: string };
  const inner = (
    <Card className="h-full transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        {p.icon && (
          <span className="rounded bg-primary-soft p-2">
            <Icon name={p.icon} className="text-2xl text-primary" />
          </span>
        )}
        <div>
          <h4 className="font-semibold text-slate-900">{p.title}</h4>
          <p className="mt-1 text-sm text-slate-600">{p.body}</p>
        </div>
      </div>
    </Card>
  );
  return p.href ? <Link to={p.href}>{inner}</Link> : inner;
}

export function ListItemBlock({ block }: BlockProps) {
  const p = block.payload as { text: string; icon?: string };
  return (
    <div className="flex items-center gap-2 rounded border border-slate-200 bg-white px-4 py-3">
      {p.icon && <Icon name={p.icon} className="text-xl text-primary" />}
      <span className="text-sm text-slate-700">{p.text}</span>
    </div>
  );
}

export function BlueprintBlockView({ block }: BlockProps) {
  const p = block.payload as { title: string; description: string; layer: string; icon?: string };
  return (
    <Card className="h-full border-t-4 border-t-primary">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {p.icon && <Icon name={p.icon} className="text-2xl text-primary" />}
          <h4 className="font-semibold text-slate-900">{p.title}</h4>
        </div>
        <Badge tone="primary">{p.layer}</Badge>
      </div>
      <p className="text-sm text-slate-600">{p.description}</p>
    </Card>
  );
}
