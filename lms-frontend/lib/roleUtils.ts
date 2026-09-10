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
