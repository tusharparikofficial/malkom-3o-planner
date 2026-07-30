// Supabase Edge Function: AI diagram generation via DeepSeek.
// The API key lives in Supabase function secrets — never in the browser.
// Deploy:  supabase functions deploy generate-diagram
// Secrets: supabase secrets set DEEPSEEK_API_KEY=sk-...
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Fallback only — the real prompt is stored in AppSetting('ai.diagramSystemPrompt')
// and is editable by Super Admins in Administration → Diagrams.
const FALLBACK_GUIDE = `You generate JSON for the "diagram-engine" renderer. Output ONLY one JSON object, no markdown fences.
Envelope: { "type": "block"|"state"|"sequence"|"overview"|"entity", "description": string, "size": "small"|"medium"|"large", "positioning": "auto"|"manual", "elements": [...] }
Keep to 5-9 nodes with short Title Case labels, kebab-case ids, one node per grid cell, and "arrowHeadType":"arrowclosed" on every edge.`;

async function loadPrompt(admin: ReturnType<typeof createClient>): Promise<string> {
  const { data } = await admin
    .from("AppSetting")
    .select("value")
    .eq("key", "ai.diagramSystemPrompt")
    .maybeSingle();
  const stored = typeof data?.value === "string" ? data.value : null;
  return stored && stored.trim().length > 0 ? stored : FALLBACK_GUIDE;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const apiKey = Deno.env.get("DEEPSEEK_API_KEY");
    if (!apiKey) {
      return json(503, { error: "AI generation is not configured — set the DEEPSEEK_API_KEY secret" });
    }

    // Identify the caller from their JWT and require SUPER_ADMIN.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const jwt = (req.headers.get("Authorization") ?? "").replace("Bearer ", "");
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !userData.user) return json(401, { error: "Not authenticated" });

    const { data: profile } = await admin
      .from("User")
      .select("role")
      .eq("authId", userData.user.id)
      .single();
    if (profile?.role !== "SUPER_ADMIN") {
      return json(403, { error: "Insufficient permissions" });
    }

    const systemPrompt = await loadPrompt(admin);
    const { prompt, diagramType, existingDefinition, previousError } = await req.json();
    if (typeof prompt !== "string" || prompt.trim().length < 10) {
      return json(400, { error: "Prompt must be at least 10 characters" });
    }

    const parts = [
      `Create a "${diagramType}" diagram for the MALKOM 3.0 programme portal.`,
      `Request: ${prompt}`,
    ];
    if (existingDefinition) {
      parts.push(`Modify this existing definition rather than starting over:\n${JSON.stringify(existingDefinition)}`);
    }
    if (previousError) {
      parts.push(`Your previous attempt failed validation with: ${previousError}. Fix the issue and return corrected JSON.`);
    }

    const res = await fetch(
      `${Deno.env.get("DEEPSEEK_BASE_URL") ?? "https://api.deepseek.com"}/chat/completions`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: Deno.env.get("DEEPSEEK_MODEL") ?? "deepseek-v4-flash",
          max_tokens: 8000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: parts.join("\n\n") },
          ],
        }),
      },
    );

    const body = await res.json().catch(() => null);
    if (!res.ok) {
      return json(502, { error: `AI provider error: ${body?.error?.message ?? `HTTP ${res.status}`}` });
    }

    const text: string = body?.choices?.[0]?.message?.content ?? "";
    const trimmed = text.trim();
    const candidate = trimmed.startsWith("{")
      ? trimmed
      : trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1);

    let definition: unknown;
    try {
      definition = JSON.parse(candidate);
    } catch {
      return json(502, { error: "AI returned invalid JSON — try again" });
    }

    return json(200, { definition, aiEnabled: true });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : "Unexpected error" });
  }
});
