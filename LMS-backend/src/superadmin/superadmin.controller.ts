import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  Request,
  NotFoundException,
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
import { AuditLog } from '../entities/audit-log.entity';
import { Settings } from '../entities/settings.entity';
import { IsEnum } from 'class-validator';

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
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
    @InjectRepository(Settings) private settingsRepo: Repository<Settings>,
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
            '(u.college_id = :cid OR LOWER(TRIM(u.college_name)) = LOWER(TRIM(:cname)))',
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
          logoUrl: college.logoUrl,
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
      select: ['id', 'name', 'logoUrl'],
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
        '(u.college_id = :cid OR LOWER(TRIM(u.college_name)) = LOWER(TRIM(:cname)))',
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
  async changeRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
    @Request() req: any,
  ) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    const oldRole = user.role;
    await this.userRepo.update(id, { role: dto.role });

    // Log audit trail
    const audit = this.auditRepo.create({
      actorId: req.user.sub,
      actorName: req.user.name || req.user.email,
      actorRole: req.user.role,
      action: 'ROLE_CHANGED',
      targetType: 'User',
      targetId: id,
      targetName: user.name,
      details: JSON.stringify({ oldRole, newRole: dto.role }),
    });
    await this.auditRepo.save(audit);

    return { message: 'Role updated' };
  }

  @Delete('users/:id')
  async deleteUser(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    await this.userRepo.delete(id);

    // Log audit trail
    const audit = this.auditRepo.create({
      actorId: req.user.sub,
      actorName: req.user.name || req.user.email,
      actorRole: req.user.role,
      action: 'USER_DELETED',
      targetType: 'User',
      targetId: id,
      targetName: user.name,
      details: JSON.stringify({ email: user.email }),
    });
    await this.auditRepo.save(audit);

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

    // Courses directly belonging to this college
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
  async deleteCourse(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    await this.courseRepo.delete(id);

    // Log audit trail
    const audit = this.auditRepo.create({
      actorId: req.user.sub,
      actorName: req.user.name || req.user.email,
      actorRole: req.user.role,
      action: 'COURSE_DELETED',
      targetType: 'Course',
      targetId: id,
      targetName: course.title,
      details: JSON.stringify({ category: course.category }),
    });
    await this.auditRepo.save(audit);

    return { message: 'Course deleted' };
  }

  @Get('audit-log')
  async getAuditLog() {
    return this.auditRepo.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  @Get('settings')
  async getSettings() {
    const dbSettings = await this.settingsRepo.find();
    const settingsMap = dbSettings.reduce((acc, s) => {
      let val: any = s.value;
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (!isNaN(Number(val))) val = Number(val);
      acc[s.key] = val;
      return acc;
    }, {} as any);

    return {
      platformName: settingsMap.platformName ?? 'EduVerse LMS',
      supportEmail: settingsMap.supportEmail ?? 'support@eduverse.in',
      maintenanceMode: settingsMap.maintenanceMode ?? false,
      allowRegistrations: settingsMap.allowRegistrations ?? true,
      maxCoursesPerInstructor: settingsMap.maxCoursesPerInstructor ?? 20,
      defaultEnrollmentApproval: settingsMap.defaultEnrollmentApproval ?? 'AUTO',
    };
  }

  @Put('settings')
  async updateSettings(@Body() body: any) {
    for (const [key, value] of Object.entries(body)) {
      let s = await this.settingsRepo.findOne({ where: { key } });
      if (!s) {
        s = this.settingsRepo.create({ key, value: String(value) });
      } else {
        s.value = String(value);
      }
      await this.settingsRepo.save(s);
    }
    return { message: 'Settings saved', data: body };
  }
}
