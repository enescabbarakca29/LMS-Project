import type { Role, User } from "./types";

const roleRank: Record<Role, number> = {
  SUPER_ADMIN: 5,
  ADMIN: 4,
  INSTRUCTOR: 3,
  ASSISTANT: 2,
  STUDENT: 1,
  GUEST: 0,
};

export function hasMinRole(user: User | null, minRole: Role): boolean {
  if (!user) return false;
  return roleRank[user.role] >= roleRank[minRole];
}

export function hasAnyRole(user: User | null, roles: Role[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
