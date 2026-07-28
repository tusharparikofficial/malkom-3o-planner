import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BlockRenderer } from "@/blocks/renderer";
import type { PageData, PageSection } from "@/blocks/types";

export function usePageData(slug: string) {
  return useQuery({
    queryKey: ["page", slug],
    queryFn: () => api.get<PageData>(`/pages/${slug}`),
  });
}

export function SectionView({ section, page }: { section: PageSection; page: PageData }) {
  return (
    <section className="space-y-4">
      {section.slug !== "hero" && (
        <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900">
          <span className="h-5 w-1 rounded-full bg-gradient-to-b from-primary to-primary-hover" />
          {section.title}
        </h2>
      )}
      {section.blocks.map((block) => (
        <BlockRenderer key={block.id} block={block} embeds={page.embeds} />
      ))}
    </section>
  );
}

export function PageView({ slug, sectionSlug }: { slug: string; sectionSlug?: string }) {
  const { data: page, isLoading, isError } = usePageData(slug);

  if (isLoading) return <div className="py-16 text-center text-slate-400">Loading page…</div>;
  if (isError || !page) {
    return <div className="py-16 text-center text-slate-500">This page could not be loaded.</div>;
  }

  const sections = sectionSlug
    ? page.sections.filter((s) => s.slug === sectionSlug)
    : page.sections;

  return (
    <div className="space-y-10">
      {sections.map((section) => (
        <SectionView key={section.id} section={section} page={page} />
      ))}
    </div>
  );
}
