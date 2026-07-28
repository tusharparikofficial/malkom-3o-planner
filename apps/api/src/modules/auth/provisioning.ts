import type { Role } from "@malkom/shared";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";

export interface SsoProfile {
  ssoUserId: string;
  email: string;
  name?: string | null;
}

/**
 * Just-in-time provisioning from a validated SSO identity.
 * First login creates the user as VIEWER — or SUPER_ADMIN when the email is
 * in SEED_SUPER_ADMIN_EMAILS. Subsequent logins refresh name/lastSeenAt.
 */
export async function provisionUser(profile: SsoProfile) {
  const email = profile.email.trim().toLowerCase();
  const name = profile.name?.trim() || deriveNameFromEmail(email);
  const bootstrapRole: Role = env.superAdminEmails.includes(email) ? "SUPER_ADMIN" : "VIEWER";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        name: profile.name?.trim() || existing.name,
        lastSeenAt: new Date(),
        // seed-listed emails are always kept at SUPER_ADMIN
        ...(bootstrapRole === "SUPER_ADMIN" ? { role: "SUPER_ADMIN" } : {}),
      },
    });
  }

  return prisma.user.create({
    data: {
      ssoUserId: profile.ssoUserId,
      email,
      name,
      role: bootstrapRole,
      lastSeenAt: new Date(),
    },
  });
}

function deriveNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
