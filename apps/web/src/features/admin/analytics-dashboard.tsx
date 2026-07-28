import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Summary {
  totalUsers: number;
  totalViews: number;
  pages: { pageSlug: string; views: number; avgDwellMs: number | null }[];
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  lastSeenAt: string | null;
  _count: { events: number; feedback: number };
}

interface UserDetail {
  user: { name: string; email: string };
  byPage: { pageSlug: string; type: string; _count: { _all: number }; _avg: { durationMs: number | null } }[];
  recent: { type: string; pageSlug: string; durationMs: number | null; createdAt: string }[];
}

function dwell(ms: number | null) {
  if (ms == null) return "—";
  return ms >= 60_000 ? `${(ms / 60_000).toFixed(1)} min` : `${Math.round(ms / 1000)}s`;
}

export function AnalyticsDashboard() {
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const { data: summary } = useQuery({
    queryKey: ["admin-analytics-summary"],
    queryFn: () => api.get<Summary>("/admin/analytics/summary"),
  });
  const { data: users } = useQuery({
    queryKey: ["admin-analytics-users"],
    queryFn: () => api.get<UserRow[]>("/admin/analytics/users"),
  });
  const { data: detail } = useQuery({
    queryKey: ["admin-analytics-user", selectedUser],
    queryFn: () => api.get<UserDetail>(`/admin/analytics/users/${selectedUser}`),
    enabled: Boolean(selectedUser),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Card className="text-center">
          <div className="text-3xl font-bold text-primary">{summary?.totalUsers ?? "—"}</div>
          <div className="mt-1 text-xs uppercase text-slate-500">Users</div>
        </Card>
        <Card className="text-center">
          <div className="text-3xl font-bold text-primary">{summary?.totalViews ?? "—"}</div>
          <div className="mt-1 text-xs uppercase text-slate-500">Page views</div>
        </Card>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left">
              <th className="px-4 py-2.5 font-semibold text-slate-700">Page</th>
              <th className="px-4 py-2.5 font-semibold text-slate-700">Views</th>
              <th className="px-4 py-2.5 font-semibold text-slate-700">Avg dwell</th>
            </tr>
          </thead>
          <tbody>
            {(summary?.pages ?? []).map((p) => (
              <tr key={p.pageSlug} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 text-slate-700">{p.pageSlug}</td>
                <td className="px-4 py-2 text-slate-600">{p.views}</td>
                <td className="px-4 py-2 text-slate-600">{dwell(p.avgDwellMs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div>
        <h3 className="mb-2 font-semibold text-slate-900">Per-user activity</h3>
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-left">
                <th className="px-4 py-2.5 font-semibold text-slate-700">User</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700">Role</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700">Events</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700">Feedback</th>
                <th className="px-4 py-2.5 font-semibold text-slate-700">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((u) => (
                <tr
                  key={u.id}
                  onClick={() => setSelectedUser(u.id === selectedUser ? null : u.id)}
                  className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 ${
                    selectedUser === u.id ? "bg-primary-soft/40" : ""
                  }`}
                >
                  <td className="px-4 py-2 text-slate-700">
                    {u.name} <span className="text-xs text-slate-400">{u.email}</span>
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone="primary">{u.role.replaceAll("_", " ").toLowerCase()}</Badge>
                  </td>
                  <td className="px-4 py-2 text-slate-600">{u._count.events}</td>
                  <td className="px-4 py-2 text-slate-600">{u._count.feedback}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString() : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {detail && (
        <Card>
          <h3 className="mb-3 font-semibold text-slate-900">
            {detail.user.name} — recent activity
          </h3>
          <div className="space-y-1">
            {detail.recent.map((e, i) => (
              <div key={i} className="flex justify-between text-sm text-slate-600">
                <span>
                  {e.type.replaceAll("_", " ").toLowerCase()} · {e.pageSlug}
                  {e.durationMs != null ? ` · ${dwell(e.durationMs)}` : ""}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(e.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
