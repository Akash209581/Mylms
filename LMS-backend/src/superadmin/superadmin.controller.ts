import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../entities/user.entity';
import { Course, CourseStatus } from '../entities/course.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { College } from '../entities/college.entity';
import { IsEnum, IsOptional } from 'class-validator';

class UpdateRoleDto {
  @IsEnum(UserRole) role: UserRole;
}

@Controller('superadmin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
export class SuperadminController {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(Enrollment) private enrollRepo: Repository<Enrollment>,
    @InjectRepository(College) private collegeRepo: Repository<College>,
  ) { }

  @Get('dashboard')
  async getDashboard() {
    const totalUsers = await this.userRepo.count();
    const totalCourses = await this.courseRepo.count();
    const totalEnrollments = await this.enrollRepo.count();
    const studentCount = await this.userRepo.count({
      where: { role: UserRole.STUDENT },
    });
    const instructorCount = await this.userRepo.count({
      where: { role: UserRole.INSTRUCTOR },
    });
    const adminCount = await this.userRepo.count({
      where: { role: UserRole.ADMIN },
    });

    // College count
    const totalColleges = await this.collegeRepo.count();
    const activeColleges = await this.collegeRepo.count({
      where: { active: true },
    });

    // Course status counts
    const pendingCourses = await this.courseRepo.count({
      where: { status: CourseStatus.PENDING_APPROVAL },
    });
    const approvedCourses = await this.courseRepo.count({
      where: { status: CourseStatus.APPROVED },
    });
    const rejectedCourses = await this.courseRepo.count({
      where: { status: CourseStatus.REJECTED },
    });

    const recentUsers = await this.userRepo.find({
      order: { createdAt: 'DESC' },
      take: 10,
      select: ['id', 'name', 'email', 'role', 'createdAt', 'collegeId', 'collegeName'],
    });

    return {
      totalUsers,
      totalCourses,
      totalEnrollments,
      totalColleges,
      activeColleges,
      studentCount,
      instructorCount,
      adminCount,
      pendingCourses,
      approvedCourses,
      rejectedCourses,
      recentUsers,
    };
  }

  // Get all colleges with user stats for SUPERADMIN dashboard
  @Get('colleges-stats')
  async getCollegesWithStats() {
    const colleges = await this.collegeRepo.find({
      where: { active: true },
      order: { name: 'ASC' },
    });

    const collegesWithStats = await Promise.all(
      colleges.map(async (college) => {
        // Count users matched by collegeId OR by collegeName (for legacy users without FK set)
        const countByRole = async (role: UserRole) => {
          const qb = this.userRepo.createQueryBuilder('u');
          qb.where(
            '(u.college_id = :cid OR (u.college_id IS NULL AND u.college_name = :cname))',
            { cid: college.id, cname: college.name },
          ).andWhere('u.role = :role', { role });
          return qb.getCount();
        };

        const adminCount = await countByRole(UserRole.ADMIN);
        const instructorCount = await countByRole(UserRole.INSTRUCTOR);
        const studentCount = await countByRole(UserRole.STUDENT);

        return {
          id: college.id,
          name: college.name,
          type: college.type,
          city: college.city,
          state: college.state,
          country: college.country,
          adminCount,
          instructorCount,
          studentCount,
          totalUsers: adminCount + instructorCount + studentCount,
          createdAt: college.createdAt,
        };
      }),
    );

    return collegesWithStats;
  }

  // Get simple list of all college names for dropdown
  @Get('colleges')
  async getAllColleges() {
    const colleges = await this.collegeRepo.find({
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });
    return colleges;
  }

  @Get('users')
  async getAllUsers() {
    return this.userRepo.find({
      select: [
        'id',
        'name',
        'email',
        'role',
        'createdAt',
        'collegeId',
        'collegeName',
        'isActive',
      ],
      order: { createdAt: 'DESC' },
    });
  }

  @Get('users/college/:collegeId')
  async getUsersByCollege(@Param('collegeId', ParseIntPipe) collegeId: number) {
    // Find the college name so we can also match legacy users by name
    const college = await this.collegeRepo.findOne({ where: { id: collegeId } });
    const collegeName = college?.name ?? '';

    return this.userRepo
      .createQueryBuilder('u')
      .where(
        '(u.college_id = :cid OR (u.college_id IS NULL AND u.college_name = :cname))',
        { cid: collegeId, cname: collegeName },
      )
      .select([
        'u.id',
        'u.name',
        'u.email',
        'u.role',
        'u.createdAt',
        'u.collegeId',
        'u.collegeName',
        'u.isActive',
      ])
      .orderBy('u.createdAt', 'DESC')
      .getMany();
  }

  @Get('users/:id')
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.userRepo.findOne({
      where: { id },
      select: [
        'id',
        'name',
        'email',
        'role',
        'collegeId',
        'collegeName',
        'isActive',
        'lastLoginAt',
        'createdAt',
        'updatedAt',
      ],
    });
  }

  @Put('users/:id/role')
  async changeRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRoleDto) {
    await this.userRepo.update(id, { role: dto.role });
    return { message: 'Role updated' };
  }

  @Delete('users/:id')
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    await this.userRepo.delete(id);
    return { message: 'User deleted' };
  }

  @Get('courses')
  async getAllCourses() {
    return this.courseRepo.find({
      relations: ['instructor', 'approver'],
      order: { createdAt: 'DESC' },
    });
  }

  @Get('courses/college/:collegeId')
  async getCoursesByCollege(@Param('collegeId', ParseIntPipe) collegeId: number) {
    // Find the college name so we can also match legacy users/courses by name
    const college = await this.collegeRepo.findOne({ where: { id: collegeId } });
    const collegeName = college?.name ?? '';

    // Courses directly belonging to this college:
    // 1. Course has college_id set to this college
    // 2. OR Course has no college_id but its instructor belongs to this college (by ID or legacy name)
    const directCourses = await this.courseRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.instructor', 'instructor')
      .leftJoinAndSelect('c.approver', 'approver')
      .where(
        '(c.college_id = :collegeId OR (c.college_id IS NULL AND instructor.id IS NOT NULL AND (instructor.college_id = :collegeId OR instructor.college_name = :collegeName)))',
        { collegeId, collegeName },
      )
      .andWhere('c.status = :status', { status: CourseStatus.APPROVED })
      .getMany();

    // Courses assigned to this college via the course_assignments join table
    // (Typically courses created by Super Admin or other colleges and shared)
    const assignedCourses = await this.courseRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.instructor', 'instructor')
      .leftJoinAndSelect('c.approver', 'approver')
      .innerJoin('course_assignments', 'ca', 'ca.course_id = c.id AND ca.college_id = :collegeId', { collegeId })
      .andWhere('c.status = :status', { status: CourseStatus.APPROVED })
      .getMany();

    // Merge and deduplicate by ID
    const allMap = new Map<number, Course>();
    for (const course of [...directCourses, ...assignedCourses]) {
      allMap.set(course.id, course);
    }

    return Array.from(allMap.values()).map((course) => ({
      id: course.id,
      title: course.title,
      status: course.status,
      createdBy: course.instructor
        ? { id: course.instructor.id, name: course.instructor.name, role: (course.instructor as any).role }
        : course.approver && (course.approver as any).role === UserRole.SUPERADMIN
        ? { id: course.approver.id, name: course.approver.name, role: UserRole.SUPERADMIN }
        : { id: null, name: 'SUPER ADMIN', role: UserRole.SUPERADMIN },
      assignedBy: course.approver
        ? { id: course.approver.id, name: course.approver.name, role: (course.approver as any).role }
        : null,
      createdAt: course.createdAt,
    }));
  }

  @Delete('courses/:id')
  async deleteCourse(@Param('id', ParseIntPipe) id: number) {
    await this.courseRepo.delete(id);
    return { message: 'Course deleted' };
  }
}
