/**
 * Seeds the 5 portal pages with MALKOM starter content, a worked example
 * approach (options × criteria matrix), the delivery timeline, and setting
 * defaults. Content here is placeholder scaffolding — Super Admins replace it
 * in the authoring studio. Re-running resets content tables (not users,
 * feedback, or analytics).
 */
import { PrismaClient, type BlockKind, type Prisma } from "@prisma/client";

// Load env: local apps/api/.env first (wins — loadEnvFile never overrides
// already-set vars), then repo root .env fills the gaps.
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

  // Reset content (order matters for FKs). Feedback/comments/analytics survive.
  await prisma.contentRevision.deleteMany();
  await prisma.contentBlock.deleteMany();
  await prisma.section.deleteMany();
  await prisma.page.deleteMany();
  await prisma.criterionScore.deleteMany();
  await prisma.consideration.deleteMany();
  await prisma.criterion.deleteMany();
  await prisma.approachOption.deleteMany();
  await prisma.approach.deleteMany();
  await prisma.timelineMilestone.deleteMany();
  await prisma.timelinePhase.deleteMany();

  // ── Approach engine ──────────────────────────────────────────────────────
  const approach = await prisma.approach.create({
    data: {
      title: "Platform Strategy for MALKOM 3.0",
      context:
        "MALKOM 3.0 must modernise the current workflow while keeping migration risk low. " +
        "Three delivery options were evaluated against cost, speed and long-term fit.",
      rationale: "Balanced modernisation delivers fastest stakeholder value at acceptable risk.",
      order: 0,
      options: {
        create: [
          {
            title: "Option A — Rebuild on modern stack",
            description: "Greenfield rebuild of the core platform with a phased cut-over.",
            pros: ["Clean architecture", "No legacy constraints", "Best long-term velocity"],
            cons: ["Highest upfront cost", "Longest time-to-value", "Parallel-run burden"],
            effort: 5,
            risk: 4,
            order: 0,
          },
          {
            title: "Option B — Incremental modernisation",
            description: "Strangler-pattern modernisation of highest-value modules first.",
            pros: ["Early value delivery", "Contained risk per slice", "Budget spread over time"],
            cons: ["Temporary dual-stack complexity", "Needs strong interface discipline"],
            effort: 3,
            risk: 2,
            order: 1,
          },
          {
            title: "Option C — Extend current platform",
            description: "Keep the existing platform and extend it for MVP scope only.",
            pros: ["Lowest cost", "Fastest initial delivery"],
            cons: ["Compounds technical debt", "Limits future capability", "Scaling ceiling"],
            effort: 2,
            risk: 3,
            order: 2,
          },
        ],
      },
      criteria: {
        create: [
          { label: "Cost", weight: 3, order: 0 },
          { label: "Time-to-market", weight: 3, order: 1 },
          { label: "Scalability", weight: 2, order: 2 },
          { label: "Migration risk", weight: 2, order: 3 },
        ],
      },
      considerations: {
        create: [
          { kind: "CONSTRAINT", text: "MVP must land within the current budget cycle.", order: 0 },
          { kind: "DEPENDENCY", text: "InstaSafe SSO integration is required before rollout.", order: 1 },
          { kind: "ASSUMPTION", text: "Current data model can be migrated incrementally.", order: 2 },
          { kind: "RISK", text: "Key-person dependency on legacy platform knowledge.", order: 3 },
        ],
      },
    },
    include: { options: true, criteria: true },
  });

  const recommended = approach.options.find((o) => o.title.startsWith("Option B"));
  if (recommended) {
    await prisma.approach.update({
      where: { id: approach.id },
      data: { recommendedOptionId: recommended.id },
    });
  }

  // Score matrix: every option × criterion (what the background job maintains).
  await prisma.criterionScore.createMany({
    data: approach.criteria.flatMap((c) =>
      approach.options.map((o) => ({ criterionId: c.id, optionId: o.id, score: null })),
    ),
  });

  // ── Timeline ─────────────────────────────────────────────────────────────
  const now = new Date();
  const week = 7 * 86_400_000;
  const phases = [
    { title: "Discovery & Planning", status: "DONE" as const, start: -6, end: -2 },
    { title: "MVP Build", status: "IN_PROGRESS" as const, start: -2, end: 8 },
    { title: "Pilot & Rollout", status: "PLANNED" as const, start: 8, end: 14 },
  ];
  for (const [i, p] of phases.entries()) {
    await prisma.timelinePhase.create({
      data: {
        title: p.title,
        status: p.status,
        startDate: new Date(now.getTime() + p.start * week),
        endDate: new Date(now.getTime() + p.end * week),
        order: i,
        milestones: {
          create: [
            {
              title: `${p.title} — key milestone`,
              dueDate: new Date(now.getTime() + (p.end - 1) * week),
              status: p.status === "DONE" ? "DONE" : "PLANNED",
              order: 0,
            },
          ],
        },
      },
    });
  }

  // ── Pages, sections, blocks ──────────────────────────────────────────────
  type BlockSeed = {
    kind: BlockKind;
    payload: Prisma.InputJsonValue;
    children?: BlockSeed[];
  };
  type SectionSeed = { slug: string; title: string; blocks: BlockSeed[] };
  type PageSeed = { slug: string; title: string; summary: string; sections: SectionSeed[] };

  const md = (markdown: string) => ({ markdown });

  const pages: PageSeed[] = [
    {
      slug: "home",
      title: "Home",
      summary: "Everything happening on the MALKOM 3.0 MVP at a glance.",
      sections: [
        {
          slug: "hero",
          title: "Overview",
          blocks: [
            {
              kind: "HERO",
              payload: {
                title: "MALKOM 3.0 MVP",
                subtitle:
                  "One source of truth for the MALKOM modernisation programme — the problem, the approach, the solution, and your voice in it.",
                badge: "MVP Build in progress",
              },
            },
            {
              kind: "KPI_STRIP",
              payload: {
                metrics: [
                  { key: "approaches.count", label: "Approaches evaluated" },
                  { key: "options.count", label: "Options on the table" },
                  { key: "feedback.open", label: "Open feedback" },
                  { key: "feedback.resolved", label: "Feedback resolved" },
                  { key: "milestone.next.days", label: "Days to next milestone" },
                ],
              },
            },
          ],
        },
        {
          slug: "digests",
          title: "Explore the plan",
          blocks: [
            {
              kind: "GRID_GROUP",
              payload: { columns: 2 },
              children: [
                {
                  kind: "CARD",
                  payload: {
                    title: "Business Problem",
                    body: "Why MALKOM 3.0 exists — the pain points, their impact, and the cost of doing nothing.",
                    icon: "report_problem",
                    href: "/business-problem",
                  },
                },
                {
                  kind: "CARD",
                  payload: {
                    title: "Approach & Considerations",
                    body: "The options we weighed, how they scored, and what we recommend.",
                    icon: "alt_route",
                    href: "/approach",
                  },
                },
                {
                  kind: "CARD",
                  payload: {
                    title: "Solutions",
                    body: "Blueprint, architecture views and the delivery timeline.",
                    icon: "architecture",
                    href: "/solutions/blueprint",
                  },
                },
                {
                  kind: "CARD",
                  payload: {
                    title: "Voice of Customer",
                    body: "What users and stakeholders are telling us, grouped into themes.",
                    icon: "record_voice_over",
                    href: "/voice-of-customer",
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "approach",
      title: "Approach & Considerations",
      summary: "The delivery options we evaluated, scored against weighted criteria, with a clear recommendation.",
      sections: [
        {
          slug: "intro",
          title: "How we decided",
          blocks: [
            {
              kind: "RICH_TEXT",
              payload: md(
                "Each approach below lists its **options**, a weighted **comparison matrix**, and the " +
                  "**considerations** behind the recommendation. Use the feedback button to challenge anything — " +
                  "every option, score and consideration accepts feedback individually.",
              ),
            },
          ],
        },
        {
          slug: "approaches",
          title: "Approaches",
          blocks: [{ kind: "APPROACH_EMBED", payload: { approachId: approach.id } }],
        },
      ],
    },
    {
      slug: "business-problem",
      title: "Business Problem",
      summary: "The pain points driving MALKOM 3.0 and what it costs to leave them unsolved.",
      sections: [
        {
          slug: "problems",
          title: "Problem statements",
          blocks: [
            {
              kind: "PROBLEM_STATEMENT",
              payload: {
                title: "Fragmented planning communication",
                narrative:
                  "Programme plans live in slide decks and email threads. Stakeholders review stale copies, and feedback arrives through channels that cannot be tracked or actioned systematically.",
                impact: "Decisions are re-litigated, feedback is lost, and alignment costs weeks per cycle.",
                severity: 4,
                stakeholders: ["Programme leadership", "Delivery teams", "Business stakeholders"],
              },
            },
            {
              kind: "PROBLEM_STATEMENT",
              payload: {
                title: "No single view of decision rationale",
                narrative:
                  "Options analysis and the reasoning behind chosen approaches are scattered, making onboarding slow and challenge cycles repetitive.",
                impact: "The same questions are answered repeatedly; historical context is unrecoverable.",
                severity: 3,
                stakeholders: ["New joiners", "Architecture board", "Programme leadership"],
              },
            },
          ],
        },
        {
          slug: "success-criteria",
          title: "MVP success criteria",
          blocks: [
            {
              kind: "GRID_GROUP",
              payload: { columns: 3 },
              children: [
                { kind: "LIST_ITEM", payload: { text: "All five plan sections live and current", icon: "check_circle" } },
                { kind: "LIST_ITEM", payload: { text: "Feedback captured and tracked to resolution", icon: "check_circle" } },
                { kind: "LIST_ITEM", payload: { text: "Leadership visibility via analytics", icon: "check_circle" } },
              ],
            },
          ],
        },
      ],
    },
    {
      slug: "solutions",
      title: "Solutions",
      summary: "The solution blueprint, architecture views, and the delivery timeline.",
      sections: [
        {
          slug: "blueprint",
          title: "Blueprint",
          blocks: [
            {
              kind: "RICH_TEXT",
              payload: md("Capability blueprint for the MALKOM 3.0 MVP, grouped by layer."),
            },
            {
              kind: "GRID_GROUP",
              payload: { columns: 3 },
              children: [
                {
                  kind: "BLUEPRINT_BLOCK",
                  payload: {
                    title: "Experience",
                    description: "Stakeholder portal, feedback capture, dashboards.",
                    layer: "Presentation",
                    icon: "devices",
                  },
                },
                {
                  kind: "BLUEPRINT_BLOCK",
                  payload: {
                    title: "Services",
                    description: "Content, feedback, analytics and identity services.",
                    layer: "Application",
                    icon: "api",
                  },
                },
                {
                  kind: "BLUEPRINT_BLOCK",
                  payload: {
                    title: "Data",
                    description: "Single Postgres store: content, feedback, events, audit.",
                    layer: "Data",
                    icon: "database",
                  },
                },
              ],
            },
          ],
        },
        {
          slug: "hld",
          title: "High-Level Architecture",
          blocks: [
            {
              kind: "DIAGRAM",
              payload: {
                source: "MERMAID",
                mermaid:
                  "graph LR\n  U[Stakeholders] --> W[React SPA]\n  W --> A[Fastify API]\n  A --> D[(PostgreSQL)]\n  A --> S[InstaSafe SSO]\n",
                caption: "High-level architecture — replace with the full MALKOM diagram.",
              },
            },
          ],
        },
        {
          slug: "lld",
          title: "Low-Level Architecture",
          blocks: [
            {
              kind: "RICH_TEXT",
              payload: md(
                "_Placeholder_ — detailed component and interface design will be authored here " +
                  "(Mermaid diagrams and component tables per module).",
              ),
            },
          ],
        },
        {
          slug: "timeline",
          title: "Timeline",
          blocks: [{ kind: "TIMELINE_EMBED", payload: {} }],
        },
      ],
    },
    {
      slug: "voice-of-customer",
      title: "Voice of Customer",
      summary: "What users and stakeholders are telling us, grouped into actionable themes.",
      sections: [
        {
          slug: "themes",
          title: "Themes",
          blocks: [
            {
              kind: "THEME_GROUP",
              payload: {
                title: "Visibility",
                implication: "The portal must make programme status obvious within one screen.",
              },
              children: [
                {
                  kind: "QUOTE",
                  payload: {
                    text: "I never know which version of the plan is current.",
                    personaName: "Operations Lead",
                    sentiment: "NEGATIVE",
                  },
                },
                {
                  kind: "QUOTE",
                  payload: {
                    text: "Give me one link I can open before every steering call.",
                    personaName: "Programme Sponsor",
                    sentiment: "NEUTRAL",
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ];

  for (const [pi, p] of pages.entries()) {
    const page = await prisma.page.create({
      data: { slug: p.slug, title: p.title, summary: p.summary, order: pi },
    });
    for (const [si, s] of p.sections.entries()) {
      const section = await prisma.section.create({
        data: { pageId: page.id, slug: s.slug, title: s.title, order: si },
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
            createdById: system.id,
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
              createdById: system.id,
            },
          });
        }
      }
    }
  }

  console.log("✅ Seed complete: 5 pages, 1 approach (3 options × 4 criteria), 3 timeline phases");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
