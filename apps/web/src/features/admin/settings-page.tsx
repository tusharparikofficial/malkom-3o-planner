import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";

type SettingsMap = Record<string, unknown>;

const COLOR_FIELDS = [
  { key: "brand.primaryColor", label: "Primary color (Allports)" },
  { key: "brand.primaryHover", label: "Primary hover" },
  { key: "brand.primarySoft", label: "Primary soft (surfaces)" },
];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api.get<SettingsMap>("/admin/settings"),
  });

  const [form, setForm] = useState<SettingsMap>({});
  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const save = useMutation({
    mutationFn: (patch: SettingsMap) => api.patch<SettingsMap>("/admin/settings", patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
      void queryClient.invalidateQueries({ queryKey: ["settings", "public"] });
    },
  });

  function set(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    save.mutate(form);
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
      <Card className="space-y-4">
        <h3 className="font-semibold text-slate-900">Site</h3>
        <Field label="Site title">
          <Input
            value={String(form["site.title"] ?? "")}
            onChange={(e) => set("site.title", e.target.value)}
          />
        </Field>
        <Field label="Footer / analytics notice">
          <Textarea
            value={String(form["site.footerNotice"] ?? "")}
            onChange={(e) => set("site.footerNotice", e.target.value)}
          />
        </Field>
      </Card>

      <Card className="space-y-4">
        <h3 className="font-semibold text-slate-900">Brand colors</h3>
        <p className="text-xs text-slate-500">
          Applied at runtime — changes take effect for everyone on next page load, no redeploy.
        </p>
        {COLOR_FIELDS.map((f) => (
          <Field key={f.key} label={f.label}>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={String(form[f.key] ?? "#0070AD")}
                onChange={(e) => set(f.key, e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-slate-300"
                aria-label={f.label}
              />
              <Input
                value={String(form[f.key] ?? "")}
                onChange={(e) => set(f.key, e.target.value)}
                className="font-mono"
              />
            </div>
          </Field>
        ))}
      </Card>

      {save.isError && (
        <p className="text-sm text-red-600">Could not save settings. Check the values and retry.</p>
      )}
      {save.isSuccess && <p className="text-sm text-green-700">Settings saved.</p>}

      <Button type="submit" disabled={save.isPending}>
        {save.isPending ? "Saving…" : "Save settings"}
      </Button>
    </form>
  );
}
