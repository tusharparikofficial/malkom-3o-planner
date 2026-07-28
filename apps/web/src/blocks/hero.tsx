import { Button } from "@/components/ui/button";
import type { BlockProps } from "./renderer";

export function HeroBlock({ block }: BlockProps) {
  const p = block.payload as { title: string; subtitle?: string; badge?: string };
  return (
    <div
      className="relative overflow-hidden rounded-2xl px-8 py-14 text-white shadow-card sm:px-12"
      style={{
        background:
          "linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-primary-hover) 55%, var(--brand-deep, #00405e) 100%)",
      }}
    >
      {/* decorative arcs — echo of the Capgemini spade curve */}
      <svg
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-32 h-[420px] w-[420px] opacity-20"
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="100" cy="100" r="98" stroke="white" strokeWidth="0.75" />
        <circle cx="100" cy="100" r="72" stroke="white" strokeWidth="0.75" />
        <circle cx="100" cy="100" r="46" stroke="white" strokeWidth="0.75" />
        <path d="M10 140 Q 100 60 190 120" stroke="white" strokeWidth="1" />
      </svg>
      <svg
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -left-20 h-[360px] w-[360px] opacity-10"
        viewBox="0 0 200 200"
        fill="none"
      >
        <circle cx="100" cy="100" r="90" stroke="white" strokeWidth="1" />
        <circle cx="100" cy="100" r="55" stroke="white" strokeWidth="1" />
      </svg>

      <div className="relative">
        {p.badge && (
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5 text-xs font-medium backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
            </span>
            {p.badge}
          </span>
        )}
        <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl">
          {p.title}
        </h1>
        {p.subtitle && (
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-white/80">{p.subtitle}</p>
        )}
      </div>
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
