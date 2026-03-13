import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Course } from '../entities/course.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { Lesson } from '../entities/lesson.entity';
import { AdminController } from './admin.controller';
import { NotificationService } from '../common/notification.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, Course, Enrollment, Lesson])],
  controllers: [AdminController],
  providers: [NotificationService],
})
export class AdminModule { }
