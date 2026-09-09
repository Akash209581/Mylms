import { UserRole } from '../entities/user.entity';

export function canEditCourse(user: { role: UserRole; sub: number; collegeId?: number }, course: { instructorId: number; collegeId?: number }): boolean {
  return user.role === UserRole.SUPERADMIN ||
    (user.role === UserRole.ADMIN && !!user.collegeId && user.collegeId === course.collegeId) ||
    (user.role === UserRole.INSTRUCTOR && course.instructorId === user.sub &&
      !!user.collegeId && user.collegeId === course.collegeId);
}
