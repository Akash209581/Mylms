import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Course } from '../entities/course.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { AdminController } from './admin.controller';

@Module({
    imports: [TypeOrmModule.forFeature([User, Course, Enrollment])],
    controllers: [AdminController],
})
export class AdminModule { }
