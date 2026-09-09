import { Controller, Get, UseGuards, Request, Param, ForbiddenException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Course, CourseStatus } from '../entities/course.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { User, UserRole } from '../entities/user.entity';

@Controller('instructor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR, UserRole.ADMIN, UserRole.SUPERADMIN)
export class InstructorController {
  constructor(
    @InjectRepository(Course)
    private courseRepo: Repository<Course>,
    @InjectRepository(Enrollment)
    private enrollRepo: Repository<Enrollment>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) { }

  private getInstructorCoursesQueryBuilder(req: any) {
    const userId = req.user.sub;
    const userCollegeId = req.user.collegeId;
    const userCollegeName = req.user.collegeName;

    const qb = this.courseRepo.createQueryBuilder('course')
      .leftJoinAndSelect('course.instructor', 'instructor')
      .leftJoinAndSelect('course.approver', 'approver')
      .leftJoinAndSelect('course.assignedColleges', 'assignedCollege');

    // Logic:
    // 1. Own courses (any status)
    // 2. Approved courses assigned to instructor's college
    
    const ownerCondition = 'course.instructorId = :userId';
    
    const collegeConditions: string[] = [];
    const params: any = { userId, approvedStatus: CourseStatus.APPROVED };

    if (userCollegeId) {
      collegeConditions.push('(course.collegeId = :effCollegeId OR assignedCollege.id = :effCollegeId)');
      params.effCollegeId = userCollegeId;
    }
    if (userCollegeName) {
      collegeConditions.push('(instructor.collegeName = :effCollegeName OR assignedCollege.name = :effCollegeName)');
      params.effCollegeName = userCollegeName;
    }
    
    if (collegeConditions.length > 0) {
      const collegeCondition = `(${collegeConditions.join(' OR ')})`;
      qb.where(`(${ownerCondition}) OR (course.status = :approvedStatus AND ${collegeCondition})`, params);
    } else {
      qb.where(ownerCondition, params);
    }

    return qb;
  }

  @Get('dashboard')
  async getDashboard(@Request() req: any) {
    const courses = await this.getInstructorCoursesQueryBuilder(req).getMany();

    // Count college students (consistent with My Students page)
    const collegeId = req.user?.collegeId;
    const isSuperAdmin = req.user?.role === UserRole.SUPERADMIN;
    
    const totalStudents = (collegeId || isSuperAdmin)
      ? await this.userRepo.count({
          where: {
            ...(isSuperAdmin ? {} : { collegeId }),
            role: UserRole.STUDENT,
          },
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
      draftCourses: courses.filter((c) => c.status === CourseStatus.DRAFT).length,
      courses,
    };
  }

  @Get('courses')
  async getMyCourses(@Request() req: any) {
    return this.getInstructorCoursesQueryBuilder(req)
      .orderBy('course.createdAt', 'DESC')
      .getMany();
  }

  @Get('courses/pending')
  async getPendingCourses(@Request() req: any) {
    return this.getInstructorCoursesQueryBuilder(req)
      .andWhere('course.status = :status', { status: CourseStatus.PENDING_APPROVAL })
      .orderBy('course.createdAt', 'DESC')
      .getMany();
  }

  @Get('courses/draft')
  async getDraftCourses(@Request() req: any) {
    return this.getInstructorCoursesQueryBuilder(req)
      .andWhere('course.status = :status', { status: CourseStatus.DRAFT })
      .orderBy('course.createdAt', 'DESC')
      .getMany();
  }

  @Get('courses/approved')
  async getApprovedCourses(@Request() req: any) {
    return this.getInstructorCoursesQueryBuilder(req)
      .andWhere('course.status = :status', { status: CourseStatus.APPROVED })
      .orderBy('course.updatedAt', 'DESC')
      .getMany();
  }

  @Get('courses/rejected')
  async getRejectedCourses(@Request() req: any) {
    return this.getInstructorCoursesQueryBuilder(req)
      .andWhere('course.status = :status', { status: CourseStatus.REJECTED })
      .orderBy('course.updatedAt', 'DESC')
      .getMany();
  }

  @Get('students')
  async getStudents(@Request() req: any) {
    const collegeId = req.user?.collegeId;
    const isSuperAdmin = req.user?.role === UserRole.SUPERADMIN;
    if (!isSuperAdmin && !collegeId) throw new ForbiddenException('A college assignment is required');

    // INSTRUCTOR can only see STUDENTS from their college
    // SUPERADMIN can see all students
    return this.userRepo.find({
      where: {
        ...(isSuperAdmin ? {} : { collegeId }),
        role: UserRole.STUDENT,
      },

      select: ['id', 'name', 'email', 'role', 'collegeId', 'collegeName', 'isActive', 'lastLoginAt', 'createdAt'],
      order: { createdAt: 'DESC' },
    });
  }

  @Get('students/:id')
  async getStudentById(@Param('id') id: number, @Request() req: any) {
    const collegeId = req.user?.collegeId;
    const isSuperAdmin = req.user?.role === UserRole.SUPERADMIN;
    if (!isSuperAdmin && !collegeId) throw new ForbiddenException('A college assignment is required');

    const user = await this.userRepo.findOne({
      where: {
        id,
        ...(isSuperAdmin ? {} : { collegeId }),
        role: UserRole.STUDENT,
      },
      select: ['id', 'name', 'email', 'role', 'collegeId', 'collegeName', 'isActive', 'lastLoginAt', 'createdAt', 'updatedAt'],
    });

    return user;
  }
}
