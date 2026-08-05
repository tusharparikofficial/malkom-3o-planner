/**
 * Emits supabase/migrations/0006_architecture_page.sql from the same data that
 * seeds the local Architecture & Flow page, so the Supabase-backed production
 * portal gets identical content. Rerunnable: the migration replaces the page.
 *
 *   pnpm --filter @malkom/api exec tsx scripts/export-architecture-sql.ts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ARCHITECTURE_PAGE, ARCHITECTURE_SECTIONS } from "../prisma/architecture-page";

const q = (s: string) => `'${s.replaceAll("'", "''")}'`;
const j = (payload: unknown) => {
  const text = JSON.stringify(payload);
  if (text.includes("$j$")) throw new Error("payload contains $j$ delimiter");
  return `$j$${text}$j$::jsonb`;
};

const sysUser = `(select id from "User" where email='system@malkom.local')`;
const pageId = `(select id from "Page" where slug='${ARCHITECTURE_PAGE.slug}')`;
const sectionId = (slug: string) =>
  `(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='${ARCHITECTURE_PAGE.slug}' and s.slug='${slug}')`;

const lines: string[] = [
  "-- Architecture & Flow page — generated from apps/api/prisma/architecture-page.ts.",
  "-- Mirrors the MALKOM_3.0_Architecture_and_Flow workbook (Overview sheet skipped).",
  "-- Rerunnable: replaces the page and its content; nothing else is touched.",
  "begin;",
  `delete from "ContentRevision" where "blockId" in (select cb.id from "ContentBlock" cb join "Section" s on s.id=cb."sectionId" where s."pageId" in (select id from "Page" where slug='${ARCHITECTURE_PAGE.slug}'));`,
  `delete from "ContentBlock" where "sectionId" in (select id from "Section" where "pageId" in (select id from "Page" where slug='${ARCHITECTURE_PAGE.slug}'));`,
  `delete from "Section" where "pageId" in (select id from "Page" where slug='${ARCHITECTURE_PAGE.slug}');`,
  `delete from "Page" where slug='${ARCHITECTURE_PAGE.slug}';`,
  `insert into "Page" (slug, title, summary, "order")`,
  `values ('${ARCHITECTURE_PAGE.slug}', ${q(ARCHITECTURE_PAGE.title)}, ${q(ARCHITECTURE_PAGE.summary)}, (select coalesce(max("order"), -1) + 1 from "Page"));`,
];

for (const [si, s] of ARCHITECTURE_SECTIONS.entries()) {
  lines.push(
    `insert into "Section" ("pageId", slug, title, description, "order")`,
    `values (${pageId}, '${s.slug}', ${q(s.title)}, ${s.description ? q(s.description) : "null"}, ${si});`,
  );
  for (const [bi, b] of s.blocks.entries()) {
    lines.push(
      `insert into "ContentBlock" ("sectionId", "parentId", kind, payload, "order", status, "publishedAt", "createdById")`,
      `values (${sectionId(s.slug)}, null, '${b.kind}', ${j(b.payload)}, ${bi}, 'PUBLISHED', now(), ${sysUser});`,
    );
  }
}

lines.push("commit;", "");

const out = resolve(import.meta.dirname, "../../../supabase/migrations/0006_architecture_page.sql");
writeFileSync(out, lines.join("\n"));
console.log(`✅ Wrote ${out}`);
