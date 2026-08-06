/**
 * Emits supabase/migrations/0007_deployment_page.sql from the same data that
 * seeds the local Client Deployment Model page. Rerunnable: replaces the page.
 *
 *   pnpm --filter @malkom/api exec tsx scripts/export-deployment-sql.ts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DEPLOYMENT_PAGE, DEPLOYMENT_SECTIONS } from "../prisma/deployment-page";

const q = (s: string) => `'${s.replaceAll("'", "''")}'`;
const j = (payload: unknown) => {
  const text = JSON.stringify(payload);
  if (text.includes("$j$")) throw new Error("payload contains $j$ delimiter");
  return `$j$${text}$j$::jsonb`;
};

const sysUser = `(select id from "User" where email='system@malkom.local')`;
const pageId = `(select id from "Page" where slug='${DEPLOYMENT_PAGE.slug}')`;
const sectionId = (slug: string) =>
  `(select s.id from "Section" s join "Page" p on p.id=s."pageId" where p.slug='${DEPLOYMENT_PAGE.slug}' and s.slug='${slug}')`;

const lines: string[] = [
  "-- Client Deployment Model page — generated from apps/api/prisma/deployment-page.ts.",
  "-- Rerunnable: replaces the page and its content; nothing else is touched.",
  "begin;",
  `delete from "ContentRevision" where "blockId" in (select cb.id from "ContentBlock" cb join "Section" s on s.id=cb."sectionId" where s."pageId" in (select id from "Page" where slug='${DEPLOYMENT_PAGE.slug}'));`,
  `delete from "ContentBlock" where "sectionId" in (select id from "Section" where "pageId" in (select id from "Page" where slug='${DEPLOYMENT_PAGE.slug}'));`,
  `delete from "Section" where "pageId" in (select id from "Page" where slug='${DEPLOYMENT_PAGE.slug}');`,
  `delete from "Page" where slug='${DEPLOYMENT_PAGE.slug}';`,
  `insert into "Page" (slug, title, summary, "order")`,
  `values ('${DEPLOYMENT_PAGE.slug}', ${q(DEPLOYMENT_PAGE.title)}, ${q(DEPLOYMENT_PAGE.summary)}, (select coalesce(max("order"), -1) + 1 from "Page"));`,
];

for (const [si, s] of DEPLOYMENT_SECTIONS.entries()) {
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

const out = resolve(import.meta.dirname, "../../../supabase/migrations/0007_deployment_page.sql");
writeFileSync(out, lines.join("\n"));
console.log(`✅ Wrote ${out}`);
