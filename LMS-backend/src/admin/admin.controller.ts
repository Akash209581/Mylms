import {
  Controller,
  Get,
  Delete,
  Put,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Course, CourseStatus } from '../entities/course.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { NotificationService } from '../common/notification.service';
import { ApproveCourseDto, RejectCourseDto } from '../courses/courses.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(Enrollment) private enrollRepo: Repository<Enrollment>,
    private notificationService: NotificationService,
  ) {}

  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    const userRole = req.user?.role;
    const organizationId = req.user?.organizationId;

    // ADMIN sees only their organization's data
    if (userRole === UserRole.ADMIN) {
      const totalUsers = await this.userRepo.count({
        where: { organizationId },
      });
      const totalCourses = await this.courseRepo.count({
        where: { organizationId },
      });
      const totalEnrollments = await this.enrollRepo.count();
      const pendingApprovals = await this.courseRepo.count({
        where: { status: CourseStatus.PENDING_APPROVAL, organizationId },
      });

      return {
        totalUsers,
        totalCourses,
        totalEnrollments,
        pendingApprovals,
      };
    }

    // SUPERADMIN sees all data (legacy support)
    const totalUsers = await this.userRepo.count();
    const totalCourses = await this.courseRepo.count();
    const totalEnrollments = await this.enrollRepo.count();
    const pendingApprovals = 0;

    const recentUsers = await this.userRepo.find({
      order: { createdAt: 'DESC' },
      take: 5,
      select: ['id', 'name', 'email', 'role', 'createdAt'],
    });

    return {
      totalUsers,
      totalCourses,
      totalEnrollments,
      pendingApprovals,
      recentUsers,
    };
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('users')
  async getUsers(@Request() req: any) {
    const userRole = req.user?.role;
    const organizationId = req.user?.organizationId;

    // ADMIN can only see INSTRUCTORS and STUDENTS from their organization
    if (userRole === UserRole.ADMIN) {
      return this.userRepo.find({
        where: {
          organizationId,
          role: In([UserRole.INSTRUCTOR, UserRole.STUDENT]),
        },
        select: ['id', 'name', 'email', 'role', 'createdAt', 'organizationId'],
        order: { createdAt: 'DESC' },
      });
    }

    // SUPERADMIN sees all users (legacy support)
    return this.userRepo.find({
      select: ['id', 'name', 'email', 'role', 'createdAt'],
    });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Delete('users/:id')
  async deleteUser(@Param('id') id: number) {
    await this.userRepo.delete(id);
    return { message: 'User deleted' };
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('courses')
  async getCourses() {
    return this.courseRepo.find({ relations: ['instructor', 'approver'] });
  }

  // ONLY ADMIN can see pending courses (NOT SUPERADMIN)
  @Roles(UserRole.ADMIN)
  @Get('courses/pending')
  async getPendingCourses(@Request() req: any) {
    console.log('📋 Fetching pending courses for ADMIN:', req.user?.email);
    const courses = await this.courseRepo.find({
      where: { status: CourseStatus.PENDING_APPROVAL },
      relations: ['instructor'],
      order: { createdAt: 'ASC' },
    });
    console.log(`Found ${courses.length} pending courses`);
    return courses;
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('courses/approved')
  async getApprovedCourses() {
    return this.courseRepo.find({
      where: { status: CourseStatus.APPROVED },
      relations: ['instructor', 'approver'],
      order: { updatedAt: 'DESC' },
    });
  }

  // ONLY ADMIN can see rejected courses (NOT SUPERADMIN)
  @Roles(UserRole.ADMIN)
  @Get('courses/rejected')
  async getRejectedCourses() {
    return this.courseRepo.find({
      where: { status: CourseStatus.REJECTED },
      relations: ['instructor', 'approver'],
      order: { updatedAt: 'DESC' },
    });
  }

  // ONLY ADMIN can approve courses (NOT SUPERADMIN)
  @Roles(UserRole.ADMIN)
  @Put('courses/:id/approve')
  async approveCourse(
    @Param('id') id: number,
    @Body() dto: ApproveCourseDto,
    @Request() req: any,
  ) {
    console.log('✅ Approving course:', id, 'by admin:', req.user?.email);
    const course = await this.courseRepo.findOne({
      where: { id },
      relations: ['instructor'],
    });

    if (!course) {
      return { success: false, message: 'Course not found' };
    }

    if (course.status !== CourseStatus.PENDING_APPROVAL) {
      return {
        success: false,
        message: `Course is already ${course.status.toLowerCase()}`,
      };
    }

    // Get approver details
    const approver = await this.userRepo.findOne({
      where: { id: req.user.sub },
      select: ['id', 'name', 'email'],
    });

    // Update course status
    course.status = CourseStatus.APPROVED;
    course.approvedBy = req.user.sub;
    course.published = true; // Automatically publish when approved
    course.rejectionReason = null;

    await this.courseRepo.save(course);

    // Notify instructor about approval
    await this.notificationService.notifyInstructorOfApproval(
      course.instructor.email,
      course.instructor.name,
      course.title,
      approver.name,
    );

    return {
      success: true,
      message: `Course "${course.title}" has been approved and is now visible to all users`,
      course: await this.courseRepo.findOne({
        where: { id },
        relations: ['instructor', 'approver'],
      }),
    };
  }

  // ONLY ADMIN can reject courses (NOT SUPERADMIN)
  @Roles(UserRole.ADMIN)
  @Put('courses/:id/reject')
  async rejectCourse(
    @Param('id') id: number,
    @Body() dto: RejectCourseDto,
    @Request() req: any,
  ) {
    const course = await this.courseRepo.findOne({
      where: { id },
      relations: ['instructor'],
    });

    if (!course) {
      return { success: false, message: 'Course not found' };
    }

    if (course.status !== CourseStatus.PENDING_APPROVAL) {
      return {
        success: false,
        message: `Course is already ${course.status.toLowerCase()}`,
      };
    }

    // Get rejector details
    const rejector = await this.userRepo.findOne({
      where: { id: req.user.sub },
      select: ['id', 'name', 'email'],
    });

    // Update course status
    course.status = CourseStatus.REJECTED;
    course.approvedBy = req.user.sub;
    course.published = false;
    course.rejectionReason = dto.reason;

    await this.courseRepo.save(course);

    // Notify instructor about rejection
    await this.notificationService.notifyInstructorOfRejection(
      course.instructor.email,
      course.instructor.name,
      course.title,
      rejector.name,
      dto.reason,
    );

    return {
      success: true,
      message: `Course "${course.title}" has been rejected`,
      course: await this.courseRepo.findOne({
        where: { id },
        relations: ['instructor', 'approver'],
      }),
    };
  }

  @Delete('courses/:id')
  async deleteCourse(@Param('id') id: number) {
    await this.courseRepo.delete(id);
    return { message: 'Course deleted successfully' };
  }
}
