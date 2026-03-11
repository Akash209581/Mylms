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
        const adminCount = await this.userRepo.count({
          where: { collegeId: college.id, role: UserRole.ADMIN },
        });

        const instructorCount = await this.userRepo.count({
          where: { collegeId: college.id, role: UserRole.INSTRUCTOR },
        });

        const studentCount = await this.userRepo.count({
          where: { collegeId: college.id, role: UserRole.STUDENT },
        });

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
    return this.userRepo.find({
      where: { collegeId },
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

  @Delete('courses/:id')
  async deleteCourse(@Param('id', ParseIntPipe) id: number) {
    await this.courseRepo.delete(id);
    return { message: 'Course deleted' };
  }
}
