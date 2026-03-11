import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Course } from '../entities/course.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { User } from '../entities/user.entity';
import { InstructorController } from './instructor.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Course, Enrollment, User])],
  controllers: [InstructorController],
})
export class InstructorModule {}
