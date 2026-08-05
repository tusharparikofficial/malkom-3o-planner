import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { BlockRenderer } from "@/blocks/renderer";
import type { BlockNode, PageData, PageSection } from "@/blocks/types";
import { useEditMode } from "@/features/authoring/edit-mode";
import { SectionIdContext } from "@/features/authoring/section-context";
import { BlockShell } from "@/features/authoring/block-shell";
import { AddBlockButton } from "@/features/authoring/add-block";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";

export function usePageData(slug: string) {
  const { editMode } = useEditMode();
  return useQuery({
    queryKey: ["page", slug, editMode],
    queryFn: () => api.get<PageData>(`/pages/${slug}${editMode ? "?preview=1" : ""}`),
  });
}

export function SectionView({ section, page }: { section: PageSection; page: PageData }) {
  const { editMode } = useEditMode();
  return (
    <SectionIdContext.Provider value={section.id}>
      <section className="space-y-4">
        {section.slug !== "hero" && (
          <div>
            <h2 className="flex items-center gap-2.5 text-xl font-semibold tracking-tight text-slate-900">
              <span className="h-5 w-1 rounded-full bg-gradient-to-b from-primary to-primary-hover" />
              {section.title}
            </h2>
            {section.description && (
              <p className="mt-1 pl-3.5 text-sm text-slate-500">{section.description}</p>
            )}
          </div>
        )}
        {section.blocks.map((block, i) => (
          <BlockShell
            key={block.id}
            block={block}
            sectionId={section.id}
            prev={i > 0 ? section.blocks[i - 1] : undefined}
            next={i < section.blocks.length - 1 ? section.blocks[i + 1] : undefined}
          >
            <BlockRenderer block={block} embeds={page.embeds} />
          </BlockShell>
        ))}
        {editMode && (
          <AddBlockButton sectionId={section.id} order={section.blocks.length} />
        )}
      </section>
    </SectionIdContext.Provider>
  );
}

function flattenBlocks(blocks: BlockNode[]): BlockNode[] {
  return blocks.flatMap((b) => [b, ...flattenBlocks(b.children)]);
}

/** Sticky bar shown in edit/contribute mode: draft count + publish-all. */
function EditBar({ page }: { page: PageData }) {
  const queryClient = useQueryClient();
  const { isSuperAdmin } = useEditMode();
  const drafts = page.sections.flatMap((s) => flattenBlocks(s.blocks)).filter((b) => b.status === "DRAFT");

  const publishAll = useMutation({
    mutationFn: async () => {
      for (const d of drafts) {
        await api.post(`/admin/blocks/${d.id}/publish`);
      }
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["page"] }),
  });

  return (
    <div className="sticky top-16 z-10 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/95 px-4 py-2.5 shadow-card backdrop-blur-sm lg:top-4">
      <Icon name="edit_note" className="text-xl text-amber-600" />
      <span className="text-sm text-amber-900">
        {isSuperAdmin ? (
          <>
            <strong>Edit mode</strong> — changes save as drafts.{" "}
            {drafts.length > 0
              ? `${drafts.length} draft block${drafts.length > 1 ? "s" : ""} on this page.`
              : "No unpublished drafts here."}
          </>
        ) : (
          <>
            <strong>Contribute mode</strong> — blocks you add are drafts; the programme team is
            notified and publishes after review. Use the ✎ icon on any item to suggest changes.
          </>
        )}
      </span>
      {isSuperAdmin && drafts.length > 0 && (
        <Button
          size="sm"
          className="ml-auto"
          onClick={() => publishAll.mutate()}
          disabled={publishAll.isPending}
        >
          <Icon name="publish" className="text-base" />
          {publishAll.isPending ? "Publishing…" : `Publish all (${drafts.length})`}
        </Button>
      )}
    </div>
  );
}

export function PageView({ slug, sectionSlug }: { slug: string; sectionSlug?: string }) {
  const { data: page, isLoading, isError } = usePageData(slug);
  const { editMode } = useEditMode();

  if (isLoading) return <div className="py-16 text-center text-slate-400">Loading page…</div>;
  if (isError || !page) {
    return <div className="py-16 text-center text-slate-500">This page could not be loaded.</div>;
  }

  const sections = sectionSlug
    ? page.sections.filter((s) => s.slug === sectionSlug)
    : page.sections;

  return (
    <div className="space-y-10">
      {editMode && <EditBar page={page} />}
      {sections.map((section) => (
        <SectionView key={section.id} section={section} page={page} />
      ))}
    </div>
  );
}
