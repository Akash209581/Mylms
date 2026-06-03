import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from '../entities/enrollment.entity';
import { Course } from '../entities/course.entity';
import { User, UserRole } from '../entities/user.entity';
import { IsNumber } from 'class-validator';

class EnrollDto {
  @IsNumber() courseId: number;
}

@Controller('enrollments')
export class EnrollmentsController {
  constructor(
    @InjectRepository(Enrollment)
    private enrollRepo: Repository<Enrollment>,
    @InjectRepository(Course)
    private courseRepo: Repository<Course>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('my')
  async getMyEnrollments(@Request() req: any) {
    return this.enrollRepo.find({
      where: { studentId: req.user.sub },
      relations: ['course'],
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.STUDENT)
  @Post()
  async enroll(@Body() dto: EnrollDto, @Request() req: any) {
    // 1. Load course with assignedColleges relation
    const course = await this.courseRepo.findOne({
      where: { id: dto.courseId },
      relations: ['assignedColleges'],
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // 2. Validate course status and published state
    if (course.status !== 'APPROVED' || !course.published) {
      throw new ForbiddenException('This course is not approved or published');
    }

    // 3. Load student
    const student = await this.userRepo.findOne({
      where: { id: req.user.sub },
    });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // 4. Validate college tenancy (course collegeId matches or is in assignedColleges)
    const isOwnCollege = course.collegeId === student.collegeId;
    const isAssigned = course.assignedColleges?.some(c => c.id === student.collegeId);

    if (!isOwnCollege && !isAssigned) {
      throw new ForbiddenException('You do not belong to the college hosting or assigned this course');
    }

    // 5. Check existing enrollment
    const existing = await this.enrollRepo.findOne({
      where: { studentId: req.user.sub, courseId: dto.courseId },
    });
    if (existing) return { message: 'Already enrolled' };

    const enrollment = this.enrollRepo.create({
      studentId: req.user.sub,
      courseId: dto.courseId,
    });
    return this.enrollRepo.save(enrollment);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @Get()
  async getAllEnrollments() {
    return this.enrollRepo.find({ relations: ['student', 'course'] });
  }
}
