import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Icon } from "@/components/ui/icon";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface NotificationItem {
  id: string;
  type: string;
  message: string;
  readAt: string | null;
  createdAt: string;
  actor: { name: string };
}

const TYPE_ICON: Record<string, string> = {
  BLOCK_ADDED: "post_add",
  FEEDBACK_SUBMITTED: "rate_review",
};

/** Sidebar notifications row with unread badge; opens the inbox dialog. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<{ items: NotificationItem[]; unread: number }>("/notifications"),
    refetchInterval: 30_000,
  });

  const markAllRead = useMutation({
    mutationFn: () => api.post("/notifications/read-all"),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unread = data?.unread ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
      >
        <span className="relative">
          <Icon name="notifications" className="text-xl" />
          {unread > 0 && (
            <span className="tnum absolute -right-1.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </span>
        Notifications
      </button>

      <Dialog open={open} onOpenChange={setOpen} title="Notifications">
        <div className="space-y-2">
          {(data?.items ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-slate-500">
              Nothing yet — you'll see contributions and feedback from the team here.
            </p>
          )}
          {(data?.items ?? []).map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                n.readAt ? "border-slate-100 opacity-70" : "border-primary/20 bg-primary-soft/30"
              }`}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft">
                <Icon name={TYPE_ICON[n.type] ?? "info"} className="text-lg text-primary" />
              </span>
              <div className="min-w-0">
                <p className="text-sm leading-snug text-slate-700">{n.message}</p>
                <p className="mt-0.5 text-xs text-slate-400">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {unread > 0 && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
              >
                Mark all as read
              </Button>
            </div>
          )}
        </div>
      </Dialog>
    </>
  );
}
