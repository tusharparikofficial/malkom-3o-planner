/**
 * Architecture & Flow page — mirrors the MALKOM_3.0_Architecture_and_Flow
 * workbook (Overview sheet intentionally skipped). One section per sheet:
 * Flow Diagram, Tech Stack, Booking Flow, Modules & Pages, Engines & Allocation.
 * Every piece of content is a ContentBlock, so Super Admins edit all of it in
 * the authoring studio. Called from seed.ts and runnable standalone via
 * seed-architecture.ts.
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

export const ARCHITECTURE_PAGE = {
  slug: "architecture",
  title: "Architecture & Flow",
  summary:
    "Bookings flow, layered architecture & tech stack, modules, roles and core engines — the consolidated MALKOM 3.0 blueprint.",
};

export const ARCHITECTURE_SECTIONS: SectionSeed[] = [
  // ── Sheet: Flow Diagram ───────────────────────────────────────────────────
  {
    slug: "flow-diagram",
    title: "Flow Diagram",
    description:
      "Queues → Agentic Queue & STP decision → manual allocation, states, metrics & analytics",
    blocks: [
      {
        kind: "RICH_TEXT",
        payload: md(
          "![MALKOM 3.0 Framework — bookings flow, system architecture, tech stack, modules, roles and core engines](/architecture-poster.png)",
        ),
      },
    ],
  },

  // ── Client deployment model (poster + provisioning / options / commons) ──
  {
    slug: "deployment-model",
    title: "Client Deployment",
    description:
      "Multi-tenant provisioning — parent platform → organization setup → deployment structure",
    blocks: [
      {
        kind: "RICH_TEXT",
        payload: md(
          "![MALKOM 3.0 — Deployment Model: multi-tenant provisioning, parent platform, organization setup and deployment structure options](/deployment-poster.png)",
        ),
      },
      {
        kind: "RICH_TEXT",
        payload: md(
          "### 🏢 Organization provisioning — flow\n\n" +
            "Every client is an organization (tenant), created and configured from the parent platform.",
        ),
      },
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
      {
        kind: "RICH_TEXT",
        payload: md(
          "### ☁ Deployment structure — options\n\n" +
            "Chosen per organization during configuration — same containerized codebase in every model (open architecture).",
        ),
      },
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
      {
        kind: "RICH_TEXT",
        payload: md(
          "### 🛡 Common to every model\n\n" +
            "The deployment choice never changes the product — one open, containerized platform.",
        ),
      },
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

  // ── Sheet: Tech Stack ─────────────────────────────────────────────────────
  {
    slug: "tech-stack",
    title: "Tech Stack",
    description: "Layer-by-layer technology choices for MALKOM 3.0",
    blocks: [
      {
        kind: "RICH_TEXT",
        payload: md("System architecture — layer-by-layer technology choices for MALKOM 3.0."),
      },
      {
        kind: "DATA_TABLE",
        payload: table(
          ["Layer", "Component", "Details"],
          [
            ["🖥 Front end", "React + Radix + shadcn/ui", "—"],
            ["🖥 Front end", "TailwindCSS", "—"],
            ["🖥 Front end", "Material Icons", "—"],
            ["🔌 API stack", "TypeScript / Vite", "—"],
            ["🔌 API stack", "Node.js", "As npm"],
            ["🔌 API stack", "PostgREST + Prisma + Zod", "—"],
            ["⚡ Cache", "Valkey", "In-memory cache between API and data"],
            ["🗄 Data / backend", "PostgreSQL", "Transaction and MDM instances"],
            ["🗄 Data / backend", "Transaction DB", "Primary and secondary failovers"],
            ["🗄 Data / backend", "Vector DB", "—"],
            ["⚙ Services", "File Storage", "AWS S3 • Azure Blob Storage • GCP Storage • On-premise MinIO"],
            [
              "⚙ Services",
              "Connectors / Adapters",
              "Cloud providers → AAG • storage connectors • database storage connectors • DB adapters",
            ],
            ["⚙ Services", "SFTP & Email connectors", "—"],
            ["⚙ Services", "Agentic Framework", "—"],
            ["⚙ Services", "Observability", "In-built DB logs / cloud logs"],
            ["⚙ Services", "ML", "ML framework, deployment and training environment"],
          ],
          "Layer-by-layer technology choices (from the brainstorm workbook)",
        ),
      },
    ],
  },

  // ── Sheet: Booking Flow ───────────────────────────────────────────────────
  {
    slug: "booking-flow",
    title: "Booking Flow",
    description: "How a booking travels through queues, states, statuses and metrics",
    blocks: [
      {
        kind: "RICH_TEXT",
        payload: md(
          "### 📥 Entry point & queue model\n\n" +
            "Work starts from the list of all open booking requests, organised into queues:",
        ),
      },
      {
        kind: "DATA_TABLE",
        payload: table(
          ["Concept", "Definition"],
          [
            ["Q (parent queue)", "The parent queue — e.g. Booking, BOL Creation or Support."],
            [
              "Sub-Q (child queue)",
              "The child queue under a Q — in Booking: New, Amendment… • in BOL Creation: BL Draft, BL Rating…",
            ],
            [
              "Agentic Queue",
              "Tasks from Q / Sub-Q land in the Agentic Queue first — the Agentic Framework attempts automated straight-through processing before any manual touch.",
            ],
          ],
        ),
      },
      { kind: "RICH_TEXT", payload: md("### 🤖 STP decision — All OK?") },
      {
        kind: "DATA_TABLE",
        payload: table(
          ["Outcome", "What happens"],
          [
            ["YES", "Auto-processed (STP) — no manual allocation; the task goes straight to Track & Measure."],
            [
              "NO",
              "Manual handling — the task is routed to the Work Allocation Engine, which runs the Allocation Matrix.",
            ],
          ],
          "Straight-Through Processing check — every task passes through it after the Agentic Queue",
        ),
      },
      { kind: "RICH_TEXT", payload: md("### 🏷 States & status") },
      {
        kind: "DATA_TABLE",
        payload: table(
          ["Group", "Values"],
          [
            ["Booking states", "NEW • AMENDMENT • CANCELLED • SPLIT • CONFIRMED"],
            ["Workflow transaction states", "INDEXED (REGISTERED) • PROCESSED • PARKED • QUERY"],
            ["Workflow transaction status", "OPEN → WIP → CLOSED (progresses left → right)"],
          ],
          "Every incoming request is classified into one of the booking states",
        ),
      },
      { kind: "RICH_TEXT", payload: md("### ⏱ Timestamps & allocation property") },
      {
        kind: "DATA_TABLE",
        payload: table(
          ["Property", "Detail"],
          [
            ["Transaction timestamps", "Every state + status combination carries its own timestamp."],
            [
              "WF allocation property",
              "Allocate To • When (timestamp) • Trans Start • Trans Touch • Trans End",
            ],
          ],
        ),
      },
      { kind: "RICH_TEXT", payload: md("### 📊 Metrics & analytics") },
      {
        kind: "DATA_TABLE",
        payload: table(
          ["Metric group", "Measures"],
          [
            ["Task metrics", "AHT • TAT (states) • TAT (overall)"],
            ["Q metrics", "BK TAT • BK Aging"],
            ["Audit log metrics", "Task change • Update history (new / old value) • Event state"],
            [
              "Analytics",
              "My Performance Dashboard — user • Realtime Q & Sub-Q Dashboard — admin • SLA / volume / aging trends • Audit & update history",
            ],
          ],
          "Both STP and manually worked tasks converge in Track & Measure — every task is tracked",
        ),
      },
    ],
  },

  // ── Sheet: Modules & Pages ────────────────────────────────────────────────
  {
    slug: "modules-pages",
    title: "Modules & Pages",
    description: "What each persona sees in the MALKOM 3.0 front end",
    blocks: [
      { kind: "RICH_TEXT", payload: md("### 👤 User — Offshore / Onshore") },
      {
        kind: "DATA_TABLE",
        payload: table(
          ["#", "Page / capability"],
          [
            ["1", "My Task / My Q — action on list"],
            ["2", "Task detail (Q state / workflow state & status) — action on task"],
            ["3", "Search tasks and edit all items (based on roles set)"],
            ["4", "My performance dashboard"],
            ["5", "Edit booking queue information across the life cycle"],
            ["6", "Exit task status updates — transfer, query creation (query life cycle)"],
            ["7", "Task life cycle"],
          ],
        ),
      },
      { kind: "RICH_TEXT", payload: md("### 🛡 Admin") },
      {
        kind: "DATA_TABLE",
        payload: table(
          ["#", "Page / capability"],
          [
            ["1", "Admin dashboard — real-time status of every Q and Sub-Q (volume, allocation, status)"],
            [
              "2a",
              "Offshore user profiling — user creation, activation, roles, Q management, capacity management • backup profiling",
            ],
            [
              "2b",
              "Onshore user profiling — user creation, activation, roles, Q management, capacity management",
            ],
            ["3", "Search tasks not assigned (based on roles set)"],
            ["4", "Admin search — everything"],
            ["5", "Rules setup — Q (field and combination based) / Sub-Q / task / validity → approval based"],
            ["6", "Template creation — depending on the state of the Q or task"],
            [
              "7",
              "List of exceptions — country / region / Q; create and maintain exception lists / maps for onshore and offshore departments",
            ],
          ],
        ),
      },
      {
        kind: "RICH_TEXT",
        payload: md(
          "### 👑 Super / Dev / IT Admin\n\n" +
            "Full platform control — sets up and monitors the core engines listed on the Engines & Allocation tab.",
        ),
      },
      {
        kind: "DATA_TABLE",
        payload: table(
          ["#", "Page / capability"],
          [
            ["★", "Everything available to User and Admin"],
            ["1", "Dev configs / app settings"],
            ["2", "Q creation / Q modifications / Q management"],
            [
              "3",
              "Monitoring — audit logs • invariant behaviour (monitoring alerts) • SLA resource metrics for hardware and software",
            ],
            ["4", "DB access management"],
            [
              "5",
              "ML pipeline creation / setup / dependencies • monitor ML pipeline (classification or categorisation)",
            ],
            ["6", "API management — incoming (from client) and outgoing (to client)"],
            ["7", "API key vault management"],
            [
              "8",
              "Billing and parent data management — billing patterns by Q / Sub-Q / task and others; SLA clauses and rewards",
            ],
          ],
        ),
      },
    ],
  },

  // ── Sheet: Engines & Allocation ───────────────────────────────────────────
  {
    slug: "engines-allocation",
    title: "Engines & Allocation",
    description: "How work gets allocated, and the platform services running underneath",
    blocks: [
      { kind: "RICH_TEXT", payload: md("### 🎯 Allocation Matrix") },
      {
        kind: "DATA_TABLE",
        payload: table(
          ["Property", "Detail"],
          [
            ["Allocation properties", "Country • Region • Office • Q • Sub-Q • Task states • Capacity"],
            [
              "Pseudo properties",
              "Every Q comes with additional props → rule-based allocation on any combination of Q and Sub-Q properties",
            ],
            [
              "Run by",
              "Work Allocation Engine — non-STP tasks are routed here for manual handling; it executes the rules for the Allocation Matrix",
            ],
          ],
        ),
      },
      { kind: "RICH_TEXT", payload: md("### ⚙ Core engines & services") },
      {
        kind: "DATA_TABLE",
        payload: table(
          ["Engine / service", "Notes"],
          [
            ["Validation Engine", "—"],
            ["Work Allocation Engine", "Rules for the Allocation Matrix to run"],
            ["Agentic Setup & Monitoring", "—"],
            ["RBAC / Identity Auth", "OFA / UP / SSO setup"],
            ["Workflow Management", "—"],
            ["Metrics Engine", "Task · Q · audit metrics"],
            ["Document / File Management", "Storage / events"],
            ["Email Management Service", "—"],
            ["SFTP", "Client data input or output"],
            ["Master Data Management", "—"],
            ["AI Provider Management", "Usage / maintenance"],
          ],
          "Notes carried over from the brainstorm workbook",
        ),
      },
    ],
  },
];

/**
 * Idempotently (re)creates the Architecture page: removes any existing page
 * with this slug (blocks + revisions + sections), then seeds fresh published
 * content. Other pages, users, feedback and analytics are untouched.
 */
