import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { ssoLoginUrl, useSsoStatus } from "@/lib/sso";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Field, Input } from "@/components/ui/field";

/**
 * Supabase-mode sign-in. InstaSafe SAML SSO is the only route offered by
 * default; the email/password and Microsoft paths remain in the code as
 * break-glass options, each behind its own build flag
 * (VITE_ENABLE_EMAIL_LOGIN / VITE_ENABLE_MS_LOGIN) so a broken IdP doesn't
 * lock everyone out permanently.
 */
export function SupabaseLogin() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: sso, isLoading: ssoLoading } = useSsoStatus();

  // Stay visible unless the function explicitly reports SSO disabled, so a slow
  // or blocked status probe never hides the only sign-in route.
  const showSso = sso ? sso.enabled : !ssoLoading;
  const showEmail = import.meta.env.VITE_ENABLE_EMAIL_LOGIN === "1";
  const showMicrosoft = import.meta.env.VITE_ENABLE_MS_LOGIN === "1";

  async function signInWithMicrosoft() {
    setError(null);
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: "azure",
      options: {
        scopes: "openid profile email",
        redirectTo: window.location.origin + import.meta.env.BASE_URL,
      },
    });
    if (e) setError(e.message);
  }

  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error: err } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: name || undefined } },
        });
        if (err) throw err;
        if (!data.session) {
          setNotice("Account created — check your email to confirm, then sign in.");
          setMode("signin");
          return;
        }
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {showSso && (
        <a href={ssoLoginUrl()} className="block">
          <Button className="w-full" size="lg">
            <Icon name="badge" className="text-xl" />
            {sso?.loginLabel || "Sign in with InstaSafe SSO"}
          </Button>
        </a>
      )}

      {showSso && !showEmail && !showMicrosoft && (
        <p className="text-center text-xs leading-relaxed text-slate-400">
          Access is managed through your WNS account — no separate password to remember.
        </p>
      )}

      {!showSso && !showEmail && !showMicrosoft && (
        <p className="text-center text-sm text-slate-500">
          Single sign-on is currently unavailable. Please contact the programme team.
        </p>
      )}

      {showMicrosoft && (
        <Button
          variant="outline"
          className="w-full"
          size="lg"
          onClick={() => void signInWithMicrosoft()}
        >
          <Icon name="window" className="text-xl" /> Sign in with Microsoft
        </Button>
      )}

      {showEmail && (
        <>
          {showSso && <p className="text-center text-xs uppercase text-slate-400">or with email</p>}
          <form onSubmit={handleEmail} className="space-y-3">
            {mode === "signup" && (
              <Field label="Name">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </Field>
            )}
            <Field label="Email">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@wns.com"
              />
            </Field>
            <Field label="Password">
              <Input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </Field>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {notice && <p className="text-sm text-green-700">{notice}</p>}
            <Button type="submit" variant="outline" className="w-full" disabled={busy}>
              {busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="w-full text-center text-xs font-medium text-slate-400 hover:text-primary"
          >
            {mode === "signin" ? "No account yet? Create one" : "Already registered? Sign in"}
          </button>
        </>
      )}

      {!showEmail && error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
