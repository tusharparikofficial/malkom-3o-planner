import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePageData } from "@/app/page-view";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";

const SENTIMENTS = ["POSITIVE", "NEUTRAL", "NEGATIVE"] as const;

/**
 * Lets Admins (and Super Admins) capture a customer voice without entering
 * edit mode — the common case on this page is adding one quote, not
 * restructuring the page. Admin submissions save as drafts and notify the
 * programme team; Super Admins publish immediately.
 */
export function AddVoiceButton() {
  const { hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  if (!hasRole("ADMIN")) return null;

  return (
    <>
      <Card className="flex flex-wrap items-center gap-3 border-primary/20 bg-primary-soft/30">
        <Icon name="record_voice_over" className="text-xl text-primary" />
        <span className="text-sm text-slate-700">
          Heard something from a customer or stakeholder? Add it straight to this page.
        </span>
        <Button size="sm" className="ml-auto" onClick={() => setOpen(true)}>
          <Icon name="add_comment" className="text-base" /> Add voice of customer
        </Button>
      </Card>
      {open && <AddVoiceDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function AddVoiceDialog({ onClose }: { onClose: () => void }) {
  const { hasRole } = useAuth();
  const isSuperAdmin = hasRole("SUPER_ADMIN");
  const queryClient = useQueryClient();
  const { data: page } = usePageData("voice-of-customer");

  const themes =
    page?.sections.flatMap((s) =>
      s.blocks
        .filter((b) => b.kind === "THEME_GROUP")
        .map((b) => ({
          id: b.id,
          sectionId: s.id,
          title: String((b.payload as { title?: string }).title ?? "Theme"),
          childCount: b.children.length,
        })),
    ) ?? [];

  const [themeId, setThemeId] = useState("");
  const [text, setText] = useState("");
  const [personaName, setPersonaName] = useState("");
  const [personaRole, setPersonaRole] = useState("");
  const [sentiment, setSentiment] = useState<(typeof SENTIMENTS)[number]>("NEUTRAL");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const theme = themes.find((t) => t.id === themeId) ?? themes[0];

  const save = useMutation({
    mutationFn: async () => {
      if (!theme) throw new Error("No theme available to file this under");
      const created = await api.post<{ id: string }>("/admin/blocks", {
        sectionId: theme.sectionId,
        parentId: theme.id,
        kind: "QUOTE",
        payload: {
          text: text.trim(),
          personaName: personaName.trim(),
          ...(personaRole.trim() ? { personaRole: personaRole.trim() } : {}),
          sentiment,
        },
        order: theme.childCount,
      });
      if (isSuperAdmin && created?.id) {
        await api.post(`/admin/blocks/${created.id}/publish`);
      }
      return created;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["page"] });
      setDone(true);
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Could not save"),
  });

  const valid = text.trim().length >= 10 && personaName.trim().length > 0 && Boolean(theme);

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Add voice of customer">
      {done ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
            <Icon name="check" className="text-3xl text-green-700" />
          </span>
          <p className="font-medium text-slate-900">
            {isSuperAdmin ? "Added to the page" : "Sent for review"}
          </p>
          <p className="max-w-xs text-sm text-slate-500">
            {isSuperAdmin
              ? "It is live under the selected theme."
              : "The programme team has been notified and will publish it after review."}
          </p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <Field label="Theme">
            <Select value={theme?.id ?? ""} onChange={(e) => setThemeId(e.target.value)}>
              {themes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="What they said (min 10 characters)">
            <Textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Quote it as closely as you can, in their words."
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Who said it">
              <Input
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                placeholder="Operations Director"
              />
            </Field>
            <Field label="Where they sit (optional)">
              <Input
                value={personaRole}
                onChange={(e) => setPersonaRole(e.target.value)}
                placeholder="Freight forwarder"
              />
            </Field>
          </div>
          <Field label="Sentiment">
            <Select
              value={sentiment}
              onChange={(e) => setSentiment(e.target.value as (typeof SENTIMENTS)[number])}
            >
              {SENTIMENTS.map((s) => (
                <option key={s} value={s}>
                  {s.toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending || !valid}>
              {save.isPending ? "Saving…" : isSuperAdmin ? "Add to page" : "Send for review"}
            </Button>
          </div>
          {!isSuperAdmin && (
            <p className="text-xs text-slate-400">
              Saved as a draft — the programme team is notified and publishes after review.
            </p>
          )}
        </div>
      )}
    </Dialog>
  );
}
