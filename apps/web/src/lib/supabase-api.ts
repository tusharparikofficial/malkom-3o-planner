import { supabase } from "./supabase-client";
import { ApiError } from "./api";

/**
 * Maps the app's REST-style paths onto Supabase RPC functions — the same API
 * surface the Fastify server exposed, reimplemented as database functions
 * (supabase/migrations/0002_auth_api.sql). Components stay unchanged.
 */

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const code = (error as { code?: string }).code ?? "";
    const status =
      code === "P0401" ? 401 : code === "P0403" ? 403 : code === "P0404" ? 404 : 400;
    throw new ApiError(error.message || "Request failed", status);
  }
  return data as T;
}

export async function supabaseRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? "GET";
  const body = init?.body ? (JSON.parse(init.body as string) as Record<string, unknown>) : undefined;
  const url = new URL(path, "http://local");
  const p = url.pathname;
  const q = url.searchParams;
  const seg = p.split("/").filter(Boolean);

  // ── auth ──
  if (p === "/auth/me") {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new ApiError("Not authenticated", 401);
    return rpc<T>("api_me");
  }
  if (p === "/auth/logout") {
    await supabase.auth.signOut();
    return { loggedOut: true, sloUrl: null } as T;
  }

  // ── settings ──
  if (p === "/settings/public") return rpc<T>("api_public_settings");
  if (p === "/admin/settings" && method === "GET") return rpc<T>("api_admin_settings_get");
  if (p === "/admin/settings" && method === "PATCH")
    return rpc<T>("api_admin_settings_patch", { p_patch: body });

  // ── content ──
  if (p === "/pages") return rpc<T>("api_pages");
  if (seg[0] === "pages" && seg.length === 2)
    return rpc<T>("api_get_page", { p_slug: seg[1], p_preview: q.get("preview") === "1" });
  if (p === "/approaches" && method === "GET") return rpc<T>("api_approaches");
  if (p === "/timeline" && method === "GET") return rpc<T>("api_timeline");

  // ── feedback ──
  if (p === "/feedback/targets") return rpc<T>("api_feedback_targets", { p_page: q.get("page") });
  if (p === "/feedback" && method === "POST")
    return rpc<T>("api_feedback_submit", { p_entries: body?.entries });
  if (p === "/feedback/mine") return rpc<T>("api_feedback_mine");
  if (p === "/admin/feedback" && method === "GET") {
    const r = await rpc<{ items: T }>("api_admin_feedback", {
      p_status: q.get("status") || null,
      p_page: Number(q.get("page") ?? 1),
      p_limit: Number(q.get("limit") ?? 20),
    });
    return r.items;
  }
  if (seg[0] === "admin" && seg[1] === "feedback" && seg[3] === "status")
    return rpc<T>("api_feedback_set_status", {
      p_id: seg[2],
      p_status: body?.status,
      p_note: body?.note ?? null,
    });

  // ── comments ──
  if (p === "/comments" && method === "GET")
    return rpc<T>("api_comments", {
      p_entity_type: q.get("entityType"),
      p_entity_id: q.get("entityId"),
    });
  if (p === "/comments" && method === "POST")
    return rpc<T>("api_comment_add", {
      p_entity_type: body?.entityType,
      p_entity_id: body?.entityId,
      p_body: body?.body,
      p_parent_id: body?.parentId ?? null,
    });

  // ── analytics ──
  if (p === "/analytics/events") return rpc<T>("api_track", { p_events: body?.events });
  if (p === "/admin/analytics/summary") return rpc<T>("api_admin_analytics_summary");
  if (p === "/admin/analytics/users" && seg.length === 3)
    return rpc<T>("api_admin_analytics_users");
  if (seg[0] === "admin" && seg[1] === "analytics" && seg[2] === "users" && seg[3])
    return rpc<T>("api_admin_analytics_user", { p_id: seg[3] });

  // ── notifications ──
  if (p === "/notifications") return rpc<T>("api_notifications");
  if (p === "/notifications/read-all") return rpc<T>("api_notifications_read_all");

  // ── users ──
  if (p === "/admin/users" && method === "GET") return rpc<T>("api_admin_users");
  if (seg[0] === "admin" && seg[1] === "users" && seg[3] === "role")
    return rpc<T>("api_admin_user_set_role", { p_id: seg[2], p_role: body?.role });

  // ── authoring: blocks ──
  if (p === "/admin/blocks" && method === "POST") return rpc<T>("api_block_create", { p: body });
  if (seg[0] === "admin" && seg[1] === "blocks" && seg.length === 3 && method === "PATCH")
    return rpc<T>("api_block_update", {
      p_id: seg[2],
      p_payload: body?.payload ?? null,
      p_order: body?.order ?? null,
      p_note: body?.note ?? null,
    });
  if (seg[0] === "admin" && seg[1] === "blocks" && seg[3] === "publish")
    return rpc<T>("api_block_publish", { p_id: seg[2] });
  if (seg[0] === "admin" && seg[1] === "blocks" && seg[3] === "archive")
    return rpc<T>("api_block_archive", { p_id: seg[2] });
  if (seg[0] === "admin" && seg[1] === "blocks" && seg[3] === "revisions")
    return rpc<T>("api_block_revisions", { p_id: seg[2] });
  if (seg[0] === "admin" && seg[1] === "blocks" && seg[3] === "revert")
    return rpc<T>("api_block_revert", { p_id: seg[2], p_revision_id: seg[4] });

  // ── authoring: approaches ──
  if (seg[0] === "admin" && seg[1] === "approaches") {
    if (seg.length === 2 && method === "POST") return rpc<T>("api_approach_upsert", { p: body });
    if (seg[2] === "options" && method === "POST") return rpc<T>("api_option_upsert", { p: body });
    if (seg[2] === "options" && method === "PATCH")
      return rpc<T>("api_option_upsert", { p: { ...body, id: seg[3] } });
    if (seg[2] === "options" && method === "DELETE")
      return rpc<T>("api_option_delete", { p_id: seg[3] });
    if (seg[2] === "criteria" && method === "POST") return rpc<T>("api_criterion_upsert", { p: body });
    if (seg[2] === "criteria" && method === "PATCH")
      return rpc<T>("api_criterion_upsert", { p: { ...body, id: seg[3] } });
    if (seg[2] === "criteria" && method === "DELETE")
      return rpc<T>("api_criterion_delete", { p_id: seg[3] });
    if (seg[2] === "scores" && method === "PATCH")
      return rpc<T>("api_score_update", {
        p_id: seg[3],
        p_score: body?.score ?? null,
        p_note: body?.note ?? null,
      });
    if (seg.length === 3 && method === "PATCH")
      return rpc<T>("api_approach_upsert", { p: { ...body, id: seg[2] } });
  }

  // ── authoring: timeline ──
  if (seg[0] === "admin" && seg[1] === "timeline") {
    const kind = seg[2] === "phases" ? "phase" : "milestone";
    if (method === "POST") return rpc<T>(`api_${kind}_upsert`, { p: body });
    if (method === "PATCH") return rpc<T>(`api_${kind}_upsert`, { p: { ...body, id: seg[3] } });
    if (method === "DELETE") return rpc<T>(`api_${kind}_delete`, { p_id: seg[3] });
  }

  // ── diagrams ──
  if (p === "/diagrams") return rpc<T>("api_diagrams");
  if (seg[0] === "diagrams" && seg.length === 2) return rpc<T>("api_diagram", { p_id: seg[1] });
  if (p === "/admin/diagrams/generate") {
    const { data, error } = await supabase.functions.invoke("generate-diagram", { body });
    if (error) throw new ApiError(error.message ?? "AI generation failed", 502);
    if ((data as { error?: string })?.error) throw new ApiError((data as { error: string }).error, 502);
    return data as T;
  }
  if (p === "/admin/diagrams" && method === "POST") return rpc<T>("api_diagram_upsert", { p: body });
  if (seg[0] === "admin" && seg[1] === "diagrams" && method === "PATCH")
    return rpc<T>("api_diagram_upsert", { p: { ...body, id: seg[2] } });
  if (seg[0] === "admin" && seg[1] === "diagrams" && method === "DELETE")
    return rpc<T>("api_diagram_delete", { p_id: seg[2] });

  throw new ApiError(`No Supabase mapping for ${method} ${p}`, 404);
}
