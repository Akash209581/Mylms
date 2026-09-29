import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  Request,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UseInterceptors,
  UploadedFile,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import * as bcrypt from 'bcrypt';
import * as ExcelJS from 'exceljs';
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

function generateStudent8CharPassword(): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const numbers = '23456789';
  const special = '@#$%&*!';

  const all = upper + lower + numbers + special;

  const chars = [
    upper.charAt(Math.floor(Math.random() * upper.length)),
    lower.charAt(Math.floor(Math.random() * lower.length)),
    numbers.charAt(Math.floor(Math.random() * numbers.length)),
    special.charAt(Math.floor(Math.random() * special.length)),
  ];

  for (let i = 0; i < 4; i++) {
    chars.push(all.charAt(Math.floor(Math.random() * all.length)));
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }

  return chars.join('');
}

// Priority order for the legacy singular `role` column when a user holds several
// roles at once — highest-privilege staff role wins over the narrower content roles.
const ROLE_PRIORITY: UserRole[] = [
  UserRole.SUPERADMIN,
  UserRole.ADMIN,
  UserRole.INSTRUCTOR,
  UserRole.QUESTION_CREATOR,
  UserRole.CONTENT_CREATOR,
  UserRole.STUDENT,
];

function primaryRole(roles: UserRole[]): UserRole {
  return ROLE_PRIORITY.find((r) => roles.includes(r)) || roles[0];
}

