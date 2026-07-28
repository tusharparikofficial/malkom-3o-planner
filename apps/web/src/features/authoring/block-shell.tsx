import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { GROUP_CHILD_KINDS, type BlockKind } from "@malkom/shared";
import { api } from "@/lib/api";
import type { BlockNode } from "@/blocks/types";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useEditMode } from "./edit-mode";
import { BlockEditorDialog, type EditorMode } from "./block-editor-dialog";
import { AddBlockButton } from "./add-block";
import { SuggestButton } from "./suggest-popover";

interface Neighbor {
  id: string;
  order: number;
}

interface BlockShellProps {
  block: BlockNode;
  sectionId: string;
  prev?: Neighbor;
  next?: Neighbor;
  children: ReactNode;
}

/**
 * Role-aware wrapper around a rendered block:
 * - SUPER_ADMIN in edit mode → full toolbar (edit/move/publish/archive/history)
 * - ADMIN in contribute mode → edit toolbar on their OWN drafts, hover
 *   suggest icon on everything else
 * - ADMIN/SUPER_ADMIN outside edit mode → hover suggest icon
 * - VIEWER → plain content
 */
export function BlockShell({ block, sectionId, prev, next, children }: BlockShellProps) {
  const { editMode, canEdit, isSuperAdmin, userId } = useEditMode();
  const [editor, setEditor] = useState<EditorMode | null>(null);
  const [history, setHistory] = useState(false);
  const queryClient = useQueryClient();

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["page"] });

  const action = useMutation({
    mutationFn: ({ path, body }: { path: string; body?: unknown }) =>
      body !== undefined ? api.patch(path, body) : api.post(path),
    onSuccess: invalidate,
  });

  if (!canEdit) return <>{children}</>;

  const isDraft = block.status === "DRAFT";
  const ownDraft = isDraft && block.createdById === userId;

  // Admin (or anyone below full edit rights): hover suggest icon.
  if (!editMode || (!isSuperAdmin && !ownDraft)) {
    return (
      <div className="group/suggest relative">
        <SuggestButton block={block} />
        {children}
      </div>
    );
  }

  // Admin contribute mode on their own draft: edit-only toolbar.
  if (!isSuperAdmin) {
    return (
      <div className="relative rounded-xl ring-1 ring-amber-300">
        <div className="absolute -top-3.5 right-3 z-10 flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-1 shadow-card">
          <Badge tone="warn">pending review</Badge>
          <ToolButton
            icon="edit"
            label="Edit your draft"
            onClick={() =>
              setEditor({
                type: "edit",
                blockId: block.id,
                kind: block.kind,
                payload: block.payload as Record<string, unknown>,
              })
            }
          />
        </div>
        <div className="opacity-90">{children}</div>
        {editor && <BlockEditorDialog mode={editor} onClose={() => setEditor(null)} />}
      </div>
    );
  }

  const childKinds = GROUP_CHILD_KINDS[block.kind as BlockKind] ?? [];

  return (
    <div
      className={`relative rounded-xl ring-1 transition-shadow ${
        isDraft ? "ring-amber-300" : "ring-transparent hover:ring-primary/30"
      }`}
    >
      {/* toolbar */}
      <div className="absolute -top-3.5 right-3 z-10 flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1.5 py-1 shadow-card">
        <Badge tone={isDraft ? "warn" : "success"}>{isDraft ? "draft" : "live"}</Badge>
        <ToolButton
          icon="edit"
          label="Edit"
          onClick={() =>
            setEditor({ type: "edit", blockId: block.id, kind: block.kind, payload: block.payload as Record<string, unknown> })
          }
        />
        {prev && (
          <ToolButton
            icon="arrow_upward"
            label="Move up"
            onClick={() => {
              action.mutate({ path: `/admin/blocks/${block.id}`, body: { order: prev.order } });
              action.mutate({ path: `/admin/blocks/${prev.id}`, body: { order: block.order } });
            }}
          />
        )}
        {next && (
          <ToolButton
            icon="arrow_downward"
            label="Move down"
            onClick={() => {
              action.mutate({ path: `/admin/blocks/${block.id}`, body: { order: next.order } });
              action.mutate({ path: `/admin/blocks/${next.id}`, body: { order: block.order } });
            }}
          />
        )}
        {isDraft && (
          <ToolButton
            icon="publish"
            label="Publish"
            accent
            onClick={() => action.mutate({ path: `/admin/blocks/${block.id}/publish` })}
          />
        )}
        <ToolButton icon="history" label="History" onClick={() => setHistory(true)} />
        <ToolButton
          icon="archive"
          label="Archive"
          danger
          onClick={() => {
            if (window.confirm("Archive this block? It disappears from the page (history is kept).")) {
              action.mutate({ path: `/admin/blocks/${block.id}/archive` });
            }
          }}
        />
      </div>

      <div className={isDraft ? "opacity-90" : ""}>{children}</div>

      {/* add child for group blocks */}
      {childKinds.length > 0 && (
        <div className="mt-2 flex justify-center pb-1">
          <AddBlockButton
            sectionId={sectionId}
            parentId={block.id}
            kinds={childKinds}
            order={block.children.length}
            compact
          />
        </div>
      )}

      {editor && <BlockEditorDialog mode={editor} onClose={() => setEditor(null)} />}
      {history && <RevisionDialog blockId={block.id} onClose={() => setHistory(false)} />}
    </div>
  );
}

function ToolButton({
  icon,
  label,
  onClick,
  accent,
  danger,
}: {
  icon: string;
  label: string;
  onClick: () => void;
  accent?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`rounded-full p-1.5 transition-colors ${
        accent
          ? "text-primary hover:bg-primary-soft"
          : danger
            ? "text-slate-400 hover:bg-red-50 hover:text-red-600"
            : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      }`}
    >
      <Icon name={icon} className="text-base" />
    </button>
  );
}

interface Revision {
  id: string;
  kind: string;
  payload: unknown;
  status: string;
  note: string | null;
  createdAt: string;
  editedBy: { name: string };
}

function RevisionDialog({ blockId, onClose }: { blockId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: revisions } = useQuery({
    queryKey: ["revisions", blockId],
    queryFn: () => api.get<Revision[]>(`/admin/blocks/${blockId}/revisions`),
  });

  const revert = useMutation({
    mutationFn: (revisionId: string) =>
      api.post(`/admin/blocks/${blockId}/revert/${revisionId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["page"] });
      void queryClient.invalidateQueries({ queryKey: ["revisions", blockId] });
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Revision history">
      <div className="space-y-2">
        {(revisions ?? []).length === 0 && (
          <p className="text-sm text-slate-500">No previous versions yet — revisions are recorded on every edit.</p>
        )}
        {(revisions ?? []).map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2.5"
          >
            <div className="min-w-0 text-sm">
              <div className="font-medium text-slate-700">
                {new Date(r.createdAt).toLocaleString()}
                {r.note && <span className="ml-2 text-xs text-slate-400">({r.note})</span>}
              </div>
              <div className="truncate text-xs text-slate-400">
                by {r.editedBy.name} · was {r.status.toLowerCase()} ·{" "}
                {JSON.stringify(r.payload).slice(0, 80)}…
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => revert.mutate(r.id)}
              disabled={revert.isPending}
            >
              Restore
            </Button>
          </div>
        ))}
      </div>
    </Dialog>
  );
}
