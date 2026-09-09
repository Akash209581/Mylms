import { Module } from '@nestjs/common';
import { CourseContentModule } from '../common/course-content.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChaptersController } from './chapters.controller';
import { Chapter } from '../entities/chapter.entity';
import { CourseModule } from '../entities/module.entity';

@Module({
  imports: [CourseContentModule, TypeOrmModule.forFeature([Chapter, CourseModule])],
  controllers: [ChaptersController],
  exports: [TypeOrmModule],
})
export class ChaptersModule {}
