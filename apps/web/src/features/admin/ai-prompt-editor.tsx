import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/field";

interface PromptState {
  prompt: string;
  default: string;
  isCustom: boolean;
}

/**
 * Lets Super Admins tune the instructions the AI follows when drafting
 * diagrams. Stored in the database and read by the generator on every run, so
 * changes take effect immediately with no redeploy.
 */
export function AiPromptEditor() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);

  const { data } = useQuery({
    queryKey: ["ai-prompt"],
    queryFn: () => api.get<PromptState>("/admin/ai-prompt"),
    enabled: open,
  });

  useEffect(() => {
    if (data) setDraft(data.prompt);
  }, [data]);

  const save = useMutation({
    mutationFn: (prompt: string) => api.post<PromptState>("/admin/ai-prompt", { prompt }),
    onSuccess: (result) => {
      queryClient.setQueryData(["ai-prompt"], result);
      setDraft(result.prompt);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const dirty = data ? draft !== data.prompt : false;

  return (
    <Card className="border-primary/20 bg-primary-soft/20">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 text-left"
      >
        <Icon name="auto_awesome" className="text-xl text-primary" />
        <span className="font-semibold text-slate-900">AI generation instructions</span>
        {data?.isCustom && <Badge tone="warn">customised</Badge>}
        <Icon
          name={open ? "expand_less" : "expand_more"}
          className="ml-auto text-xl text-slate-400"
        />
      </button>

      {!open && (
        <p className="mt-1 text-sm text-slate-600">
          Tune how the AI drafts diagrams — layout discipline, labelling style, node counts.
          Applies to every generation immediately.
        </p>
      )}

      {open && (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-slate-600">
            These instructions are sent to the model with every request. Edit them if diagrams
            come out cluttered, badly labelled, or in the wrong shape — then regenerate to compare.
          </p>
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="min-h-[420px] bg-white font-mono text-xs leading-relaxed"
            spellCheck={false}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => save.mutate(draft)} disabled={save.isPending || !dirty}>
              {save.isPending ? "Saving…" : "Save instructions"}
            </Button>
            <Button
              variant="outline"
              onClick={() => data && setDraft(data.default)}
              disabled={!data || draft === data.default}
            >
              Load default
            </Button>
            <Button
              variant="ghost"
              onClick={() => save.mutate("")}
              disabled={save.isPending || !data?.isCustom}
              title="Discard customisations and restore the built-in instructions"
            >
              Reset to default
            </Button>
            {dirty && <span className="text-xs text-amber-700">Unsaved changes</span>}
            {saved && <span className="text-xs text-green-700">Saved — next generation uses it</span>}
            {save.isError && (
              <span className="text-xs text-red-600">
                {save.error instanceof Error ? save.error.message : "Save failed"}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400">
            {draft.length.toLocaleString()} characters (max 40,000). Saving an empty box restores
            the default.
          </p>
        </div>
      )}
    </Card>
  );
}
