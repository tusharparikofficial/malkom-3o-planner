import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BlockProps } from "./renderer";

export function HeroBlock({ block }: BlockProps) {
  const p = block.payload as { title: string; subtitle?: string; badge?: string };
  return (
    <div className="rounded-lg bg-primary px-8 py-12 text-white">
      {p.badge && (
        <Badge tone="neutral" className="mb-4 bg-white/15 text-white">
          {p.badge}
        </Badge>
      )}
      <h1 className="text-3xl font-bold sm:text-4xl">{p.title}</h1>
      {p.subtitle && <p className="mt-3 max-w-3xl text-lg text-white/85">{p.subtitle}</p>}
    </div>
  );
}

export function CtaBlock({ block }: BlockProps) {
  const p = block.payload as { label: string; href: string; variant?: "primary" | "outline" };
  return (
    <a href={p.href}>
      <Button variant={p.variant ?? "primary"}>{p.label}</Button>
    </a>
  );
}
