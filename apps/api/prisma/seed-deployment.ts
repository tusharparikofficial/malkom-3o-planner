/**
 * Standalone seeder for the Client Deployment Model page only.
 *   pnpm --filter @malkom/api db:seed:deployment
 */
import { PrismaClient } from "@prisma/client";
import { seedDeploymentPage, DEPLOYMENT_PAGE } from "./deployment-page";

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

  await seedDeploymentPage(prisma, system.id);
  console.log(`✅ Seeded page "${DEPLOYMENT_PAGE.slug}" (${DEPLOYMENT_PAGE.title})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