function extractVal(row: Record<string, any>, targetKeys: string[]): string {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const targets = targetKeys.map(normalize);

  for (const [key, val] of Object.entries(row)) {
    if (targets.includes(normalize(key))) {
      if (val !== undefined && val !== null) {
        return String(val).trim();
      }
    }
  }
  return '';
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

  @Get('users/bulk-template')
  async downloadBulkTemplate(@Res() res: Response) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Students Import Template');

    worksheet.columns = [
      { header: 'S.No', key: 'sNo', width: 8 },
      { header: 'Registration No', key: 'registrationNo', width: 18 },
      { header: 'Department', key: 'department', width: 15 },
      { header: 'Section', key: 'section', width: 10 },
      { header: 'Full Name', key: 'name', width: 22 },
      { header: 'Email ID', key: 'email', width: 25 },
      { header: 'Mobile Number', key: 'mobileNumber', width: 16 },
      { header: 'Academic Year', key: 'academicYear', width: 15 },
      { header: 'Current Year', key: 'currentYear', width: 14 },
      { header: 'college name', key: 'collegeName', width: 25 },
      { header: 'Batch No', key: 'batchNo', width: 12 },
    ];

    // Add sample rows
    worksheet.addRow({
      sNo: 1,
      registrationNo: 'REG2024001',
      department: 'Computer Science',
      section: 'A',
      name: 'John Doe',
      email: 'john.doe@example.com',
      mobileNumber: '9876543210',
      academicYear: '2024-2028',
      currentYear: '1st Year',
      collegeName: 'Harvard University',
      batchNo: 'B1',
    });

    worksheet.addRow({
      sNo: 2,
      registrationNo: 'REG2024002',
      department: 'Information Technology',
      section: 'B',
      name: 'Jane Smith',
      email: 'jane.smith@example.com',
      mobileNumber: '9876543211',
      academicYear: '2024-2028',
      currentYear: '1st Year',
      collegeName: 'Harvard University',
      batchNo: 'B1',
    });

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: '4F46E5' },
    };

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=Student_Bulk_Import_Template.xlsx',
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  @Post('users/bulk-upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async bulkUploadStudents(
    @UploadedFile() file: any,
    @Request() req: any,
  ) {
    return this.processBulkStudentFile(file, req);
  }

  @Post('users/bulk-upload-students')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async bulkUploadStudentsAlias(
    @UploadedFile() file: any,
    @Request() req: any,
  ) {
    return this.processBulkStudentFile(file, req);
  }

  private async processBulkStudentFile(file: any, req: any) {
    if (!file) {
      throw new BadRequestException('No Excel file uploaded');
    }

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(file.buffer);
    } catch (err: any) {
      throw new BadRequestException('Failed to parse Excel file: ' + err.message);
    }

    const worksheet = workbook.worksheets[0];
    if (!worksheet) {
      throw new BadRequestException('Excel file contains no worksheets');
    }

    const headers: string[] = [];
    const firstRow = worksheet.getRow(1);
    firstRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber] = cell.text ? cell.text.trim() : '';
    });

    const createdUsers: any[] = [];
    const skippedUsers: any[] = [];

    // Fetch existing colleges for fast mapping
    const existingColleges = await this.collegeRepo.find();
    const collegeMap = new Map<string, College>();
    existingColleges.forEach((c) => collegeMap.set(c.name.toLowerCase().trim(), c));

    const rows: { rowData: Record<string, any>; rowNum: number }[] = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rowData: Record<string, any> = {};
      let hasValue = false;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          const val = cell.text;
          if (val !== undefined && val !== null) {
            rowData[header] = val;
            if (val.trim() !== '') hasValue = true;
          }
        }
      });
      if (hasValue) {
        rows.push({ rowData, rowNum: rowNumber });
      }
    });

    if (rows.length > 5000) {
      throw new BadRequestException('A single upload can contain at most 5000 students');
    }

    const fileEmails = rows
      .map(({ rowData }) => extractVal(rowData, ['emailid', 'email id', 'email', 'email address']).toLowerCase().trim())
      .filter(Boolean);
    const existingEmails = new Set<string>();
    for (let i = 0; i < fileEmails.length; i += 1000) {
      const found: { email: string }[] = await this.userRepo
        .createQueryBuilder('u')
        .select('LOWER(u.email)', 'email')
        .where('LOWER(u.email) IN (:...emails)', { emails: fileEmails.slice(i, i + 1000) })
        .getRawMany();
      found.forEach((f) => existingEmails.add(f.email));
    }

    const pending: { user: User; plainPassword: string; sNo: string; registrationNo: string }[] = [];

    for (const { rowData } of rows) {
      const sNo = extractVal(rowData, ['sno', 's.no', 'slno', 'sl.no', 'serialno']);
      const registrationNo = extractVal(rowData, ['registrationno', 'registration number', 'regno', 'reg.no', 'registration_number']);
      const department = extractVal(rowData, ['department', 'dept', 'branch']);
      const section = extractVal(rowData, ['section', 'sec']);
      const name = extractVal(rowData, ['fullname', 'full name', 'name', 'student name']);
      const rawEmail = extractVal(rowData, ['emailid', 'email id', 'email', 'email address']);
      const email = rawEmail ? rawEmail.toLowerCase().trim() : '';
      const mobileNumber = extractVal(rowData, ['mobilenumber', 'mobile number', 'mobile', 'phone', 'contact']);
      const academicYear = extractVal(rowData, ['academicyear', 'academic year', 'academic_year']);
      const currentYear = extractVal(rowData, ['currentyear', 'current year', 'pursuingyear', 'year']);
      const rawCollegeName = extractVal(rowData, ['collegename', 'college name', 'college']);
      const batchNo = extractVal(rowData, ['batchno', 'batch no', 'batch', 'batch number']);

      if (!email || !name) {
        skippedUsers.push({
          sNo,
          registrationNo,
          name: name || 'N/A',
          email: rawEmail || 'N/A',
          reason: 'Missing required field (Email ID or Full Name)',
        });
        continue;
      }

      if (existingEmails.has(email)) {
        skippedUsers.push({
          sNo,
          registrationNo,
          name,
          email,
          reason: 'Email already exists in system',
        });
        continue;
      }

      // College resolution
      let targetCollege: College | undefined;
      if (rawCollegeName) {
        const normName = rawCollegeName.toLowerCase().trim();
        targetCollege = collegeMap.get(normName);
        if (!targetCollege) {
          // Auto create college if missing
          const newCol = this.collegeRepo.create({
            name: rawCollegeName.trim(),
            createdBy: req.user?.sub,
            active: true,
          });
          targetCollege = await this.collegeRepo.save(newCol);
          collegeMap.set(normName, targetCollege);
        }
      }

      const plainPassword = generateStudent8CharPassword();

      const user = this.userRepo.create({
        name,
        email,
        role: UserRole.STUDENT,
        roles: [UserRole.STUDENT],
        isActive: true,
        registrationNumber: registrationNo || undefined,
        department: department || undefined,
        section: section || undefined,
        academicYear: academicYear || undefined,
        currentYear: currentYear || undefined,
        batchNo: batchNo || undefined,
        mobileNumber: mobileNumber || undefined,
        collegeId: targetCollege?.id,
        collegeName: targetCollege?.name || rawCollegeName || undefined,
      });
      existingEmails.add(email);
      pending.push({ user, plainPassword, sNo, registrationNo });
    }

    // bcrypt runs on the libuv threadpool, so hashing a batch concurrently is
    // much faster than awaiting each hash in turn.
    const HASH_BATCH = 16;
    for (let i = 0; i < pending.length; i += HASH_BATCH) {
      const batch = pending.slice(i, i + HASH_BATCH);
      const hashes = await Promise.all(batch.map((p) => bcrypt.hash(p.plainPassword, 10)));
      batch.forEach((p, idx) => (p.user.passwordHash = hashes[idx]));
    }

    const toCreated = (p: (typeof pending)[number]) => ({
      id: p.user.id,
      sNo: p.sNo,
      registrationNo: p.user.registrationNumber || p.registrationNo || '',
      name: p.user.name,
      email: p.user.email,
      generatedPassword: p.plainPassword,
      collegeName: p.user.collegeName || '',
      department: p.user.department || '',
      section: p.user.section || '',
      academicYear: p.user.academicYear || '',
      currentYear: p.user.currentYear || '',
      batchNo: p.user.batchNo || '',
      mobileNumber: p.user.mobileNumber || '',
    });

    const SAVE_CHUNK = 200;
    for (let i = 0; i < pending.length; i += SAVE_CHUNK) {
      const chunk = pending.slice(i, i + SAVE_CHUNK);
      try {
        await this.userRepo.save(chunk.map((p) => p.user), { chunk: 100 });
        chunk.forEach((p) => createdUsers.push(toCreated(p)));
      } catch {
        // Fall back to row-by-row so one bad row doesn't sink the whole chunk.
        for (const p of chunk) {
          try {
            // The batch transaction rolled back, but ids generated inside it may
            // already be merged onto the entity.
            delete (p.user as any).id;
            await this.userRepo.save(p.user);
            createdUsers.push(toCreated(p));
          } catch (err: any) {
            skippedUsers.push({
              sNo: p.sNo,
              registrationNo: p.registrationNo,
              name: p.user.name,
              email: p.user.email,
              reason: err?.code === '23505' ? 'Duplicate value already exists in system' : 'Could not be saved',
            });
          }
        }
      }
    }

    // Log Audit
    const audit = this.auditRepo.create({
      actorId: req.user.sub,
      actorName: req.user.name || req.user.email,
      actorRole: req.user.role,
      action: 'BULK_USERS_CREATED',
      targetType: 'User',
      details: JSON.stringify({
        totalProcessed: rows.length,
        createdCount: createdUsers.length,
        skippedCount: skippedUsers.length,
      }),
    });
    await this.auditRepo.save(audit);

    return {
      success: true,
      totalProcessed: rows.length,
      createdCount: createdUsers.length,
      skippedCount: skippedUsers.length,
      createdUsers,
      skippedUsers,
    };
  }

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

    if (colleges.length === 0) return [];

    // Users match by collegeId OR by collegeName (legacy users without FK set).
    const counts: { college_id: number; admins: string; instructors: string; students: string }[] =
      await this.userRepo.query(
        `SELECT c.id AS college_id,
                COUNT(*) FILTER (WHERE u.role = 'ADMIN') AS admins,
                COUNT(*) FILTER (WHERE u.role = 'INSTRUCTOR') AS instructors,
                COUNT(*) FILTER (WHERE u.role = 'STUDENT') AS students
           FROM colleges c
           JOIN users u
             ON u.college_id = c.id
             OR LOWER(TRIM(u.college_name)) = LOWER(TRIM(c.name))
          WHERE c.id = ANY($1)
          GROUP BY c.id`,
        [colleges.map((c) => c.id)],
      );
    const countMap = new Map(counts.map((r) => [Number(r.college_id), r]));

    return colleges.map((college) => {
      const row = countMap.get(college.id);
      const adminCount = Number(row?.admins || 0);
      const instructorCount = Number(row?.instructors || 0);
      const studentCount = Number(row?.students || 0);

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
    });
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
        'roles',
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
        'u.roles',
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
    if (dto.email !== undefined) {
      const email = String(dto.email).toLowerCase().trim();
      if (email !== (user.email || '').toLowerCase()) {
        const taken = await this.userRepo.findOne({ where: { email }, select: ['id'] });
        if (taken && taken.id !== id) throw new ConflictException('Email already registered');
      }
      updateData.email = email;
    }
    if (dto.isActive !== undefined) updateData.isActive = !!dto.isActive;

    const validRoles = Object.values(UserRole) as string[];
    const requestedRoles: any[] = Array.isArray(dto.roles) && dto.roles.length > 0
      ? dto.roles
      : dto.role !== undefined ? [dto.role] : [];
    if (requestedRoles.some((r) => !validRoles.includes(r))) {
      throw new BadRequestException(`Invalid role. Must be one of: ${validRoles.join(', ')}`);
    }

    if (dto.roles !== undefined && Array.isArray(dto.roles) && dto.roles.length > 0) {
      if (dto.roles.includes(UserRole.STUDENT) && dto.roles.length > 1) {
        throw new BadRequestException('STUDENT role cannot be combined with staff roles');
      }
      updateData.roles = dto.roles;
      updateData.role = primaryRole(dto.roles);
    } else if (dto.role !== undefined) {
      updateData.role = dto.role;
      updateData.roles = [dto.role];
    }

    const effectiveRoles: string[] = updateData.roles || (user.roles || [user.role]);
    const isGlobalOnly = effectiveRoles.every(
      (r) => r === UserRole.QUESTION_CREATOR || r === UserRole.CONTENT_CREATOR,
    );

    // College update
    if (isGlobalOnly) {
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
    const toIntOrNull = (v: any) => {
      const n = parseInt(v, 10);
      return Number.isFinite(n) ? n : null;
    };
    if (dto.pursuingYear !== undefined) updateData.pursuingYear = toIntOrNull(dto.pursuingYear);
    if (dto.semester !== undefined) updateData.semester = toIntOrNull(dto.semester);
    if (dto.registrationNumber !== undefined) updateData.registrationNumber = dto.registrationNumber;

    // Optional password reset
    if (typeof dto.password === 'string' && dto.password.trim().length >= 6) {
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
