// Supabase Edge Function: AI diagram generation via DeepSeek.
// The API key lives in Supabase function secrets — never in the browser.
// Deploy:  supabase functions deploy generate-diagram
// Secrets: supabase secrets set DEEPSEEK_API_KEY=sk-...
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const FORMAT_GUIDE = `
You produce JSON for the "diagram-engine" renderer. Output ONLY a single JSON object, no markdown fences, no commentary.

Common top-level shape (every type):
{ "type": <see below>, "description": string, "size": "small"|"medium"|"large", "positioning": "auto"|"manual", "elements": [...] }

Text fields marked MD accept either a plain string or an array of paragraph tags:
[{"$$mdtype":"Tag","name":"Paragraph","attributes":{},"children":["line of text"]}]
Prefer plain strings unless multiple lines are needed.

TYPE "block" (flowcharts, layered architecture) — positioning "auto" recommended:
- node: {"id","type":"block","col":int,"row":int,"data":{"text":MD,"subtitle"?:MD,"state"?:"default"|"accent"|"success"|"warning"|"danger"}}
- layer (group box, manual coords): {"id","type":"layer","x","y","width","height","data":{"title":MD,"children"?:[nodeIds],"state"?}}
- edge: {"from":nodeId,"to":nodeId,"label"?:string,"type"?:"straight"|"step"|"bend","state"?,"lineStyle"?:"solid"|"dashed","arrowHeadType":"arrowclosed"}
Grid: col 0..n left-to-right, row 0..n top-to-bottom. Keep grids compact.

TYPE "state" (state machines) — positioning "auto":
- node: {"id","type":"state","col":int,"row":int,"data":{"text":MD,"state"?:string}}
- edge: {"from","to","label"?,"arrowHeadType":"arrowclosed","state"?,"lineStyle"?}

TYPE "sequence" (message flows) — positioning "auto":
- actor: {"id","type":"sequenceActor","data":{"heading":MD,"index":int,"color":"default"|"success"|"accent"|"warning","rows":int}}
- action: {"id","type":"sequenceAction","data":{"text":MD,"row":int,"from":actorId,"to":actorId,"event"?:string}}
  row starts at 0 and increments down the timeline.

TYPE "overview" (architecture with icons/text, positioning "manual", coordinates in px ~0-900 wide):
- icon: {"id","type":"icon","data":{"icon":string,"label"?:string,"text":[],"size":"auto","color":"default"},"position":{"x","y"}}
  icon names: user, server, database, cloud, api, browser, mobile, lock, gear, document, queue, claude-code
- text: {"id","type":"text","data":{"text":MD,"size":"auto","color":"default"},"position":{"x","y"},"width"?:int}
- edge: {"id","source":elemId,"target":elemId,"type":"default"|"step"|"bend","label"?,"arrowHeadType":"arrowclosed"}
Lay out left-to-right with ~200-250px horizontal spacing, ~120px vertical.

TYPE "entity" (data models, positioning "manual"):
- entity: {"id","type":"entity","data":{"header":MD,"rows":[{"name":string,"value":MD,"handle":string|null}],"handles":[handleIds]},"position":{"x","y"}}
- edge: {"id","source":entityId,"target":entityId,"sourceHandle"?:handleId,"targetHandle"?:handleId,"type":"step","label"?}

Rules: every element id unique and kebab-case; every edge from/to (or source/target) must reference an existing element id; 4-14 nodes is the sweet spot; always include "arrowHeadType":"arrowclosed" on edges; description = one sentence stating what the diagram shows.`;

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
            { role: "system", content: FORMAT_GUIDE },
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
