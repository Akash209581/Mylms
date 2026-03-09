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
      select: ['id', 'name', 'email', 'role', 'createdAt'],
    });

    return {
      totalUsers,
      totalCourses,
      totalEnrollments,
      studentCount,
      instructorCount,
      adminCount,
      pendingCourses,
      approvedCourses,
      rejectedCourses,
      recentUsers,
    };
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
        'organizationId',
        'collegeName',
      ],
      relations: ['organization'],
      order: { createdAt: 'DESC' },
    });
  }

  @Get('users/organization/:organizationId')
  async getUsersByOrganization(@Param('organizationId') organizationId: number) {
    return this.userRepo.find({
      where: { organizationId },
      select: [
        'id',
        'name',
        'email',
        'role',
        'createdAt',
        'organizationId',
        'collegeName',
      ],
      relations: ['organization'],
      order: { createdAt: 'DESC' },
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
