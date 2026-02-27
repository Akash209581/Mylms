import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../entities/course.entity';
import { CoursesController } from './courses.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Course])],
    controllers: [CoursesController],
    exports: [TypeOrmModule],
})
export class CoursesModule { }
