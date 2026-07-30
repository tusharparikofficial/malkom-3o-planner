import { useQuery } from "@tanstack/react-query";
import { IS_SUPABASE } from "./supabase-client";

export interface SsoStatus {
  enabled: boolean;
  loginLabel: string;
  certConfigured: boolean;
  idpConfigured: boolean;
}

const base = import.meta.env.VITE_SUPABASE_URL;

/** The Edge Function reports whether SAML SSO is configured and ready. */
export function useSsoStatus() {
  return useQuery({
    queryKey: ["sso", "status"],
    enabled: IS_SUPABASE,
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async (): Promise<SsoStatus | null> => {
      try {
        const res = await fetch(`${base}/functions/v1/sso`, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? "" },
        });
        if (!res.ok) return null;
        return (await res.json()) as SsoStatus;
      } catch {
        return null;
      }
    },
  });
}

export function ssoLoginUrl(next = "/"): string {
  return `${base}/functions/v1/sso/login?next=${encodeURIComponent(next)}`;
}
