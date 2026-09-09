import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../entities/course.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { CourseContentService } from './course-content.service';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Enrollment])],
  providers: [CourseContentService],
  exports: [CourseContentService],
})
export class CourseContentModule {}
