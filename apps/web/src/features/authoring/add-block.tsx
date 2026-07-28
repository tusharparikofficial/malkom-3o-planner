import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/dialog";
import { useEditMode } from "./edit-mode";
import { BlockEditorDialog, type EditorMode } from "./block-editor-dialog";
import { CHILD_KIND_META, TOP_LEVEL_KINDS } from "./block-form-config";

interface Props {
  sectionId: string;
  parentId?: string;
  /** When set (group children), restricts the palette to these kinds. */
  kinds?: string[];
  order: number;
  compact?: boolean;
}

/** "+ Add block" affordance with a kind palette; opens the editor pre-filled. */
export function AddBlockButton({ sectionId, parentId, kinds, order, compact }: Props) {
  const { editMode } = useEditMode();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [editor, setEditor] = useState<EditorMode | null>(null);

  if (!editMode) return null;

  const palette = kinds
    ? kinds.map((k) => ({ kind: k, ...(CHILD_KIND_META[k] ?? { label: k, icon: "widgets" }) }))
    : TOP_LEVEL_KINDS;

  function pick(kind: string) {
    setPaletteOpen(false);
    setEditor({ type: "create", sectionId, parentId, kind, order });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className={
          compact
            ? "inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-3 py-1 text-xs font-medium text-slate-400 transition-colors hover:border-primary hover:text-primary"
            : "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 py-4 text-sm font-medium text-slate-400 transition-colors hover:border-primary/50 hover:text-primary"
        }
      >
        <Icon name="add" className={compact ? "text-sm" : "text-lg"} />
        Add {parentId ? "item" : "block"}
      </button>

      <Dialog
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        title={parentId ? "Add item" : "Add block"}
      >
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {palette.map((p) => (
            <button
              key={p.kind}
              type="button"
              onClick={() => pick(p.kind)}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 p-4 text-xs font-medium text-slate-600 transition-all hover:border-primary/40 hover:bg-primary-soft/40 hover:text-primary"
            >
              <Icon name={p.icon} className="text-2xl text-primary" />
              {p.label}
            </button>
          ))}
        </div>
      </Dialog>

      {editor && <BlockEditorDialog mode={editor} onClose={() => setEditor(null)} />}
    </>
  );
}
