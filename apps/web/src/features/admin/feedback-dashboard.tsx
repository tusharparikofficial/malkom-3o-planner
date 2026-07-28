import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FEEDBACK_STATUSES } from "@malkom/shared";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/field";

interface AdminFeedback {
  id: string;
  type: string;
  status: string;
  message: string;
  entityType: string;
  createdAt: string;
  user: { name: string; email: string };
}

const statusTone = {
  OPEN: "neutral",
  UNDER_REVIEW: "primary",
  ACCEPTED: "success",
  REJECTED: "danger",
  RESOLVED: "success",
} as const;

export function FeedbackDashboard() {
  const [filter, setFilter] = useState("");
  const queryClient = useQueryClient();

  const { data: items } = useQuery({
    queryKey: ["admin-feedback", filter],
    queryFn: () =>
      api.get<AdminFeedback[]>(`/admin/feedback${filter ? `?status=${filter}` : ""}`),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/admin/feedback/${id}/status`, { status }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-feedback"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">All feedback</h2>
        <Select className="w-48" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {FEEDBACK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replaceAll("_", " ").toLowerCase()}
            </option>
          ))}
        </Select>
      </div>

      {(items ?? []).length === 0 && (
        <Card className="text-sm text-slate-500">No feedback yet.</Card>
      )}

      {(items ?? []).map((f) => (
        <Card key={f.id}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Badge tone="primary">{f.type.replaceAll("_", " ").toLowerCase()}</Badge>
              <Badge tone="neutral">{f.entityType.replaceAll("_", " ").toLowerCase()}</Badge>
              <Badge tone={statusTone[f.status as keyof typeof statusTone] ?? "neutral"}>
                {f.status.replaceAll("_", " ").toLowerCase()}
              </Badge>
            </div>
            <Select
              className="w-44"
              value={f.status}
              onChange={(e) => changeStatus.mutate({ id: f.id, status: e.target.value })}
            >
              {FEEDBACK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replaceAll("_", " ").toLowerCase()}
                </option>
              ))}
            </Select>
          </div>
          <p className="mt-2 text-sm text-slate-700">{f.message}</p>
          <p className="mt-1 text-xs text-slate-400">
            {f.user.name} ({f.user.email}) · {new Date(f.createdAt).toLocaleString()}
          </p>
        </Card>
      ))}
    </div>
  );
}
