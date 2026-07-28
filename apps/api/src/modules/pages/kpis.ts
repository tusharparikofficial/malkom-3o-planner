import { prisma } from "../../lib/prisma.js";

/** Server-computed values for KPI_STRIP metric keys. */
export async function resolveKpiValues(keys: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  await Promise.all(
    keys.map(async (key) => {
      out[key] = await resolveOne(key);
    }),
  );
  return out;
}

async function resolveOne(key: string): Promise<string> {
  switch (key) {
    case "approaches.count":
      return String(await prisma.approach.count());
    case "options.count":
      return String(await prisma.approachOption.count());
    case "feedback.open":
      return String(await prisma.feedback.count({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }));
    case "feedback.resolved":
      return String(await prisma.feedback.count({ where: { status: "RESOLVED" } }));
    case "voices.count":
      return String(await prisma.contentBlock.count({ where: { kind: "QUOTE", status: "PUBLISHED" } }));
    case "milestone.next.days": {
      const next = await prisma.timelineMilestone.findFirst({
        where: { dueDate: { gte: new Date() }, status: { notIn: ["DONE"] } },
        orderBy: { dueDate: "asc" },
      });
      if (!next) return "—";
      const days = Math.ceil((next.dueDate.getTime() - Date.now()) / 86_400_000);
      return String(days);
    }
    default:
      return "—";
  }
}
