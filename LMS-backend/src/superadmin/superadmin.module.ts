import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Course } from '../entities/course.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { Question } from '../entities/question.entity';
import { SuperadminController } from './superadmin.controller';
import { ReportsController } from './reports.controller';

@Module({
    imports: [TypeOrmModule.forFeature([User, Course, Enrollment, Question])],
    controllers: [SuperadminController, ReportsController],
})
export class SuperadminModule { }