export async function seedArchitecturePage(prisma: PrismaClient, createdById: string) {
  const existing = await prisma.page.findUnique({
    where: { slug: ARCHITECTURE_PAGE.slug },
    include: { sections: { select: { id: true } } },
  });
  if (existing) {
    const sectionIds = existing.sections.map((s) => s.id);
    await prisma.contentRevision.deleteMany({
      where: { block: { sectionId: { in: sectionIds } } },
    });
    // Children reference parents; delete child rows first.
    await prisma.contentBlock.deleteMany({
      where: { sectionId: { in: sectionIds }, parentId: { not: null } },
    });
    await prisma.contentBlock.deleteMany({ where: { sectionId: { in: sectionIds } } });
    await prisma.section.deleteMany({ where: { pageId: existing.id } });
    await prisma.page.delete({ where: { id: existing.id } });
  }

  const pageCount = await prisma.page.count();
  const page = await prisma.page.create({
    data: { ...ARCHITECTURE_PAGE, order: pageCount },
  });

  for (const [si, s] of ARCHITECTURE_SECTIONS.entries()) {
    const section = await prisma.section.create({
      data: {
        pageId: page.id,
        slug: s.slug,
        title: s.title,
        description: s.description,
        order: si,
      },
    });
    for (const [bi, b] of s.blocks.entries()) {
      const parent = await prisma.contentBlock.create({
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
      for (const [ci, c] of (b.children ?? []).entries()) {
        await prisma.contentBlock.create({
          data: {
            sectionId: section.id,
            parentId: parent.id,
            kind: c.kind,
            payload: c.payload,
            order: ci,
            status: "PUBLISHED",
            publishedAt: new Date(),
            createdById,
          },
        });
      }
    }
  }

  return page;
}
