import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { PublicSettings } from "@malkom/shared";
import { api } from "./api";

const SettingsContext = createContext<PublicSettings | null>(null);

const CSS_VARS: Record<string, string> = {
  "brand.primaryColor": "--brand-primary",
  "brand.primaryHover": "--brand-primary-hover",
  "brand.primarySoft": "--brand-primary-soft",
};

/** Loads runtime settings and applies brand colors as CSS variables — no redeploys. */
export function SettingsProvider({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ["settings", "public"],
    queryFn: () => api.get<PublicSettings>("/settings/public"),
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!data) return;
    for (const [key, cssVar] of Object.entries(CSS_VARS)) {
      const value = data.settings[key as keyof typeof data.settings];
      if (typeof value === "string") {
        document.documentElement.style.setProperty(cssVar, value);
      }
    }
    const title = data.settings["site.title"];
    if (typeof title === "string") document.title = title;
  }, [data]);

  return <SettingsContext.Provider value={data ?? null}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
