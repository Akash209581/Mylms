import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
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
import { Question, QuestionStatus } from '../entities/question.entity';
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
    @InjectRepository(Question) private questionRepo: Repository<Question>,
  ) { }

  @Get('dashboard')
  async getDashboard() {
    const [
      totalUsers,
      totalCourses,
      totalEnrollments,
      studentCount,
      instructorCount,
      adminCount,
      totalColleges,
      activeColleges,
      pendingCourses,
      approvedCourses,
      rejectedCourses,
      recentUsers,
    ] = await Promise.all([
      this.userRepo.count(),
      this.courseRepo.count(),
      this.enrollRepo.count(),
      this.userRepo.count({ where: { role: UserRole.STUDENT } }),
      this.userRepo.count({ where: { role: UserRole.INSTRUCTOR } }),
      this.userRepo.count({ where: { role: UserRole.ADMIN } }),
      this.collegeRepo.count(),
      this.collegeRepo.count({ where: { active: true } }),
      this.courseRepo.count({ where: { status: CourseStatus.PENDING_APPROVAL } }),
      this.courseRepo.count({ where: { status: CourseStatus.APPROVED } }),
      this.courseRepo.count({ where: { status: CourseStatus.REJECTED } }),
      this.userRepo.find({
        order: { createdAt: 'DESC' },
        take: 10,
        select: ['id', 'name', 'email', 'role', 'createdAt', 'collegeId', 'collegeName'],
      }),
    ]);

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
    const user = await this.userRepo.findOne({
      where: { id },
    });
    if (!user) throw new NotFoundException('User not found');

    const { passwordHash, ...safeUser } = user;

    let stats: any = {};

    if (user.role === UserRole.QUESTION_CREATOR) {
      const [total, approved, pending, rejected, draft] = await Promise.all([
        this.questionRepo.count({ where: { createdBy: user.id } }),
        this.questionRepo.count({ where: { createdBy: user.id, status: QuestionStatus.APPROVED } }),
        this.questionRepo.count({ where: { createdBy: user.id, status: QuestionStatus.PENDING_APPROVAL } }),
        this.questionRepo.count({ where: { createdBy: user.id, status: QuestionStatus.REJECTED } }),
        this.questionRepo.count({ where: { createdBy: user.id, status: QuestionStatus.DRAFT } }),
      ]);
      const deleted = await this.auditRepo.count({
        where: { action: 'QUESTION_DELETED', targetId: user.id },
      }).catch(() => 0);

      stats = {
        totalQuestions: total,
        approvedQuestions: approved,
        pendingQuestions: pending,
        rejectedQuestions: rejected,
        draftQuestions: draft,
        deletedQuestions: deleted,
      };
    } else if (user.role === UserRole.CONTENT_CREATOR || user.role === UserRole.INSTRUCTOR) {
      const [totalCourses, approvedCourses, pendingCourses, rejectedCourses, draftCourses] = await Promise.all([
        this.courseRepo.count({ where: { instructorId: user.id } }),
        this.courseRepo.count({ where: { instructorId: user.id, status: CourseStatus.APPROVED } }),
        this.courseRepo.count({ where: { instructorId: user.id, status: CourseStatus.PENDING_APPROVAL } }),
        this.courseRepo.count({ where: { instructorId: user.id, status: CourseStatus.REJECTED } }),
        this.courseRepo.count({ where: { instructorId: user.id, status: CourseStatus.DRAFT } }),
      ]);
      stats = {
        totalCourses,
        approvedCourses,
        pendingCourses,
        rejectedCourses,
        draftCourses,
      };
    } else if (user.role === UserRole.STUDENT) {
      const totalEnrollments = await this.enrollRepo.count({ where: { studentId: user.id } });
      stats = {
        totalEnrollments,
      };
    }

    return {
      ...safeUser,
      stats,
    };
  }

  @Put('users/:id')
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: any,
    @Request() req: any,
  ) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.email !== undefined) updateData.email = dto.email;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    // College update
    if (dto.role === UserRole.QUESTION_CREATOR || dto.role === UserRole.CONTENT_CREATOR) {
      updateData.collegeId = null;
      updateData.collegeName = null;
    } else if (dto.collegeName !== undefined) {
      if (dto.collegeName && dto.collegeName.trim()) {
        let college = await this.collegeRepo.findOne({
          where: { name: dto.collegeName.trim() },
        });
        if (!college) {
          college = this.collegeRepo.create({
            name: dto.collegeName.trim(),
            createdBy: req.user.sub,
            active: true,
          });
          await this.collegeRepo.save(college);
        }
        updateData.collegeId = college.id;
        updateData.collegeName = college.name;
      } else {
        updateData.collegeId = null;
        updateData.collegeName = null;
      }
    }

    // Student fields
    if (dto.mobileNumber !== undefined) updateData.mobileNumber = dto.mobileNumber;
    if (dto.country !== undefined) updateData.country = dto.country;
    if (dto.state !== undefined) updateData.state = dto.state;
    if (dto.course !== undefined) updateData.course = dto.course;
    if (dto.branch !== undefined) updateData.branch = dto.branch;
    if (dto.pursuingYear !== undefined) updateData.pursuingYear = dto.pursuingYear ? parseInt(dto.pursuingYear) : null;
    if (dto.semester !== undefined) updateData.semester = dto.semester ? parseInt(dto.semester) : null;
    if (dto.registrationNumber !== undefined) updateData.registrationNumber = dto.registrationNumber;

    // Optional password reset
    if (dto.password && dto.password.trim().length >= 6) {
      const bcrypt = require('bcrypt');
      updateData.passwordHash = await bcrypt.hash(dto.password.trim(), 10);
    }

    await this.userRepo.update(id, updateData);

    // Audit log
    const audit = this.auditRepo.create({
      actorId: req.user.sub,
      actorName: req.user.name || req.user.email,
      actorRole: req.user.role,
      action: 'USER_UPDATED',
      targetType: 'User',
      targetId: id,
      targetName: user.name,
      details: JSON.stringify({ updatedFields: Object.keys(updateData) }),
    });
    await this.auditRepo.save(audit);

    const updatedUser = await this.userRepo.findOne({ where: { id } });
    const { passwordHash: _, ...result } = updatedUser!;
    return {
      message: 'User updated successfully',
      user: result,
    };
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

  // ─── Approvals Hub ─────────────────────────────────────────────────────────

  @Get('approvals/summary')
  async getApprovalsSummary() {
    const pendingCourses = await this.courseRepo.count({
      where: { status: CourseStatus.PENDING_APPROVAL },
    });
    const approvedCourses = await this.courseRepo.count({
      where: { status: CourseStatus.APPROVED },
    });
    const rejectedCourses = await this.courseRepo.count({
      where: { status: CourseStatus.REJECTED },
    });
    const pendingQuestions = await this.questionRepo.count({
      where: { status: QuestionStatus.PENDING_APPROVAL, isActive: true },
    });
    const approvedQuestions = await this.questionRepo.count({
      where: { status: QuestionStatus.APPROVED, isActive: true },
    });
    const rejectedQuestions = await this.questionRepo.count({
      where: { status: QuestionStatus.REJECTED, isActive: true },
    });
    return {
      pendingCourses,
      approvedCourses,
      rejectedCourses,
      pendingQuestions,
      approvedQuestions,
      rejectedQuestions,
      totalPending: pendingCourses + pendingQuestions,
    };
  }

  @Get('approvals/courses')
  async getPendingCourses(@Query('status') status?: string) {
    const where: any = {};
    if (status && status !== 'ALL') {
      where.status = status;
    } else if (!status) {
      where.status = CourseStatus.PENDING_APPROVAL;
    }
    return this.courseRepo.find({
      where: Object.keys(where).length ? where : undefined,
      relations: ['instructor', 'approver', 'assignedColleges'],
      order: { createdAt: 'DESC' },
    });
  }

  @Put('courses/:id/approve')
  async approveCourse(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    await this.courseRepo.update(id, {
      status: CourseStatus.APPROVED,
      published: true,
      approvedBy: req.user.sub,
      rejectionReason: null,
    });
    return { success: true, message: 'Course approved successfully' };
  }

  @Put('courses/:id/reject')
  async rejectCourse(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    const course = await this.courseRepo.findOne({ where: { id } });
    if (!course) throw new NotFoundException('Course not found');
    await this.courseRepo.update(id, {
      status: CourseStatus.REJECTED,
      approvedBy: req.user.sub,
      rejectionReason: reason || 'Content does not meet curriculum quality standards',
    });
    return { success: true, message: 'Course rejected' };
  }

  @Get('approvals/questions')
  async getPendingQuestions(@Query('status') status?: string) {
    const where: any = { isActive: true };
    if (status && status !== 'ALL') {
      where.status = status;
    } else if (!status) {
      where.status = QuestionStatus.PENDING_APPROVAL;
    }
    return this.questionRepo.find({
      where,
      relations: ['creator', 'approver', 'college'],
      order: { createdAt: 'DESC' },
    });
  }

  private async generateQuestionNumber(
    type: string,
  ): Promise<string> {
    const prefix = type; // MCQ, FIB, MQ, JC, PQ, OP

    const lastQuestion = await this.questionRepo
      .createQueryBuilder('q')
      .where('q.type = :type', { type })
      .andWhere('q.questionNumber IS NOT NULL')
      .orderBy('q.id', 'DESC')
      .getOne();

    let nextNum = 1;
    if (lastQuestion && lastQuestion.questionNumber) {
      const numericPart = lastQuestion.questionNumber.replace(prefix, '');
      const lastNum = parseInt(numericPart, 10);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }

    let numStr = String(nextNum).padStart(4, '0');
    let finalCode = `${prefix}${numStr}`;

    let exists = await this.questionRepo.findOne({ where: { questionNumber: finalCode } });
    while (exists) {
      nextNum++;
      numStr = String(nextNum).padStart(4, '0');
      finalCode = `${prefix}${numStr}`;
      exists = await this.questionRepo.findOne({ where: { questionNumber: finalCode } });
    }

    return finalCode;
  }

  @Put('questions/:id/approve')
  async approveQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const question = await this.questionRepo.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    let questionNumber = question.questionNumber;
    if (!questionNumber) {
      questionNumber = await this.generateQuestionNumber(question.type);
    }
    await this.questionRepo.update(id, {
      status: QuestionStatus.APPROVED,
      questionNumber,
      approvedBy: req.user.sub,
      rejectionReason: undefined,
    });
    return { success: true, questionNumber, message: 'Question approved successfully' };
  }

  @Put('questions/:id/reject')
  async rejectQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    const question = await this.questionRepo.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    await this.questionRepo.update(id, {
      status: QuestionStatus.REJECTED,
      approvedBy: req.user.sub,
      rejectionReason: reason || 'Question does not meet assessment standards',
    });
    return { success: true, message: 'Question rejected' };
  }

  @Delete('questions/:id')
  async deleteQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const question = await this.questionRepo.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');

    try {
      // Clean up child relationships first to prevent FK constraints
      await this.questionRepo.manager.query(`DELETE FROM exam_questions WHERE question_id = $1`, [id]).catch(() => {});
      await this.questionRepo.manager.query(`DELETE FROM exam_coding_submissions WHERE question_id = $1`, [id]).catch(() => {});
      await this.questionRepo.manager.query(`DELETE FROM daily_streak WHERE question_id = $1`, [id]).catch(() => {});
      await this.questionRepo.manager.query(`DELETE FROM quiz_questions WHERE question_id = $1`, [id]).catch(() => {});
      await this.questionRepo.delete(id);
    } catch (err) {
      console.error('Hard delete failed, falling back to soft delete:', err);
      await this.questionRepo.update(id, { isActive: false, status: QuestionStatus.REJECTED });
    }

    // Log audit trail
    const audit = this.auditRepo.create({
      actorId: req.user.sub,
      actorName: req.user.name || req.user.email,
      actorRole: req.user.role,
      action: 'QUESTION_DELETED',
      targetType: 'Question',
      targetId: id,
      targetName: question.questionNumber || question.questionText?.substring(0, 50),
      details: JSON.stringify({
        type: question.type,
        status: question.status,
        difficulty: question.difficulty,
      }),
    });
    await this.auditRepo.save(audit);

    return { success: true, message: 'Question deleted successfully' };
  }
}
