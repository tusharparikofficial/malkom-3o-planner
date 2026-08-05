/**
 * Standalone seeder for the Architecture & Flow page only. Safe to run against
 * a live environment: it replaces just the `architecture` page and leaves every
 * other page, user, feedback thread and analytics event untouched.
 *
 *   pnpm --filter @malkom/api db:seed:architecture
 */
import { PrismaClient } from "@prisma/client";
import { seedArchitecturePage, ARCHITECTURE_PAGE } from "./architecture-page";

for (const path of [".env", "../../.env"]) {
  try {
    process.loadEnvFile(path);
  } catch {
    /* file not found — skip */
  }
}

const prisma = new PrismaClient();

async function main() {
  const system = await prisma.user.upsert({
    where: { email: "system@malkom.local" },
    update: {},
    create: {
      ssoUserId: "system@malkom.local",
      email: "system@malkom.local",
      name: "MALKOM System",
      role: "SUPER_ADMIN",
    },
  });

  await seedArchitecturePage(prisma, system.id);
  console.log(`✅ Seeded page "${ARCHITECTURE_PAGE.slug}" (${ARCHITECTURE_PAGE.title})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
