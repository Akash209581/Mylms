import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StudentController } from './student.controller';
import { StudentService } from './student.service';
import { User } from '../entities/user.entity';
import { Progress } from '../entities/progress.entity';
import { Enrollment } from '../entities/enrollment.entity';
import { UserBadge } from '../entities/user-badge.entity';
import { Badge } from '../entities/badge.entity';
import { Lesson } from '../entities/lesson.entity';
import { Course } from '../entities/course.entity';
import { CourseModule } from '../entities/module.entity';
import { Chapter } from '../entities/chapter.entity';
import { Contest } from '../entities/contest.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Progress, Enrollment, UserBadge, Badge, Lesson, Course, CourseModule, Chapter, Contest]),
  ],
  controllers: [StudentController],
  providers: [StudentService],
  exports: [StudentService],
})
export class StudentModule {}
