import { canEditCourse } from './course-access';
import { UserRole } from '../entities/user.entity';

describe('Course editing permissions', () => {
  const course = { instructorId: 12, collegeId: 7 };
  it.each([
    [UserRole.SUPERADMIN, 1, undefined, true],
    [UserRole.ADMIN, 1, 7, true],
    [UserRole.ADMIN, 1, 8, false],
    [UserRole.ADMIN, 1, undefined, false],
    [UserRole.INSTRUCTOR, 12, 7, true],
    [UserRole.INSTRUCTOR, 12, 8, false],
    [UserRole.INSTRUCTOR, 12, undefined, false],
    [UserRole.INSTRUCTOR, 13, 7, false],
    [UserRole.STUDENT, 12, 7, false],
  ])('%s user %s with college %s: %s', (role, sub, collegeId, expected) => {
    expect(canEditCourse({ role, sub, collegeId }, course)).toBe(expected);
  });
});
