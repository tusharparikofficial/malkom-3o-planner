import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { BlockShell } from "@/features/authoring/block-shell";
import { useSectionId } from "@/features/authoring/section-context";
import { BlockRenderer, type BlockProps } from "./renderer";

const columnClasses: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function GridGroupBlock({ block, embeds }: BlockProps) {
  const p = block.payload as { title?: string; columns: number };
  const sectionId = useSectionId();
  return (
    <div>
      {p.title && <h3 className="mb-3 text-lg font-semibold text-slate-900">{p.title}</h3>}
      <div className={`grid grid-cols-1 gap-4 ${columnClasses[p.columns] ?? "sm:grid-cols-2"}`}>
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
    </div>
  );
}

export function StatBlock({ block }: BlockProps) {
  const p = block.payload as { label: string; value: string; icon?: string; trend?: string };
  return (
    <Card className="flex h-full items-center gap-4 hover:shadow-card-hover">
      {p.icon && (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-soft to-white ring-1 ring-primary/10">
          <Icon name={p.icon} className="text-2xl text-primary" />
        </span>
      )}
      <div>
        <div className="tnum text-2xl font-bold tracking-tight text-slate-900">{p.value}</div>
        <div className="text-sm text-slate-500">{p.label}</div>
        {p.trend && <div className="text-xs text-slate-400">{p.trend}</div>}
      </div>
    </Card>
  );
}

export function CardBlock({ block }: BlockProps) {
  const p = block.payload as { title: string; body: string; icon?: string; href?: string };
  const isLink = Boolean(p.href);
  const inner = (
    <Card
      className={`group h-full ${isLink ? "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover" : ""} transition-all`}
    >
      <div className="flex items-start gap-4">
        {p.icon && (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-soft to-white ring-1 ring-primary/10 transition-transform group-hover:scale-105">
            <Icon name={p.icon} className="text-2xl text-primary" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="flex items-center justify-between gap-2 font-semibold text-slate-900">
            {p.title}
            {isLink && (
              <Icon
                name="arrow_forward"
                className="text-lg text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-primary"
              />
            )}
          </h4>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{p.body}</p>
        </div>
      </div>
    </Card>
  );
  return isLink ? <Link to={p.href!}>{inner}</Link> : inner;
}

export function ListItemBlock({ block }: BlockProps) {
  const p = block.payload as { text: string; icon?: string };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-card">
      {p.icon && <Icon name={p.icon} className="text-xl text-status-done" />}
      <span className="text-sm font-medium text-slate-700">{p.text}</span>
    </div>
  );
}

export function BlueprintBlockView({ block }: BlockProps) {
  const p = block.payload as { title: string; description: string; layer: string; icon?: string };
  return (
    <Card className="group relative h-full overflow-hidden hover:shadow-card-hover">
      <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary-hover to-primary" />
      <div className="mb-2 flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          {p.icon && (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft">
              <Icon name={p.icon} className="text-xl text-primary" />
            </span>
          )}
          <h4 className="font-semibold text-slate-900">{p.title}</h4>
        </div>
        <Badge tone="primary">{p.layer}</Badge>
      </div>
      <p className="text-sm leading-relaxed text-slate-600">{p.description}</p>
    </Card>
  );
}
