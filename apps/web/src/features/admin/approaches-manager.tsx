import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import type { ApproachData } from "@/blocks/types";

/** Structured editor for approaches: options, criteria, and the score matrix. */
export function ApproachesManager() {
  const queryClient = useQueryClient();
  const { data: approaches } = useQuery({
    queryKey: ["approaches"],
    queryFn: () => api.get<ApproachData[]>("/approaches"),
  });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["approaches"] });
    void queryClient.invalidateQueries({ queryKey: ["page"] });
  };

  const createApproach = useMutation({
    mutationFn: () =>
      api.post("/admin/approaches", {
        title: "New approach",
        context: "Describe the decision context…",
        order: approaches?.length ?? 0,
      }),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-5">
      {(approaches ?? []).map((a) => (
        <ApproachEditor key={a.id} approach={a} onChanged={invalidate} />
      ))}
      <Button variant="outline" onClick={() => createApproach.mutate()}>
        <Icon name="add" className="text-base" /> New approach
      </Button>
      <p className="text-xs text-slate-400">
        Tip: embed an approach on any page via edit mode → Add block → Approach. Score cells and
        the comparison matrix are generated automatically for every option × criterion.
      </p>
    </div>
  );
}

function ApproachEditor({ approach, onChanged }: { approach: ApproachData; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [optionEditor, setOptionEditor] = useState<string | "new" | null>(null);

  const patch = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.patch(`/admin/approaches/${approach.id}`, data),
    onSuccess: onChanged,
  });
  const addCriterion = useMutation({
    mutationFn: () =>
      api.post("/admin/approaches/criteria", {
        approachId: approach.id,
        label: "New criterion",
        weight: 1,
        order: approach.criteria.length,
      }),
    onSuccess: onChanged,
  });
  const patchCriterion = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      api.patch(`/admin/approaches/criteria/${id}`, data),
    onSuccess: onChanged,
  });
  const deleteCriterion = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/approaches/criteria/${id}`),
    onSuccess: onChanged,
  });
  const patchScore = useMutation({
    mutationFn: ({ id, score }: { id: string; score: number | null }) =>
      api.patch(`/admin/approaches/scores/${id}`, { score }),
    onSuccess: onChanged,
  });
  const deleteOption = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/approaches/options/${id}`),
    onSuccess: onChanged,
  });

  const scoreFor = (criterionId: string, optionId: string) =>
    approach.options.find((o) => o.id === optionId)?.scores.find((s) => s.criterionId === criterionId);

  return (
    <Card className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{approach.title}</h3>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">{approach.context}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Icon name="edit" className="text-base" /> Edit
        </Button>
      </div>

      {/* Options */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700">Options</h4>
          <Button variant="ghost" size="sm" onClick={() => setOptionEditor("new")}>
            <Icon name="add" className="text-base" /> Add option
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {approach.options.map((o) => (
            <div key={o.id} className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium text-slate-800">{o.title}</span>
                {approach.recommendedOptionId === o.id && <Badge tone="primary">Recommended</Badge>}
              </div>
              <div className="mt-2 flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => setOptionEditor(o.id)}>
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    patch.mutate({
                      recommendedOptionId: approach.recommendedOptionId === o.id ? null : o.id,
                    })
                  }
                >
                  {approach.recommendedOptionId === o.id ? "Unrecommend" : "Recommend"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500"
                  onClick={() => {
                    if (window.confirm(`Delete option "${o.title}" and its scores?`)) {
                      deleteOption.mutate(o.id);
                    }
                  }}
                >
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Score matrix */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-slate-700">Score matrix (1–5, blank = to assess)</h4>
          <Button variant="ghost" size="sm" onClick={() => addCriterion.mutate()}>
            <Icon name="add" className="text-base" /> Add criterion
          </Button>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left">
                <th className="px-3 py-2 font-medium text-slate-500">Criterion / weight</th>
                {approach.options.map((o) => (
                  <th key={o.id} className="px-3 py-2 font-medium text-slate-700">
                    {o.title.split("—")[0]?.trim()}
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {approach.criteria.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <Input
                        defaultValue={c.label}
                        className="h-8 w-36 text-xs"
                        onBlur={(e) => {
                          if (e.target.value !== c.label && e.target.value.trim()) {
                            patchCriterion.mutate({ id: c.id, data: { label: e.target.value.trim() } });
                          }
                        }}
                      />
                      <Input
                        type="number"
                        min={1}
                        max={10}
                        defaultValue={c.weight}
                        className="h-8 w-16 text-xs"
                        title="Weight"
                        onBlur={(e) => {
                          const w = Number(e.target.value);
                          if (w !== c.weight && w >= 1) {
                            patchCriterion.mutate({ id: c.id, data: { weight: w } });
                          }
                        }}
                      />
                    </div>
                  </td>
                  {approach.options.map((o) => {
                    const score = scoreFor(c.id, o.id);
                    return (
                      <td key={o.id} className="px-3 py-2">
                        <Select
                          className="h-8 w-20 text-xs"
                          value={score?.score == null ? "" : String(score.score)}
                          onChange={(e) => {
                            if (!score) return;
                            patchScore.mutate({
                              id: score.id,
                              score: e.target.value === "" ? null : Number(e.target.value),
                            });
                          }}
                        >
                          <option value="">—</option>
                          {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </Select>
                      </td>
                    );
                  })}
                  <td className="px-2">
                    <button
                      type="button"
                      aria-label="Delete criterion"
                      className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600"
                      onClick={() => {
                        if (window.confirm(`Delete criterion "${c.label}"?`)) {
                          deleteCriterion.mutate(c.id);
                        }
                      }}
                    >
                      <Icon name="delete" className="text-base" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <ApproachDialog approach={approach} onClose={() => setEditing(false)} onChanged={onChanged} />
      )}
      {optionEditor && (
        <OptionDialog
          approach={approach}
          optionId={optionEditor === "new" ? null : optionEditor}
          onClose={() => setOptionEditor(null)}
          onChanged={onChanged}
        />
      )}
    </Card>
  );
}

function ApproachDialog({
  approach,
  onClose,
  onChanged,
}: {
  approach: ApproachData;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(approach.title);
  const [context, setContext] = useState(approach.context);
  const [rationale, setRationale] = useState(approach.rationale ?? "");

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/admin/approaches/${approach.id}`, {
        title,
        context,
        rationale: rationale || undefined,
      }),
    onSuccess: () => {
      onChanged();
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title="Edit approach">
      <div className="space-y-4">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Context">
          <Textarea value={context} onChange={(e) => setContext(e.target.value)} />
        </Field>
        <Field label="Recommendation rationale">
          <Textarea value={rationale} onChange={(e) => setRationale(e.target.value)} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function OptionDialog({
  approach,
  optionId,
  onClose,
  onChanged,
}: {
  approach: ApproachData;
  optionId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const existing = approach.options.find((o) => o.id === optionId);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [pros, setPros] = useState((existing?.pros ?? []).join("\n"));
  const [cons, setCons] = useState((existing?.cons ?? []).join("\n"));
  const [effort, setEffort] = useState(existing?.effort ? String(existing.effort) : "");
  const [risk, setRisk] = useState(existing?.risk ? String(existing.risk) : "");

  const save = useMutation({
    mutationFn: () => {
      const data = {
        title,
        description,
        pros: pros.split("\n").map((l) => l.trim()).filter(Boolean),
        cons: cons.split("\n").map((l) => l.trim()).filter(Boolean),
        effort: effort ? Number(effort) : undefined,
        risk: risk ? Number(risk) : undefined,
      };
      return existing
        ? api.patch(`/admin/approaches/options/${existing.id}`, data)
        : api.post("/admin/approaches/options", {
            ...data,
            approachId: approach.id,
            order: approach.options.length,
          });
    },
    onSuccess: () => {
      onChanged();
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={existing ? "Edit option" : "New option"}>
      <div className="space-y-4">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Option D — …" />
        </Field>
        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Pros (one per line)">
          <Textarea value={pros} onChange={(e) => setPros(e.target.value)} />
        </Field>
        <Field label="Cons (one per line)">
          <Textarea value={cons} onChange={(e) => setCons(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Effort (1–5)">
            <Input type="number" min={1} max={5} value={effort} onChange={(e) => setEffort(e.target.value)} />
          </Field>
          <Field label="Risk (1–5)">
            <Input type="number" min={1} max={5} value={risk} onChange={(e) => setRisk(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !title.trim()}>
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
