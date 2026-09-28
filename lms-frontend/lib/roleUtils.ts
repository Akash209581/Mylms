export function getRoleBasePath(role?: string): string {
  if (!role) return '/dashboard/instructor';
  const upper = role.toUpperCase();
  if (upper === 'SUPERADMIN') return '/dashboard/superadmin';
  if (upper === 'ADMIN') return '/dashboard/admin';
  if (upper === 'STUDENT') return '/dashboard/student';
  if (upper === 'QUESTION_CREATOR') return '/dashboard/question_creator';
  if (upper === 'CONTENT_CREATOR') return '/dashboard/content_creator';
  return '/dashboard/instructor';
}

/** Landing page after login (creators have no dashboard index page of their own). */
export function getRoleHomePath(role?: string): string {
  const upper = (role || '').toUpperCase();
  if (upper === 'QUESTION_CREATOR') return '/dashboard/question_creator/question-bank';
  if (upper === 'CONTENT_CREATOR') return '/dashboard/content_creator/courses';
  if (!upper) return '/login';
  return getRoleBasePath(upper);
}

/** True when the user holds `role` as their primary role or in their roles list. */
export function hasRole(user: { role?: string; roles?: string[] | string } | null | undefined, role: string): boolean {
  if (!user) return false;
  const roles = Array.isArray(user.roles)
    ? user.roles
    : typeof user.roles === 'string' ? user.roles.split(',') : [];
  return [user.role, ...roles].some((r) => String(r || '').trim().toUpperCase() === role);
}
