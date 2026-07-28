export const ROLES = ["VIEWER", "ADMIN", "SUPER_ADMIN"] as const;
export type Role = (typeof ROLES)[number];

export function roleAtLeast(role: Role, min: Role): boolean {
  return ROLES.indexOf(role) >= ROLES.indexOf(min);
}
