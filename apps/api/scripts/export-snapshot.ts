/**
 * Exports the current database content as static JSON into content/snapshot/.
 * The GitHub Pages build serves these files to the read-only public portal.
 *
 * Run locally after editing content (`pnpm snapshot`), commit, push — the
 * Pages site rebuilds with exactly what you see in the app.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

for (const p of [".env", "../../.env"]) {
  try {
    process.loadEnvFile(p);
  } catch {
    /* file not found — skip */
  }
}

const { SETTING_DEFAULTS, SETTING_KEYS } = await import("@malkom/shared");
const { prisma } = await import("../src/lib/prisma.js");
const { getPageBySlug, listPages } = await import("../src/modules/pages/service.js");

const OUT_DIR = path.resolve(process.cwd(), "../../content/snapshot");

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const settingRows = await prisma.appSetting.findMany();
  const stored = new Map(settingRows.map((r) => [r.key, r.value as unknown]));
  const settings = Object.fromEntries(
    SETTING_KEYS.map((key) => [key, stored.has(key) ? stored.get(key) : SETTING_DEFAULTS[key]]),
  );
  await write("settings.json", { settings, devLoginEnabled: false, ssoEnabled: false });

  const pages = await listPages();
  await write("pages.json", pages);

  for (const page of pages) {
    const full = await getPageBySlug(page.slug, false);
    await write(`page-${page.slug}.json`, full);
  }

  console.log(`✅ Snapshot exported: ${pages.length + 2} files → content/snapshot/`);
}

async function write(file: string, data: unknown) {
  await writeFile(path.join(OUT_DIR, file), JSON.stringify(data, null, 1));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
