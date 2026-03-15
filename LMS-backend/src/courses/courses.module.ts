import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../entities/course.entity';
import { User } from '../entities/user.entity';
import { CourseModule } from '../entities/module.entity';
import { Lesson } from '../entities/lesson.entity';
import { Resource } from '../entities/resource.entity';
import { College } from '../entities/college.entity';
import { CoursesController } from './courses.controller';
import { NotificationService } from '../common/notification.service';
import { CollegeFilterService } from '../common/college-filter.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Course, User, CourseModule, Lesson, Resource, College]),
  ],
  controllers: [CoursesController],
  providers: [NotificationService, CollegeFilterService],
  exports: [TypeOrmModule],
})
export class CoursesModule {}
