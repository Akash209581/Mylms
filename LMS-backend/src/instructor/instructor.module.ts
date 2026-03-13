import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../entities/course.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { InstructorController } from './instructor.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Enrollment])],
  controllers: [InstructorController],
})
export class InstructorModule {}
