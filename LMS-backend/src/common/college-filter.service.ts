import { Injectable, ForbiddenException } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

export interface CollegeFilter {
  collegeId?: number;
}

@Injectable()
export class CollegeFilterService {
  /**
   * Get college filter for queries based on user role
   * SUPERADMIN: No filter (can see all colleges)
   * ADMIN/INSTRUCTOR/STUDENT: Filter by their collegeId
   */
  getCollegeFilter(
    userRole: UserRole,
    userCollegeId?: number,
  ): CollegeFilter {
    // SUPERADMIN can access all colleges
    if (userRole === UserRole.SUPERADMIN) {
      return {};
    }

    // All other roles must have a collegeId
    if (!userCollegeId) {
      throw new ForbiddenException('User must belong to a college');
    }

    return { collegeId: userCollegeId };
  }

  /**
   * Check if user has access to a specific college
   */
  canAccessCollege(
    userRole: UserRole,
    userCollegeId: number | undefined,
    targetCollegeId: number,
  ): boolean {
    // SUPERADMIN can access any college
    if (userRole === UserRole.SUPERADMIN) {
      return true;
    }

    // Other roles can only access their own college
    return userCollegeId === targetCollegeId;
  }

  /**
   * Validate that a user can perform an action within their college
   */
  validateCollegeAccess(
    userRole: UserRole,
    userCollegeId: number | undefined,
    targetCollegeId: number,
    action: string = 'access',
  ): void {
    if (!this.canAccessCollege(userRole, userCollegeId, targetCollegeId)) {
      throw new ForbiddenException(`You do not have permission to ${action} resources from this college`);
    }
  }
}
