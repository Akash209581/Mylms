import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Enrollment } from '../entities/enrollment.entity';
import { UserRole } from '../entities/user.entity';
import { IsNumber } from 'class-validator';

class EnrollDto {
  @IsNumber() courseId: number;
}

@Controller('enrollments')
export class EnrollmentsController {
  constructor(
    @InjectRepository(Enrollment)
    private enrollRepo: Repository<Enrollment>,
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
