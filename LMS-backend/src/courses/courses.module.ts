import { Module } from '@nestjs/common';
import { CourseContentModule } from '../common/course-content.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../entities/course.entity';
import { User } from '../entities/user.entity';
import { CourseModule } from '../entities/module.entity';
import { Chapter } from '../entities/chapter.entity';
import { Lesson } from '../entities/lesson.entity';
import { Resource } from '../entities/resource.entity';
import { College } from '../entities/college.entity';
import { CoursesController } from './courses.controller';
import { NotificationService } from '../common/notification.service';
import { CollegeFilterService } from '../common/college-filter.service';
import { CloudinaryService } from '../common/cloudinary.service';

@Module({
  imports: [
    CourseContentModule,
    TypeOrmModule.forFeature([Course, User, CourseModule, Chapter, Lesson, Resource, College]),
  ],

  controllers: [CoursesController],
  providers: [NotificationService, CollegeFilterService, CloudinaryService],
  exports: [TypeOrmModule],
})
export class CoursesModule {}

