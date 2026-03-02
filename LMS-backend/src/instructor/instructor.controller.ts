import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course, CourseStatus } from '../entities/course.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { UserRole } from '../entities/user.entity';

@Controller('instructor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPERADMIN)
export class InstructorController {
  constructor(
    @InjectRepository(Course)
    private courseRepo: Repository<Course>,
    @InjectRepository(Enrollment)
    private enrollRepo: Repository<Enrollment>,
  ) {}

  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    const courses = await this.courseRepo.find({
      where: { instructorId: req.user.sub },
      relations: ['approver'],
    });

    const courseIds = courses.map((c) => c.id);
    const totalStudents = courseIds.length
      ? await this.enrollRepo.count({
          where: courseIds.map((id) => ({ courseId: id })) as any,
        })
      : 0;

    // Count by status
    const pendingCourses = courses.filter(
      (c) => c.status === CourseStatus.PENDING_APPROVAL,
    ).length;
    const approvedCourses = courses.filter(
      (c) => c.status === CourseStatus.APPROVED,
    ).length;
    const rejectedCourses = courses.filter(
      (c) => c.status === CourseStatus.REJECTED,
    ).length;

    return {
      totalCourses: courses.length,
      totalStudents,
      pendingCourses,
      approvedCourses,
      rejectedCourses,
      courses,
    };
  }

  @Get('courses')
  async getMyCourses(@Request() req: any) {
    return this.courseRepo.find({
      where: { instructorId: req.user.sub },
      relations: ['approver'],
      order: { createdAt: 'DESC' },
    });
  }

  @Get('courses/pending')
  async getPendingCourses(@Request() req: any) {
    return this.courseRepo.find({
      where: {
        instructorId: req.user.sub,
        status: CourseStatus.PENDING_APPROVAL,
      },
      order: { createdAt: 'DESC' },
    });
  }

  @Get('courses/approved')
  async getApprovedCourses(@Request() req: any) {
    return this.courseRepo.find({
      where: {
        instructorId: req.user.sub,
        status: CourseStatus.APPROVED,
      },
      relations: ['approver'],
      order: { updatedAt: 'DESC' },
    });
  }

  @Get('courses/rejected')
  async getRejectedCourses(@Request() req: any) {
    return this.courseRepo.find({
      where: {
        instructorId: req.user.sub,
        status: CourseStatus.REJECTED,
      },
      relations: ['approver'],
      order: { updatedAt: 'DESC' },
    });
  }
}
