import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  /**
   * Notify all admins when a new course is created and needs approval
   */
  async notifyAdminsOfPendingCourse(
    courseTitle: string,
    instructorName: string,
    courseId: number,
  ) {
    try {
      // Get all admin and superadmin users
      const admins = await this.userRepo.find({
        where: [{ role: UserRole.ADMIN }, { role: UserRole.SUPERADMIN }],
        select: ['id', 'name', 'email', 'role'],
      });

      if (admins.length === 0) {
        this.logger.warn(
          'No admins found to notify about pending course approval',
        );
        return;
      }

      // In production, you would send actual emails here using NodeMailer, SendGrid, etc.
      // For now, we'll log the notifications
      for (const admin of admins) {
        this.logger.log(`
===========================================
📧 EMAIL NOTIFICATION TO ADMIN
===========================================
To: ${admin.email} (${admin.name})
Subject: New Course Approval Request

Dear ${admin.name},

A new course has been created and requires your approval:

Course Title: "${courseTitle}"
Instructor: ${instructorName}
Course ID: ${courseId}
Status: PENDING APPROVAL

Please review and approve/reject this course in the admin dashboard:
http://localhost:3002/dashboard/admin/courses

Best regards,
LMS System
===========================================
                `);
      }

      return { success: true, notifiedCount: admins.length };
    } catch (error) {
      this.logger.error(`Failed to notify admins: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify instructor when their course is approved
   */
  async notifyInstructorOfApproval(
    instructorEmail: string,
    instructorName: string,
    courseTitle: string,
    approvedByName: string,
  ) {
    try {
      this.logger.log(`
===========================================
📧 EMAIL NOTIFICATION TO INSTRUCTOR
===========================================
To: ${instructorEmail} (${instructorName})
Subject: Course Approved! 🎉

Dear ${instructorName},

Great news! Your course has been approved:

Course Title: "${courseTitle}"
Approved By: ${approvedByName}
Status: APPROVED & PUBLISHED

Your course is now visible to all students and can be enrolled.

View your course dashboard:
http://localhost:3002/dashboard/instructor/courses

Congratulations!
LMS System
===========================================
            `);

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to notify instructor of approval: ${error.message}`,
      );
      return { success: false, error: error.message };
    }
  }

  /**
   * Notify instructor when their course is rejected
   */
  async notifyInstructorOfRejection(
    instructorEmail: string,
    instructorName: string,
    courseTitle: string,
    rejectedByName: string,
    rejectionReason: string,
  ) {
    try {
      this.logger.log(`
===========================================
📧 EMAIL NOTIFICATION TO INSTRUCTOR
===========================================
To: ${instructorEmail} (${instructorName})
Subject: Course Approval Status Update

Dear ${instructorName},

Your course has been reviewed and requires some changes:

Course Title: "${courseTitle}"
Reviewed By: ${rejectedByName}
Status: REJECTED

Reason for rejection:
${rejectionReason}

Please review the feedback and make necessary changes. You can then resubmit your course for approval.

View your course dashboard:
http://localhost:3002/dashboard/instructor/courses

Best regards,
LMS System
===========================================
            `);

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Failed to notify instructor of rejection: ${error.message}`,
      );
      return { success: false, error: error.message };
    }
  }
}
