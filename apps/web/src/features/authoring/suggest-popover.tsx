import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { FEEDBACK_TYPES, type FeedbackType } from "@malkom/shared";
import { api } from "@/lib/api";
import type { BlockNode } from "@/blocks/types";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Field, Select, Textarea } from "@/components/ui/field";

const SUGGEST_TYPES: FeedbackType[] = FEEDBACK_TYPES.filter((t) => t !== "GENERAL");

function blockLabel(block: BlockNode): string {
  const p = block.payload as Record<string, unknown>;
  const title = (p.title as string) ?? (p.label as string) ?? (p.personaName as string);
  return title ? `“${String(title).slice(0, 48)}”` : block.kind.replaceAll("_", " ").toLowerCase();
}

/**
 * The Admin hover affordance: a small icon on any block that opens a quick
 * suggestion form. Submissions land in the feedback tracker (targeted at
 * exactly this block) and notify Super Admins.
 */
export function SuggestButton({ block }: { block: BlockNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Suggest a change on this item"
        aria-label="Suggest a change on this item"
        className="absolute -top-2.5 right-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 opacity-0 shadow-card transition-all hover:scale-105 hover:border-primary/40 hover:text-primary focus-visible:opacity-100 group-hover/suggest:opacity-100"
      >
        <Icon name="edit_note" className="text-lg" />
      </button>
      {open && <SuggestDialog block={block} onClose={() => setOpen(false)} />}
    </>
  );
}

function SuggestDialog({ block, onClose }: { block: BlockNode; onClose: () => void }) {
  const [type, setType] = useState<FeedbackType>("SUGGESTION");
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: () =>
      api.post("/feedback", {
        entries: [
          { entityType: "CONTENT_BLOCK", entityId: block.id, type, message: message.trim() },
        ],
      }),
    onSuccess: () => setDone(true),
  });

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={`Suggest a change — ${blockLabel(block)}`}
    >
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <Icon name="check" className="text-3xl text-green-700" />
          </span>
          <p className="font-medium text-slate-900">Suggestion sent</p>
          <p className="max-w-xs text-sm text-slate-500">
            The programme team has been notified and will review it in the feedback tracker.
          </p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as FeedbackType)}>
              {SUGGEST_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replaceAll("_", " ").toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Your suggestion (min 10 characters)">
            <Textarea
              autoFocus
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What should change on this item, and why?"
            />
          </Field>
          {submit.isError && (
            <p className="text-sm text-red-600">Could not send — please try again.</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={() => submit.mutate()}
              disabled={submit.isPending || message.trim().length < 10}
            >
              <Icon name="send" className="text-base" />
              {submit.isPending ? "Sending…" : "Send suggestion"}
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
