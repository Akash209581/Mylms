import { Controller, Get, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Course } from '../entities/course.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { Question } from '../entities/question.entity';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('superadmin/reports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN)
export class ReportsController {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Course) private courseRepo: Repository<Course>,
    @InjectRepository(Enrollment) private enrollRepo: Repository<Enrollment>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
  ) { }

  @Get('overview')
  async getOverview() {
    const [totalUsers, totalCourses, totalEnrollments, totalQuestions] =
      await Promise.all([
        this.userRepo.count(),
        this.courseRepo.count(),
        this.enrollRepo.count(),
        this.questionRepo.count(),
      ]);

    // Users by Role
    const roles = await this.userRepo
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    // Recent Enrollments (last 30 days or just last 10)
    const recentEnrollments = await this.enrollRepo.find({
      relations: ['student', 'course'],
      order: { enrolledAt: 'DESC' },
      take: 10,
    });

    return {
      stats: { totalUsers, totalCourses, totalEnrollments, totalQuestions },
      roles,
      recentEnrollments,
    };
  }

  @Get('performance')
  async getPerformance() {
    // This could be more complex, but for now let's get enrollment counts per course
    const coursePerformance = await this.courseRepo
      .createQueryBuilder('course')
      .leftJoin('course.enrollments', 'enrollment')
      .select('course.title', 'title')
      .addSelect('COUNT(enrollment.id)', 'enrollmentCount')
      .groupBy('course.id')
      .orderBy('enrollmentCount', 'DESC')
      .take(10)
      .getRawMany();

    return { coursePerformance };
  }
}
