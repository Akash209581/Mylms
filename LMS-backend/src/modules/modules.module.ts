import { Module } from '@nestjs/common';
import { CourseContentModule } from '../common/course-content.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ModulesController } from './modules.controller';
import { CourseModule as CourseModuleEntity } from '../entities/module.entity';
import { Course } from '../entities/course.entity';

@Module({
  imports: [CourseContentModule, TypeOrmModule.forFeature([CourseModuleEntity, Course])],
  controllers: [ModulesController],
})
export class ModulesModule {}
