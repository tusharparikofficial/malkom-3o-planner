import { ApiError } from "./api";

/**
 * Read-only snapshot mode — set at build time for the GitHub Pages deployment.
 * The app renders from pre-exported JSON instead of the live API: no login,
 * no feedback, no analytics, no authoring.
 */
import { IS_SUPABASE } from "./supabase-client";

export const IS_STATIC = import.meta.env.VITE_STATIC_SNAPSHOT === "1" && !IS_SUPABASE;

function snapshotFile(apiPath: string): string | null {
  const clean = apiPath.split("?")[0] ?? apiPath;
  if (clean === "/settings/public") return "settings.json";
  if (clean === "/pages") return "pages.json";
  const page = /^\/pages\/([\w-]+)$/.exec(clean);
  if (page) return `page-${page[1]}.json`;
  return null;
}

export async function staticGet<T>(apiPath: string): Promise<T> {
  const file = snapshotFile(apiPath);
  if (!file) throw new ApiError("Not available in the read-only preview", 404);
  const res = await fetch(`${import.meta.env.BASE_URL}snapshot/${file}`);
  if (!res.ok) throw new ApiError(`Snapshot not found (${res.status})`, res.status);
  return (await res.json()) as T;
}
