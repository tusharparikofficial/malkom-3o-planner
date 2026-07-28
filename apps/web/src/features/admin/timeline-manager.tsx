import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Field, Input, Select } from "@/components/ui/field";
import { Dialog } from "@/components/ui/dialog";
import type { TimelinePhaseData } from "@/blocks/types";

const PHASE_STATUSES = ["PLANNED", "IN_PROGRESS", "DONE", "AT_RISK"] as const;
const MILESTONE_STATUSES = ["PLANNED", "IN_PROGRESS", "DONE", "AT_RISK", "SLIPPED"] as const;

const tone: Record<string, "success" | "primary" | "neutral" | "warn" | "danger"> = {
  DONE: "success",
  IN_PROGRESS: "primary",
  PLANNED: "neutral",
  AT_RISK: "warn",
  SLIPPED: "danger",
};

function dateInput(iso: string | undefined) {
  return iso ? iso.slice(0, 10) : "";
}

/** Structured editor for delivery phases and milestones (drives the Gantt). */
export function TimelineManager() {
  const { data } = useQuery({
    queryKey: ["timeline"],
    queryFn: () => api.get<TimelinePhaseData[]>("/timeline"),
  });
  const phases = data ?? [];
  const queryClient = useQueryClient();
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["timeline"] });
    void queryClient.invalidateQueries({ queryKey: ["page"] });
  };

  const [phaseEditor, setPhaseEditor] = useState<TimelinePhaseData | "new" | null>(null);
  const [milestoneEditor, setMilestoneEditor] = useState<
    { phase: TimelinePhaseData; milestoneId: string | null } | null
  >(null);

  const deletePhase = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/timeline/phases/${id}`),
    onSuccess: invalidate,
  });
  const deleteMilestone = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/timeline/milestones/${id}`),
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-4">
      {phases.map((phase) => (
        <Card key={phase.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">{phase.title}</h3>
              <Badge tone={tone[phase.status] ?? "neutral"}>
                {phase.status.replaceAll("_", " ").toLowerCase()}
              </Badge>
              <span className="tnum text-xs text-slate-400">
                {dateInput(phase.startDate)} → {dateInput(phase.endDate)}
              </span>
            </div>
            <div className="flex gap-1.5">
              <Button variant="ghost" size="sm" onClick={() => setPhaseEditor(phase)}>
                <Icon name="edit" className="text-base" /> Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMilestoneEditor({ phase, milestoneId: null })}
              >
                <Icon name="add" className="text-base" /> Milestone
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-500"
                onClick={() => {
                  if (window.confirm(`Delete phase "${phase.title}" and its milestones?`)) {
                    deletePhase.mutate(phase.id);
                  }
                }}
              >
                <Icon name="delete" className="text-base" />
              </Button>
            </div>
          </div>

          {phase.milestones.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-l-2 border-primary-soft pl-4">
              {phase.milestones.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex items-center gap-2 text-slate-700">
                    <Icon name="flag" className="text-base text-primary" />
                    {m.title}
                    <span className="tnum text-xs text-slate-400">{dateInput(m.dueDate)}</span>
                    <Badge tone={tone[m.status] ?? "neutral"}>
                      {m.status.replaceAll("_", " ").toLowerCase()}
                    </Badge>
                  </span>
                  <span className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Edit milestone"
                      className="rounded p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
                      onClick={() => setMilestoneEditor({ phase, milestoneId: m.id })}
                    >
                      <Icon name="edit" className="text-base" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete milestone"
                      className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600"
                      onClick={() => {
                        if (window.confirm(`Delete milestone "${m.title}"?`)) {
                          deleteMilestone.mutate(m.id);
                        }
                      }}
                    >
                      <Icon name="delete" className="text-base" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}

      <Button variant="outline" onClick={() => setPhaseEditor("new")}>
        <Icon name="add" className="text-base" /> New phase
      </Button>

      {phaseEditor && (
        <PhaseDialog
          phase={phaseEditor === "new" ? null : phaseEditor}
          order={phases.length}
          onClose={() => setPhaseEditor(null)}
          onChanged={invalidate}
        />
      )}
      {milestoneEditor && (
        <MilestoneDialog
          phase={milestoneEditor.phase}
          milestoneId={milestoneEditor.milestoneId}
          onClose={() => setMilestoneEditor(null)}
          onChanged={invalidate}
        />
      )}
    </div>
  );
}

function PhaseDialog({
  phase,
  order,
  onClose,
  onChanged,
}: {
  phase: TimelinePhaseData | null;
  order: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [title, setTitle] = useState(phase?.title ?? "");
  const [start, setStart] = useState(dateInput(phase?.startDate));
  const [end, setEnd] = useState(dateInput(phase?.endDate));
  const [status, setStatus] = useState(phase?.status ?? "PLANNED");

  const save = useMutation({
    mutationFn: () => {
      const data = { title, startDate: start, endDate: end, status };
      return phase
        ? api.patch(`/admin/timeline/phases/${phase.id}`, data)
        : api.post("/admin/timeline/phases", { ...data, order });
    },
    onSuccess: () => {
      onChanged();
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={phase ? "Edit phase" : "New phase"}>
      <div className="space-y-4">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="End">
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {PHASE_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ").toLowerCase()}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => save.mutate()}
            disabled={save.isPending || !title.trim() || !start || !end}
          >
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function MilestoneDialog({
  phase,
  milestoneId,
  onClose,
  onChanged,
}: {
  phase: TimelinePhaseData;
  milestoneId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const existing = phase.milestones.find((m) => m.id === milestoneId);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [due, setDue] = useState(dateInput(existing?.dueDate));
  const [status, setStatus] = useState(existing?.status ?? "PLANNED");

  const save = useMutation({
    mutationFn: () => {
      const data = { title, dueDate: due, status };
      return existing
        ? api.patch(`/admin/timeline/milestones/${existing.id}`, data)
        : api.post("/admin/timeline/milestones", {
            ...data,
            phaseId: phase.id,
            order: phase.milestones.length,
          });
    },
    onSuccess: () => {
      onChanged();
      onClose();
    },
  });

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onClose()}
      title={existing ? "Edit milestone" : `New milestone — ${phase.title}`}
    >
      <div className="space-y-4">
        <Field label="Title">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Due date">
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              {MILESTONE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ").toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || !title.trim() || !due}>
            Save
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
