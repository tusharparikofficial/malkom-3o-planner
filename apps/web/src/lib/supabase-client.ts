import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase mode: when the project URL + anon key are baked in at build time,
 * the app talks straight to Supabase (auth + database RPC functions) and
 * needs no server of its own — this is how the GitHub Pages deployment
 * becomes fully dynamic.
 */
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const IS_SUPABASE = Boolean(url && key);

export const supabase: SupabaseClient = IS_SUPABASE
  ? createClient(url!, key!)
  : (null as unknown as SupabaseClient);
