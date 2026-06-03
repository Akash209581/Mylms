import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enrollment } from '../entities/enrollment.entity';
import { Course } from '../entities/course.entity';
import { User } from '../entities/user.entity';
import { EnrollmentsController } from './enrollments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Enrollment, Course, User])],
  controllers: [EnrollmentsController],
})
export class EnrollmentsModule {}
