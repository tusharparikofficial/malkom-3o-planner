import { useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";

const SSO_ERRORS: Record<string, string> = {
  saml_auth_failed: "SSO authentication failed. Please try again.",
  saml_no_identity: "SSO did not return your identity. Contact the administrator.",
};

export function LoginPage() {
  const settings = useSettings();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const ssoError = params.get("error");
  const siteTitle = String(settings?.settings["site.title"] ?? "MALKOM 3.0 MVP");

  async function handleDevLogin(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.post("/auth/dev-login", { email });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      navigate("/", { replace: true });
    } catch {
      setError("Dev login failed. Is the API running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background:
          "linear-gradient(160deg, var(--brand-primary) 0%, var(--brand-primary-hover) 45%, var(--brand-deep, #00405e) 100%)",
      }}
    >
      <Card className="w-full max-w-md animate-fade-up p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <span
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl font-bold text-white shadow-lg"
            style={{
              background:
                "linear-gradient(135deg, var(--brand-primary), var(--brand-deep, #00405e))",
            }}
          >
            M
          </span>
          <h1 className="text-xl font-semibold text-slate-900">{siteTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to view the programme plan</p>
        </div>

        {ssoError && (
          <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
            {SSO_ERRORS[ssoError] ?? "Sign-in failed. Please try again."}
          </p>
        )}

        {settings?.ssoEnabled && (
          <a href="/api/v1/auth/login" className="block">
            <Button className="w-full" size="lg">
              <Icon name="badge" className="text-xl" /> Sign in with InstaSafe SSO
            </Button>
          </a>
        )}

        {settings?.devLoginEnabled && (
          <form onSubmit={handleDevLogin} className="mt-4 space-y-3">
            {settings.ssoEnabled && (
              <p className="text-center text-xs uppercase text-slate-400">or (development only)</p>
            )}
            <Field label="Email (dev login)">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@wns.com"
              />
            </Field>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" variant="outline" className="w-full" disabled={busy}>
              {busy ? "Signing in…" : "Dev sign in"}
            </Button>
          </form>
        )}

        {!settings?.ssoEnabled && !settings?.devLoginEnabled && (
          <p className="text-center text-sm text-slate-500">
            SSO is not configured yet. Contact the administrator.
          </p>
        )}
      </Card>
    </div>
  );
}
