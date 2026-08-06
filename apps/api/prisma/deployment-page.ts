/**
 * Client Deployment Model page — mirrors the MALKOM 3.0 deployment-model
 * poster: organization provisioning flow, the four deployment structure
 * options, and what is common to every model. All content is ContentBlocks,
 * fully editable by Super Admins. Seeded from seed.ts and standalone via
 * seed-deployment.ts.
 */
import type { PrismaClient, BlockKind, Prisma } from "@prisma/client";

type BlockSeed = { kind: BlockKind; payload: Prisma.InputJsonValue; children?: BlockSeed[] };
type SectionSeed = { slug: string; title: string; description?: string; blocks: BlockSeed[] };

const md = (markdown: string) => ({ markdown });
const table = (columns: string[], rows: string[][], caption?: string) => ({
  columns,
  rows,
  ...(caption ? { caption } : {}),
});

export const DEPLOYMENT_PAGE = {
  slug: "deployment-model",
  title: "Client Deployment Model",
  summary:
    "Multi-tenant provisioning — parent platform → organization setup → deployment structure.",
};

export const DEPLOYMENT_SECTIONS: SectionSeed[] = [
  {
    slug: "overview",
    title: "Deployment Model",
    description: "How client organizations are provisioned and where the platform runs",
    blocks: [
      {
        kind: "RICH_TEXT",
        payload: md(
          "![MALKOM 3.0 — Deployment Model: multi-tenant provisioning, parent platform, organization setup and deployment structure options](/deployment-poster.png)",
        ),
      },
    ],
  },
  {
    slug: "provisioning",
    title: "Organization Provisioning — Flow",
    description: "Every client is an organization (tenant), created and configured from the parent platform",
    blocks: [
      {
        kind: "DATA_TABLE",
        payload: table(
          ["Step", "What happens"],
          [
            [
              "1 · Parent Platform",
              "Central control plane — owns, creates and governs every organization running on MALKOM 3.0. Org management • Platform governance",
            ],
            [
              "2 · Create New Organization",
              "A new client organization is spun up from the parent platform — an isolated tenant with its own users, data and configuration. Per-org RBAC & data isolation",
            ],
            [
              "3 · Configure Org Requirements",
              "Per-organization platform setup: Queues — Q & Sub-Q • Deployment structure • Features. The deployment structure is selected here.",
            ],
          ],
        ),
      },
    ],
  },
  {
    slug: "options",
    title: "Deployment Structure — Options",
    description:
      "Chosen per organization during configuration — same containerized codebase in every model (open architecture)",
    blocks: [
      {
        kind: "DATA_TABLE",
        payload: table(
          ["Option", "Model", "Our cloud (WNS)", "Client cloud / on-prem", "Best for"],
          [
            [
              "A",
              "Fully hosted — our cloud",
              "Main App + Features",
              "Users — browser / API access only",
              "Fastest onboarding — we run everything; the client consumes via browser & APIs.",
            ],
            [
              "B",
              "Split — features in client cloud",
              "Main App",
              "Features",
              "Data-heavy features stay inside the client environment (data residency / gravity).",
            ],
            [
              "C",
              "Fully client-hosted",
              "Parent platform — governance only",
              "Main App + Features",
              "Full sovereignty — platform deployed into the client cloud or on-prem (K8s · MinIO).",
            ],
            [
              "D",
              "Hybrid mix",
              "Main App + Features — set 1",
              "Features — set 2",
              "Per-feature placement — each feature hosted where it fits best, set at org configuration.",
            ],
          ],
          "One deployment structure is selected per organization",
        ),
      },
    ],
  },
  {
    slug: "common",
    title: "Common to Every Model",
    description: "The deployment choice never changes the product — one open, containerized platform",
    blocks: [
      {
        kind: "DATA_TABLE",
        payload: table(
          ["Guarantee", "Detail"],
          [
            ["One codebase", "Containerized, open architecture — identical in every deployment model"],
            ["Org-scoped configuration", "Q & Sub-Q configuration scoped per organization"],
            ["Isolation", "RBAC & data isolation per organization"],
            ["Connectivity", "AAG connectors bridge clouds — storage · DB · SFTP · email"],
            ["Operations", "Central observability, audit & telemetry"],
            ["Features", "Toggled per organization"],
          ],
        ),
      },
    ],
  },
];

/** Idempotently (re)creates the Client Deployment Model page. */
export async function seedDeploymentPage(prisma: PrismaClient, createdById: string) {
  const existing = await prisma.page.findUnique({
    where: { slug: DEPLOYMENT_PAGE.slug },
    include: { sections: { select: { id: true } } },
  });
  if (existing) {
    const sectionIds = existing.sections.map((s) => s.id);
    await prisma.contentRevision.deleteMany({
      where: { block: { sectionId: { in: sectionIds } } },
    });
    await prisma.contentBlock.deleteMany({
      where: { sectionId: { in: sectionIds }, parentId: { not: null } },
    });
    await prisma.contentBlock.deleteMany({ where: { sectionId: { in: sectionIds } } });
    await prisma.section.deleteMany({ where: { pageId: existing.id } });
    await prisma.page.delete({ where: { id: existing.id } });
  }

  const pageCount = await prisma.page.count();
  const page = await prisma.page.create({ data: { ...DEPLOYMENT_PAGE, order: pageCount } });

  for (const [si, s] of DEPLOYMENT_SECTIONS.entries()) {
    const section = await prisma.section.create({
      data: { pageId: page.id, slug: s.slug, title: s.title, description: s.description, order: si },
    });
    for (const [bi, b] of s.blocks.entries()) {
      await prisma.contentBlock.create({
        data: {
          sectionId: section.id,
          kind: b.kind,
          payload: b.payload,
          order: bi,
          status: "PUBLISHED",
          publishedAt: new Date(),
          createdById,
        },
      });
    }
  }

  return page;
}
