import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Landing point after InstaSafe SSO: the Edge Function has validated the SAML
 * assertion and handed us a single-use token — exchange it for a session.
 */
export function SsoCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const tokenHash = params.get("token_hash");
    const next = params.get("next") ?? "/";
    if (!tokenHash) {
      setError("The sign-in link was missing its token. Please try again.");
      return;
    }

    void (async () => {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "email",
      });
      if (verifyError) {
        setError(verifyError.message);
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      navigate(next.startsWith("/") ? next : "/", { replace: true });
    })();
  }, [params, navigate, queryClient]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md p-8 text-center">
        {error ? (
          <>
            <p className="font-medium text-slate-900">Sign-in could not be completed</p>
            <p className="mt-2 text-sm text-slate-600">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/login")}>
              Back to sign-in
            </Button>
          </>
        ) : (
          <>
            <span className="mx-auto mb-4 block h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-primary" />
            <p className="text-sm text-slate-500">Completing single sign-on…</p>
          </>
        )}
      </Card>
    </div>
  );
}
