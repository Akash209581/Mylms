import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ChaptersController } from './chapters.controller';
import { Chapter } from '../entities/chapter.entity';
import { CourseModule } from '../entities/module.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Chapter, CourseModule])],
  controllers: [ChaptersController],
  exports: [TypeOrmModule],
})
export class ChaptersModule {}
