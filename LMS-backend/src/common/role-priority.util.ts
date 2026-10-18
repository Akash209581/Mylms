import { UserRole } from '../entities/user.entity';

/**
 * Users carry both a legacy singular `role` column and a `roles` array. Guards
 * authorize off the array while much of the business logic branches on the
 * singular column, so the two must never disagree about which role is primary.
 *
 * Deriving it from array *order* is what let callers mint a globally-scoped
 * account by listing QUESTION_CREATOR first. Highest privilege wins instead.
 */
export const ROLE_PRIORITY: readonly UserRole[] = [
  UserRole.SUPERADMIN,
  UserRole.ADMIN,
  UserRole.INSTRUCTOR,
  UserRole.QUESTION_CREATOR,
  UserRole.CONTENT_CREATOR,
  UserRole.STUDENT,
];

/** The primary role for a set of assigned roles, by privilege rather than order. */
export function primaryRole(roles: readonly (UserRole | string)[]): UserRole {
  return (
    ROLE_PRIORITY.find((r) => roles.includes(r)) ??
    (roles[0] as UserRole) ??
    UserRole.STUDENT
  );
}

/** Normalizes the `roles`/`role` pair off a request principal into an array. */
export function principalRoles(user: any): UserRole[] {
  const raw = user?.roles;
  const list: string[] = Array.isArray(raw)
    ? raw
    : typeof raw === 'string' && raw.trim()
      ? raw.split(',')
      : [];
  const normalized = list.map((r) => String(r).trim().toUpperCase()).filter(Boolean);
  if (!normalized.length && user?.role) normalized.push(String(user.role).trim().toUpperCase());
  return normalized as UserRole[];
}

/**
 * Effective role for authorization branching. Always prefer this over
 * `req.user.role`, which can lag behind the array for multi-role accounts.
 */
export function effectiveRole(user: any): UserRole {
  return primaryRole(principalRoles(user));
}
