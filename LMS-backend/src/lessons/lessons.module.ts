import { Module } from '@nestjs/common';
import { CourseContentModule } from '../common/course-content.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonsController } from './lessons.controller';
import { Lesson } from '../entities/lesson.entity';
import { CourseModule } from '../entities/module.entity';
import { Chapter } from '../entities/chapter.entity';
import { Course } from '../entities/course.entity';

@Module({
  imports: [CourseContentModule, TypeOrmModule.forFeature([Lesson, CourseModule, Chapter, Course])],

  controllers: [LessonsController],
})
export class LessonsModule {}
