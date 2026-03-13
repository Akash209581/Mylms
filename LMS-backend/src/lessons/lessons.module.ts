import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LessonsController } from './lessons.controller';
import { Lesson } from '../entities/lesson.entity';
import { CourseModule } from '../entities/module.entity';
import { Course } from '../entities/course.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Lesson, CourseModule, Course])],
  controllers: [LessonsController],
})
export class LessonsModule {}
