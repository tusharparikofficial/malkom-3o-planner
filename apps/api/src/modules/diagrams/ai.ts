import { env } from "../../config/env.js";

/**
 * AI diagram generation via DeepSeek (OpenAI-compatible chat completions):
 * turns a plain-language description into a diagram-engine DiagramDefinition
 * (the JSON format rendered by DiagramCanvas). Enabled only when
 * DEEPSEEK_API_KEY is configured.
 */

// Compact contract distilled from diagram-engine's schema.ts. Markdoc text is
// kept to its simplest form (plain strings / paragraph tags) — valid and easy
// for the model to emit consistently.
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
  index = lane order left-to-right; rows = number of action rows the diagram uses.
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

export interface GenerateInput {
  prompt: string;
  diagramType: string;
  existingDefinition?: unknown;
  previousError?: string;
}

interface ChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string };
}

export async function generateDiagram(input: GenerateInput): Promise<unknown> {
  if (!env.aiEnabled) {
    throw Object.assign(new Error("AI generation is not configured (DEEPSEEK_API_KEY missing)"), {
      statusCode: 503,
    });
  }

  const parts: string[] = [
    `Create a "${input.diagramType}" diagram for the MALKOM 3.0 programme portal.`,
    `Request: ${input.prompt}`,
  ];
  if (input.existingDefinition) {
    parts.push(
      `Modify this existing definition rather than starting over:\n${JSON.stringify(input.existingDefinition)}`,
    );
  }
  if (input.previousError) {
    parts.push(
      `Your previous attempt failed validation with: ${input.previousError}. Fix the issue and return corrected JSON.`,
    );
  }

  const res = await fetch(`${env.DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.DEEPSEEK_MODEL,
      max_tokens: 8000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: FORMAT_GUIDE },
        { role: "user", content: parts.join("\n\n") },
      ],
    }),
  });

  const body = (await res.json().catch(() => null)) as ChatCompletionResponse | null;
  if (!res.ok) {
    const detail = body?.error?.message ?? `HTTP ${res.status}`;
    throw Object.assign(new Error(`AI provider error: ${detail}`), { statusCode: 502 });
  }

  const text = body?.choices?.[0]?.message?.content ?? "";
  return extractJson(text);
}

function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const candidate = trimmed.startsWith("{")
    ? trimmed
    : trimmed.slice(trimmed.indexOf("{"), trimmed.lastIndexOf("}") + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    throw Object.assign(new Error("AI returned invalid JSON — try again"), { statusCode: 502 });
  }
}
