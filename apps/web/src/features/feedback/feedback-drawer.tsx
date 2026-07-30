import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FEEDBACK_TYPES, type FeedbackEntryInput, type FeedbackType } from "@malkom/shared";
import { api } from "@/lib/api";
import { trackEvent } from "@/lib/analytics";
import { Sheet } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { Field, Select, Textarea } from "@/components/ui/field";

interface PageSummary {
  id: string;
  slug: string;
  title: string;
}

interface TargetData {
  page: { entityType: string; entityId: string; label: string };
  sections: {
    sectionId: string;
    title: string;
    items: { entityType: string; entityId: string; label: string }[];
  }[];
}

interface MyFeedback {
  id: string;
  type: string;
  message: string;
  status: string;
  createdAt: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Page the user is currently reading — the default target. */
  pageSlug: string;
}

const statusTone = {
  OPEN: "neutral",
  UNDER_REVIEW: "primary",
  ACCEPTED: "success",
  REJECTED: "danger",
  RESOLVED: "success",
} as const;

export function FeedbackDrawer({ open, onOpenChange, pageSlug }: Props) {
  const [tab, setTab] = useState<"new" | "mine">("new");
  // Target page defaults to the current one but can be changed freely, so
  // feedback on any page can be raised from anywhere.
  const [targetPage, setTargetPage] = useState(pageSlug);
  const [sectionId, setSectionId] = useState("");
  const [itemId, setItemId] = useState("");
  const [type, setType] = useState<FeedbackType>("GENERAL");
  const [message, setMessage] = useState("");
  const [batch, setBatch] = useState<{ entry: FeedbackEntryInput; label: string }[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    setTargetPage(pageSlug);
  }, [pageSlug]);

  const { data: pages } = useQuery({
    queryKey: ["pages"],
    queryFn: () => api.get<PageSummary[]>("/pages"),
    enabled: open,
  });

  const { data: targets } = useQuery({
    queryKey: ["feedback-targets", targetPage],
    queryFn: () => api.get<TargetData>(`/feedback/targets?page=${targetPage}`),
    enabled: open && Boolean(targetPage),
  });

  const { data: mine } = useQuery({
    queryKey: ["feedback-mine"],
    queryFn: () => api.get<MyFeedback[]>("/feedback/mine"),
    enabled: open && tab === "mine",
  });

  const submit = useMutation({
    mutationFn: (entries: FeedbackEntryInput[]) => api.post("/feedback", { entries }),
    onSuccess: (_data, entries) => {
      trackEvent({ type: "FEEDBACK_SUBMIT", pageSlug, meta: { count: entries.length } });
      setBatch([]);
      setMessage("");
      void queryClient.invalidateQueries({ queryKey: ["feedback-mine"] });
      setTab("mine");
    },
  });

  const section = targets?.sections.find((s) => s.sectionId === sectionId);
  const pageTitle =
    pages?.find((p) => p.slug === targetPage)?.title ?? targets?.page.label ?? targetPage;

  function changePage(slug: string) {
    setTargetPage(slug);
    setSectionId("");
    setItemId("");
  }

  function currentEntry(): { entry: FeedbackEntryInput; label: string } | null {
    if (!targets || message.trim().length < 10) return null;
    const item = section?.items.find((i) => i.entityId === itemId);
    const target = item
      ? { entityType: item.entityType, entityId: item.entityId, label: item.label }
      : section
        ? { entityType: "SECTION", entityId: section.sectionId, label: section.title }
        : { ...targets.page };
    return {
      entry: {
        entityType: target.entityType as FeedbackEntryInput["entityType"],
        entityId: target.entityId,
        type,
        message: message.trim(),
      },
      label: `${pageTitle} › ${target.label} · ${type.toLowerCase().replaceAll("_", " ")}`,
    };
  }

  function addToBatch() {
    const current = currentEntry();
    if (!current) return;
    setBatch([...batch, current]);
    setMessage("");
  }

  function handleSubmit() {
    const current = currentEntry();
    const entries = [...batch.map((b) => b.entry), ...(current ? [current.entry] : [])];
    if (entries.length === 0) return;
    submit.mutate(entries);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Feedback tracker">
      <div className="mb-4 flex gap-1 rounded bg-slate-100 p-1">
        {(["new", "mine"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded px-3 py-1.5 text-sm font-medium ${
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
            }`}
          >
            {t === "new" ? "New feedback" : "My feedback"}
          </button>
        ))}
      </div>

      {tab === "new" ? (
        <div className="space-y-4">
          <Field label="Page">
            <Select value={targetPage} onChange={(e) => changePage(e.target.value)}>
              {(pages ?? []).map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.title}
                  {p.slug === pageSlug ? " (current page)" : ""}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Section (optional)">
            <Select
              value={sectionId}
              onChange={(e) => {
                setSectionId(e.target.value);
                setItemId("");
              }}
            >
              <option value="">Whole page — {pageTitle}</option>
              {targets?.sections.map((s) => (
                <option key={s.sectionId} value={s.sectionId}>
                  {s.title}
                </option>
              ))}
            </Select>
          </Field>

          {section && section.items.length > 0 && (
            <Field label="Item (optional)">
              <Select value={itemId} onChange={(e) => setItemId(e.target.value)}>
                <option value="">Whole section</option>
                {section.items.map((i) => (
                  <option key={i.entityId} value={i.entityId}>
                    {i.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value as FeedbackType)}>
              {FEEDBACK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replaceAll("_", " ").toLowerCase()}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Your feedback (min 10 characters)">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What should change, and why?"
            />
          </Field>

          {batch.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase text-slate-400">
                Queued ({batch.length})
              </p>
              {batch.map((b, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded bg-slate-50 px-3 py-1.5 text-xs text-slate-600"
                >
                  <span className="truncate">{b.label}</span>
                  <button
                    type="button"
                    onClick={() => setBatch(batch.filter((_, j) => j !== i))}
                    aria-label="Remove"
                  >
                    <Icon name="close" className="text-sm text-slate-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {submit.isError && (
            <p className="text-sm text-red-600">Could not submit feedback. Please try again.</p>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={addToBatch} disabled={!currentEntry()}>
              <Icon name="add" className="text-base" /> Add another
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submit.isPending || (!currentEntry() && batch.length === 0)}
              className="flex-1"
            >
              {submit.isPending
                ? "Submitting…"
                : `Submit ${batch.length + (currentEntry() ? 1 : 0) || ""} feedback`}
            </Button>
          </div>

          <p className="text-xs leading-relaxed text-slate-400">
            Feedback can be raised for any page from here — switch the page above to comment on a
            section you are not currently viewing.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {(mine ?? []).length === 0 && (
            <p className="text-sm text-slate-500">You have not submitted any feedback yet.</p>
          )}
          {(mine ?? []).map((f) => (
            <div key={f.id} className="rounded border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <Badge tone="primary">{f.type.replaceAll("_", " ").toLowerCase()}</Badge>
                <Badge tone={statusTone[f.status as keyof typeof statusTone] ?? "neutral"}>
                  {f.status.replaceAll("_", " ").toLowerCase()}
                </Badge>
              </div>
              <p className="mt-2 text-sm text-slate-700">{f.message}</p>
              <p className="mt-1 text-xs text-slate-400">
                {new Date(f.createdAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </Sheet>
  );
}
