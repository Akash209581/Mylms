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
      .addSelect('CAST(COUNT(*) AS INTEGER)', 'count')
      .groupBy('user.role')
      .getRawMany();

    // Monthly enrollment trend — last 6 months
    const enrollmentsByMonth = await this.enrollRepo
      .createQueryBuilder('e')
      .select("TO_CHAR(e.enrolled_at, 'Mon')", 'month')
      .addSelect("TO_CHAR(e.enrolled_at, 'YYYY-MM')", 'monthKey')
      .addSelect('CAST(COUNT(*) AS INTEGER)', 'count')
      .where("e.enrolled_at >= NOW() - INTERVAL '6 months'")
      .groupBy("TO_CHAR(e.enrolled_at, 'Mon'), TO_CHAR(e.enrolled_at, 'YYYY-MM')")
      .orderBy("TO_CHAR(e.enrolled_at, 'YYYY-MM')", 'ASC')
      .getRawMany();

    // Top courses by enrollment
    const topCourses = await this.courseRepo
      .createQueryBuilder('course')
      .leftJoin('course.enrollments', 'enrollment')
      .select(['course.id', 'course.title', 'course.category'])
      .addSelect('CAST(COUNT(enrollment.id) AS INTEGER)', 'enrollmentCount')
      .groupBy('course.id')
      .orderBy('"enrollmentCount"', 'DESC')
      .take(10)
      .getRawMany();

    // Recent Enrollments with correct relation name
    const recentEnrollments = await this.enrollRepo.find({
      relations: ['student', 'course'],
      order: { enrolledAt: 'DESC' },
      take: 10,
    });

    return {
      stats: { totalUsers, totalCourses, totalEnrollments, totalQuestions },
      roles,
      enrollmentsByMonth: enrollmentsByMonth.map(e => ({ month: e.month, count: e.count })),
      topCourses: topCourses.map(c => ({
        id: c.course_id,
        title: c.course_title,
        category: c.course_category,
        enrollmentCount: c.enrollmentCount,
      })),
      recentEnrollments: recentEnrollments.map(e => ({
        id: e.id,
        enrolledAt: e.enrolledAt,
        user: e.student ? { name: e.student.name } : null,
        course: e.course ? { title: e.course.title } : null,
      })),
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
