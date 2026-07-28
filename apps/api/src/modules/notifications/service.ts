import type { EntityType } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";

interface NotifyInput {
  actorId: string;
  type: "BLOCK_ADDED" | "FEEDBACK_SUBMITTED";
  message: string;
  entityType?: EntityType;
  entityId?: string;
}

/** Fire-and-forget notification to all Super Admins. */
export async function notifySuperAdmins(input: NotifyInput): Promise<void> {
  await prisma.notification.create({
    data: {
      recipientRole: "SUPER_ADMIN",
      actorId: input.actorId,
      type: input.type,
      message: input.message,
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
    },
  });
}
