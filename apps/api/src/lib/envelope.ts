import type { PageMeta } from "@malkom/shared";

export function ok<T>(data: T, meta?: PageMeta) {
  return { success: true as const, data, error: null, ...(meta ? { meta } : {}) };
}

export function fail(error: string) {
  return { success: false as const, data: null, error };
}
