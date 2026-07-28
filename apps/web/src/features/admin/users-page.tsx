import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ROLES } from "@malkom/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/field";

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
  lastSeenAt: string | null;
  _count: { feedback: number };
}

export function UsersPage() {
  const { user: me } = useAuth();
  const queryClient = useQueryClient();

  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get<AdminUser[]>("/admin/users"),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      api.patch(`/admin/users/${id}/role`, { role }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-left">
            <th className="px-4 py-2.5 font-semibold text-slate-700">User</th>
            <th className="px-4 py-2.5 font-semibold text-slate-700">Feedback</th>
            <th className="px-4 py-2.5 font-semibold text-slate-700">Last seen</th>
            <th className="px-4 py-2.5 font-semibold text-slate-700">Role</th>
          </tr>
        </thead>
        <tbody>
          {(users ?? []).map((u) => (
            <tr key={u.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-2 text-slate-700">
                {u.name} <span className="text-xs text-slate-400">{u.email}</span>
              </td>
              <td className="px-4 py-2 text-slate-600">{u._count.feedback}</td>
              <td className="px-4 py-2 text-slate-600">
                {u.lastSeenAt ? new Date(u.lastSeenAt).toLocaleString() : "—"}
              </td>
              <td className="px-4 py-2">
                <Select
                  className="w-40"
                  value={u.role}
                  disabled={u.id === me?.id}
                  onChange={(e) => changeRole.mutate({ id: u.id, role: e.target.value })}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.replaceAll("_", " ").toLowerCase()}
                    </option>
                  ))}
                </Select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
