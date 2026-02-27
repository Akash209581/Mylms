import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Course } from '../entities/course.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { SuperadminController } from './superadmin.controller';

@Module({
    imports: [TypeOrmModule.forFeature([User, Course, Enrollment])],
    controllers: [SuperadminController],
})
export class SuperadminModule { }
