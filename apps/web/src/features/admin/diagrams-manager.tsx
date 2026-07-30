import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DIAGRAM_TYPES } from "@malkom/shared";
import { assertDiagramDefinition, type DiagramDefinition } from "diagram-engine";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { DiagramViewer } from "@/components/shared/diagram-viewer";
import { AiPromptEditor } from "./ai-prompt-editor";

interface DiagramListItem {
  id: string;
  title: string;
  description: string | null;
  diagramType: string;
  createdAt: string;
  updatedAt: string;
  createdBy: { name: string };
}

interface DiagramFull extends Omit<DiagramListItem, "createdBy"> {
  definition: unknown;
}

/**
 * Diagram library maintenance (SUPER_ADMIN only): list, AI-assisted create,
 * edit, and delete. Diagrams are embedded on pages via DIAGRAM blocks with
 * source = LIBRARY.
 */
export function DiagramsManager() {
  const queryClient = useQueryClient();
  const [editor, setEditor] = useState<{ id: string | null } | null>(null);

  const { data: diagrams } = useQuery({
    queryKey: ["library-diagrams"],
    queryFn: () => api.get<DiagramListItem[]>("/diagrams"),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["library-diagrams"] });
    void queryClient.invalidateQueries({ queryKey: ["page"] });
  };

  const remove = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/diagrams/${id}`),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      <AiPromptEditor />

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Diagrams live here once and render on any page via a Diagram block (source:
          library). Only Super Admins can create or change them.
        </p>
        <Button onClick={() => setEditor({ id: null })}>
          <Icon name="add" className="text-base" /> New diagram
        </Button>
      </div>

      {(diagrams ?? []).length === 0 && (
        <Card className="text-sm text-slate-500">
          No diagrams yet — create one with the AI generator or paste a definition.
        </Card>
      )}

      {(diagrams ?? []).map((d) => (
        <Card key={d.id} className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Icon name="account_tree" className="text-xl text-primary" />
              <span className="font-semibold text-slate-900">{d.title}</span>
              <Badge tone="primary">{d.diagramType}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-slate-400">
              {d.description ?? "No description"} · by {d.createdBy.name} · updated{" "}
              {new Date(d.updatedAt).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button variant="outline" size="sm" onClick={() => setEditor({ id: d.id })}>
              <Icon name="edit" className="text-base" /> Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500"
              onClick={() => {
                if (window.confirm(`Delete diagram "${d.title}"? Blocks embedding it will show a placeholder.`)) {
                  remove.mutate(d.id);
                }
              }}
            >
              <Icon name="delete" className="text-base" />
            </Button>
          </div>
        </Card>
      ))}

      {editor && (
        <DiagramEditorDialog
          diagramId={editor.id}
          onClose={() => setEditor(null)}
          onChanged={invalidate}
        />
      )}
    </div>
  );
}

export function DiagramEditorDialog({
  diagramId,
  onClose,
  onChanged,
  onSaved,
}: {
  diagramId: string | null;
  onClose: () => void;
  onChanged: () => void;
  /** Receives the diagram id after a successful save (used by the block editor). */
  onSaved?: (id: string) => void;
}) {
  const isNew = diagramId === null;
  const { data: existing } = useQuery({
    queryKey: ["library-diagram", diagramId],
    queryFn: () => api.get<DiagramFull>(`/diagrams/${diagramId}`),
    enabled: !isNew,
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [diagramType, setDiagramType] = useState<string>("overview");
  const [prompt, setPrompt] = useState("");
  const [definition, setDefinition] = useState<DiagramDefinition | null>(null);
  const [jsonText, setJsonText] = useState("");
  const [showJson, setShowJson] = useState(false);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  // hydrate once when editing an existing diagram
  if (!isNew && existing && !loaded) {
    setLoaded(true);
    setTitle(existing.title);
    setDescription(existing.description ?? "");
    setDiagramType(existing.diagramType);
    setDefinition(existing.definition as DiagramDefinition);
    setJsonText(JSON.stringify(existing.definition, null, 2));
  }

  const generate = useMutation({
    mutationFn: () =>
      api.post<{ definition: unknown }>("/admin/diagrams/generate", {
        prompt,
        diagramType,
        existingDefinition: definition ?? undefined,
        previousError: error ?? undefined,
      }),
    onSuccess: (data) => {
      setError(null);
      try {
        assertDiagramDefinition(data.definition);
        setDefinition(data.definition as DiagramDefinition);
        setJsonText(JSON.stringify(data.definition, null, 2));
        setRevision((r) => r + 1);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Generated diagram failed validation");
      }
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Generation failed"),
  });

  const save = useMutation({
    mutationFn: () => {
      const body = { title, description: description || undefined, diagramType, definition };
      return isNew
        ? api.post<{ id: string }>("/admin/diagrams", body)
        : api.patch<{ id: string }>(`/admin/diagrams/${diagramId}`, body);
    },
    onSuccess: (saved) => {
      onChanged();
      if (saved?.id) onSaved?.(saved.id);
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Save failed"),
  });

  function applyJson() {
    setError(null);
    try {
      const parsed = JSON.parse(jsonText);
      assertDiagramDefinition(parsed);
      setDefinition(parsed as DiagramDefinition);
      setRevision((r) => r + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid definition");
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={isNew ? "New diagram" : `Edit — ${existing?.title ?? "…"}`}
      className="max-w-4xl"
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <Field label="Type">
            <Select
              value={diagramType}
              onChange={(e) => setDiagramType(e.target.value)}
              disabled={!isNew && !!definition}
            >
              {DIAGRAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Description (optional)">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary-soft/40 p-4">
          <Field label={definition ? "Refine with AI" : "Describe the diagram — AI drafts it"}>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                definition
                  ? "e.g. add a caching layer between the API and the database"
                  : "e.g. high-level architecture: users hit a React SPA, which calls a Fastify API backed by Postgres; InstaSafe handles SSO"
              }
              className="min-h-[70px] bg-white"
            />
          </Field>
          <div className="mt-2 flex items-center gap-3">
            <Button
              size="sm"
              onClick={() => generate.mutate()}
              disabled={generate.isPending || prompt.trim().length < 10}
            >
              <Icon name="auto_awesome" className="text-base" />
              {generate.isPending
                ? "Generating…"
                : definition
                  ? "Regenerate / refine"
                  : "Generate diagram"}
            </Button>
            <button
              type="button"
              onClick={() => setShowJson(!showJson)}
              className="text-xs font-medium text-slate-400 hover:text-primary"
            >
              {showJson ? "Hide JSON" : "Edit JSON directly"}
            </button>
          </div>
        </div>

        {showJson && (
          <div>
            <Textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="min-h-[220px] font-mono text-xs"
            />
            <Button variant="outline" size="sm" className="mt-2" onClick={applyJson}>
              Validate & preview
            </Button>
          </div>
        )}

        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {definition && (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="border-b border-slate-100 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-500">
              Preview — drag nodes to fine-tune before saving
            </div>
            <DiagramViewer
              definition={definition}
              revision={revision}
              onDefinitionChange={(d) => {
                setDefinition(d);
                setJsonText(JSON.stringify(d, null, 2));
              }}
            />
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !title.trim() || !definition}
          >
            {save.isPending ? "Saving…" : "Save diagram"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
