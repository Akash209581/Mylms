import { canEditCourse } from '../common/course-access';
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
  HttpException,
  HttpStatus,
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
@Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
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
    const collegeId = req.user?.collegeId;

    // ADMIN sees only their college's data
    if (userRole === UserRole.ADMIN) {
      if (!collegeId) throw new HttpException('A college assignment is required', HttpStatus.FORBIDDEN);
      const [totalUsers, totalCourses, totalEnrollments, pendingApprovals] = await Promise.all([
        this.userRepo.count({ where: { collegeId } }),
        this.courseRepo.count({ where: { collegeId } }),
        this.enrollRepo.count({ where: { student: { collegeId } } }),
        this.courseRepo.count({ where: { status: CourseStatus.PENDING_APPROVAL, collegeId } }),
      ]);

      return {
        totalUsers,
        totalCourses,
        totalEnrollments,
        pendingApprovals,
      };
    }

    // SUPERADMIN sees all data (legacy support)
    const [totalUsers, totalCourses, totalEnrollments, recentUsers] = await Promise.all([
      this.userRepo.count(),
      this.courseRepo.count(),
      this.enrollRepo.count(),
      this.userRepo.find({
        order: { createdAt: 'DESC' },
        take: 5,
        select: ['id', 'name', 'email', 'role', 'createdAt'],
      }),
    ]);

    return {
      totalUsers,
      totalCourses,
      totalEnrollments,
      pendingApprovals: 0,
      recentUsers,
    };
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('users')
  async getUsers(@Request() req: any) {
    const userRole = req.user?.role;
    const collegeId = req.user?.collegeId;

    // ADMIN can only see INSTRUCTORS and STUDENTS from their college
    if (userRole === UserRole.ADMIN) {
      if (!collegeId) throw new HttpException('A college assignment is required', HttpStatus.FORBIDDEN);
      return this.userRepo.find({
        where: {
          collegeId,
          role: In([UserRole.INSTRUCTOR, UserRole.STUDENT]),
        },
        select: ['id', 'name', 'email', 'role', 'createdAt', 'collegeId'],
        order: { createdAt: 'DESC' },
      });
    }

    // SUPERADMIN sees all users (legacy support)
    return this.userRepo.find({
      select: ['id', 'name', 'email', 'role', 'createdAt'],
    });
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('users/:id')
  async getUserById(@Param('id') id: number, @Request() req: any) {
    const userRole = req.user?.role;
    const collegeId = req.user?.collegeId;

    const user = await this.userRepo.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'role', 'collegeId', 'collegeName', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt'],
    });

    if (!user) {
      return null;
    }

    // ADMIN can only see users from their college (INSTRUCTOR or STUDENT)
    if (userRole === UserRole.ADMIN) {
      if (!collegeId) throw new HttpException('A college assignment is required', HttpStatus.FORBIDDEN);
      if (user.collegeId !== collegeId) {
        return null; // Not authorized to view this user
      }
      if (user.role !== UserRole.INSTRUCTOR && user.role !== UserRole.STUDENT) {
        return null; // ADMIN cannot view other ADMINs or SUPERADMINs
      }
    }

    return user;
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Delete('users/:id')
  async deleteUser(@Param('id') id: number, @Request() req: any) {
    const user = await this.getUserById(id, req);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    if (user.id === req.user.sub || (req.user.role !== UserRole.SUPERADMIN && ![UserRole.STUDENT, UserRole.INSTRUCTOR].includes(user.role))) {
      throw new HttpException('You cannot delete this user', HttpStatus.FORBIDDEN);
    }
    await this.userRepo.delete(id);
    return { message: 'User deleted' };
  }

  private getCourseQueryBuilderWithCollegeFilter(req: any) {
    const userRole = req.user?.role;
    const userCollegeId = req.user?.collegeId;
    const userCollegeName = req.user?.collegeName;

    const qb = this.courseRepo.createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('course.approver', 'approver')
      .leftJoinAndSelect('course.assignedColleges', 'assignedCollege');

    if (userRole === UserRole.SUPERADMIN) {
      return qb;
    }

    if (!userCollegeId && !userCollegeName) {
      qb.andWhere('1 = 0');
      return qb;
    }

    const collegeConditions: string[] = [];
    const params: any = {};

    if (userCollegeId) {
      collegeConditions.push('(course.collegeId = :effCollegeId OR assignedCollege.id = :effCollegeId)');
      params.effCollegeId = userCollegeId;
    }
    if (userCollegeName) {
      collegeConditions.push('(instructor.collegeName = :effCollegeName OR assignedCollege.name = :effCollegeName)');
      params.effCollegeName = userCollegeName;
    }

    return qb.andWhere(`(${collegeConditions.join(' OR ')})`, params);
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('courses')
  async getCourses(@Request() req: any) {
    return this.getCourseQueryBuilderWithCollegeFilter(req)
      .orderBy('course.createdAt', 'DESC')
      .getMany();
  }

  // ONLY ADMIN can see pending courses (NOT SUPERADMIN)
  @Roles(UserRole.ADMIN)
  @Get('courses/pending')
  async getPendingCourses(@Request() req: any) {
    return this.getCourseQueryBuilderWithCollegeFilter(req)
      .andWhere('course.status = :status', { status: CourseStatus.PENDING_APPROVAL })
      .orderBy('course.createdAt', 'ASC')
      .getMany();
  }

  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get('courses/approved')
  async getApprovedCourses(@Request() req: any) {
    return this.getCourseQueryBuilderWithCollegeFilter(req)
      .andWhere('course.status = :status', { status: CourseStatus.APPROVED })
      .orderBy('course.updatedAt', 'DESC')
      .getMany();
  }

  // ONLY ADMIN can see rejected courses (NOT SUPERADMIN)
  @Roles(UserRole.ADMIN)
  @Get('courses/rejected')
  async getRejectedCourses(@Request() req: any) {
    return this.getCourseQueryBuilderWithCollegeFilter(req)
      .andWhere('course.status = :status', { status: CourseStatus.REJECTED })
      .orderBy('course.updatedAt', 'DESC')
      .getMany();
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

    if (!canEditCourse(req.user, course)) {
      throw new HttpException('You can only review courses owned by your college', HttpStatus.FORBIDDEN);
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

    if (!approver) {
      throw new HttpException('Approver user not found', HttpStatus.UNAUTHORIZED);
    }

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

    if (!canEditCourse(req.user, course)) {
      throw new HttpException('You can only review courses owned by your college', HttpStatus.FORBIDDEN);
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

    if (!rejector) {
      throw new HttpException('Rejector user not found', HttpStatus.UNAUTHORIZED);
    }

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
  async deleteCourse(@Param('id') id: number, @Request() req: any) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new HttpException('Course not found', HttpStatus.NOT_FOUND);
    if (req.user.role !== UserRole.SUPERADMIN && (!req.user.collegeId || course.collegeId !== req.user.collegeId)) {
      throw new HttpException('You cannot delete this course', HttpStatus.FORBIDDEN);
    }
    await this.courseRepo.delete(id);
    return { message: 'Course deleted successfully' };
  }
}
