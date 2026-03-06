import { Injectable } from '@nestjs/common';
import { UserRole } from '../entities/user.entity';

export interface OrganizationFilter {
  organizationId?: number;
}

@Injectable()
export class OrganizationFilterService {
  /**
   * Get organization filter for queries based on user role
   * SUPERADMIN: No filter (can see all organizations)
   * ADMIN/INSTRUCTOR/STUDENT: Filter by their organizationId
   */
  getOrganizationFilter(
    userRole: UserRole,
    userOrganizationId?: number,
  ): OrganizationFilter {
    // SUPERADMIN can access all organizations
    if (userRole === UserRole.SUPERADMIN) {
      return {};
    }

    // All other roles must have an organizationId
    if (!userOrganizationId) {
      throw new Error('User must belong to an organization');
    }

    return { organizationId: userOrganizationId };
  }

  /**
   * Check if user has access to a specific organization
   */
  canAccessOrganization(
    userRole: UserRole,
    userOrganizationId: number | undefined,
    targetOrganizationId: number,
  ): boolean {
    // SUPERADMIN can access any organization
    if (userRole === UserRole.SUPERADMIN) {
      return true;
    }

    // Other roles can only access their own organization
    return userOrganizationId === targetOrganizationId;
  }

  /**
   * Validate that a user can perform an action within their organization
   */
  validateOrganizationAccess(
    userRole: UserRole,
    userOrganizationId: number | undefined,
    targetOrganizationId: number,
  ): void {
    if (!this.canAccessOrganization(userRole, userOrganizationId, targetOrganizationId)) {
      throw new Error('Access denied: You can only access data within your organization');
    }
  }
}
