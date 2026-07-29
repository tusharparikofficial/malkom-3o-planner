import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { validateBlockPayload, type BlockKind } from "@malkom/shared";
import { api } from "@/lib/api";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { BLOCK_FORMS, KIND_DEFAULTS, type FieldDef } from "./block-form-config";
import { useEditMode } from "./edit-mode";

export type EditorMode =
  | { type: "create"; sectionId: string; parentId?: string; kind: string; order: number }
  | { type: "edit"; blockId: string; kind: string; payload: Record<string, unknown> };

interface Props {
  mode: EditorMode;
  onClose: () => void;
}

function toFormValues(kind: string, payload: Record<string, unknown>): Record<string, string> {
  const fields = BLOCK_FORMS[kind] ?? [];
  const out: Record<string, string> = {};
  for (const f of fields) {
    const value = payload[f.name];
    if (f.type === "stringlist") {
      if (kind === "KPI_STRIP" && f.name === "metrics") {
        out[f.name] = ((value as { key: string; label?: string }[]) ?? [])
          .map((m) => (m.label ? `${m.key} | ${m.label}` : m.key))
          .join("\n");
      } else {
        out[f.name] = ((value as string[]) ?? []).join("\n");
      }
    } else {
      out[f.name] = value == null ? "" : String(value);
    }
  }
  return out;
}

function fromFormValues(
  kind: string,
  values: Record<string, string>,
  base: Record<string, unknown>,
): Record<string, unknown> {
  const fields = BLOCK_FORMS[kind] ?? [];
  const payload: Record<string, unknown> = { ...base };
  for (const f of fields) {
    const raw = (values[f.name] ?? "").trim();
    if (f.type === "stringlist") {
      const lines = raw.split("\n").map((l) => l.trim()).filter(Boolean);
      if (kind === "KPI_STRIP" && f.name === "metrics") {
        payload[f.name] = lines.map((line) => {
          const [key, label] = line.split("|").map((s) => s.trim());
          return label ? { key, label } : { key };
        });
      } else {
        payload[f.name] = lines;
      }
    } else if (f.type === "number") {
      payload[f.name] = raw === "" ? undefined : Number(raw);
    } else if (kind === "GRID_GROUP" && f.name === "columns") {
      payload[f.name] = Number(raw);
    } else {
      payload[f.name] = raw === "" ? undefined : raw;
    }
  }
  return payload;
}

export function BlockEditorDialog({ mode, onClose }: Props) {
  const kind = mode.kind;
  const hasForm = (BLOCK_FORMS[kind] ?? []).length > 0;
  const initialPayload =
    mode.type === "edit"
      ? mode.payload
      : ((KIND_DEFAULTS[kind] ?? {}) as Record<string, unknown>);

  const [values, setValues] = useState(() => toFormValues(kind, initialPayload));
  const [rawJson, setRawJson] = useState(() => JSON.stringify(initialPayload, null, 2));
  const [useJson, setUseJson] = useState(!hasForm);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const save = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      if (mode.type === "create") {
        return api.post("/admin/blocks", {
          sectionId: mode.sectionId,
          parentId: mode.parentId,
          kind,
          payload,
          order: mode.order,
        });
      }
      return api.patch(`/admin/blocks/${mode.blockId}`, { payload });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["page"] });
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : "Save failed"),
  });

  function handleSave() {
    setError(null);
    let payload: Record<string, unknown>;
    if (useJson) {
      try {
        payload = JSON.parse(rawJson);
      } catch {
        setError("Invalid JSON — fix the syntax and try again.");
        return;
      }
    } else {
      payload = fromFormValues(kind, values, mode.type === "edit" ? {} : {});
    }
    const parsed = validateBlockPayload(kind as BlockKind, payload);
    if (!parsed.success) {
      setError(parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "));
      return;
    }
    save.mutate(parsed.data as Record<string, unknown>);
  }

  const title = `${mode.type === "create" ? "Add" : "Edit"} ${kind.replaceAll("_", " ").toLowerCase()}`;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={title} className="max-w-xl">
      <div className="space-y-4">
        {hasForm && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setUseJson(!useJson)}
              className="text-xs font-medium text-slate-400 hover:text-primary"
            >
              {useJson ? "← Form editor" : "Edit as JSON →"}
            </button>
          </div>
        )}

        {useJson ? (
          <Field label="Payload (JSON)">
            <Textarea
              value={rawJson}
              onChange={(e) => setRawJson(e.target.value)}
              className="min-h-[260px] font-mono text-xs"
            />
          </Field>
        ) : (
          (BLOCK_FORMS[kind] ?? [])
            .filter((f) => !f.showWhen || values[f.showWhen.field] === f.showWhen.value)
            .map((f) => (
              <EditorField
                key={f.name}
                field={f}
                value={values[f.name] ?? ""}
                onChange={(v) => setValues((prev) => ({ ...prev, [f.name]: v }))}
              />
            ))
        )}

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {save.isPending ? "Saving…" : mode.type === "create" ? "Add as draft" : "Save draft"}
          </Button>
        </div>
        <SaveNote />
      </div>
    </Dialog>
  );
}

function SaveNote() {
  const { isSuperAdmin } = useEditMode();
  return (
    <p className="text-xs text-slate-400">
      {isSuperAdmin ? (
        <>
          Saves as a <strong>draft</strong> — publish it from the block toolbar to make it visible
          to viewers.
        </>
      ) : (
        <>
          Saves as a <strong>draft</strong> — the programme team is notified and will review,
          adjust if needed, and publish it.
        </>
      )}
    </p>
  );
}

function EditorField({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: string;
  onChange: (v: string) => void;
}) {
  const approaches = useQuery({
    queryKey: ["approaches"],
    queryFn: () => api.get<{ id: string; title: string }[]>("/approaches"),
    enabled: field.type === "approach",
  });
  const diagrams = useQuery({
    queryKey: ["library-diagrams"],
    queryFn: () =>
      api.get<{ id: string; title: string; diagramType: string }[]>("/diagrams"),
    enabled: field.type === "librarydiagram",
  });

  const control = useMemo(() => {
    switch (field.type) {
      case "textarea":
      case "markdown":
      case "stringlist":
        return (
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={field.type === "markdown" ? "min-h-[180px] font-mono text-xs" : ""}
          />
        );
      case "number":
        return (
          <Input
            type="number"
            min={field.min}
            max={field.max}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case "select":
        return (
          <Select value={value} onChange={(e) => onChange(e.target.value)}>
            {(field.options ?? []).map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        );
      case "approach":
        return (
          <Select value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select an approach…</option>
            {(approaches.data ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.title}
              </option>
            ))}
          </Select>
        );
      case "librarydiagram":
        return (
          <Select value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">Select a diagram…</option>
            {(diagrams.data ?? []).map((d) => (
              <option key={d.id} value={d.id}>
                {d.title} ({d.diagramType})
              </option>
            ))}
          </Select>
        );
      case "icon":
        return (
          <div className="flex items-center gap-2">
            <Input
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="e.g. insights — names from fonts.google.com/icons"
            />
            {value && (
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                <Icon name={value} className="text-xl text-primary" />
              </span>
            )}
          </div>
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
          />
        );
    }
  }, [field, value, onChange, approaches.data, diagrams.data]);

  return (
    <Field label={field.label}>
      {control}
      {field.help && <p className="mt-1 text-xs text-slate-400">{field.help}</p>}
    </Field>
  );
}
