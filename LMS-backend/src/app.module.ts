import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CoursesModule } from './courses/courses.module';
import { EnrollmentsModule } from './enrollments/enrollments.module';
import { InstructorModule } from './instructor/instructor.module';
import { AdminModule } from './admin/admin.module';
import { SuperadminModule } from './superadmin/superadmin.module';
import { QuestionBankModule } from './question-bank/question-bank.module';
import { ContestModule } from './contest/contest.module';
import { DailyStreakModule } from './daily-streak/daily-streak.module';
import { ModulesModule } from './modules/modules.module';
import { LessonsModule } from './lessons/lessons.module';
import { KeepAliveService } from './common/keepalive.service';
import { User } from './entities/user.entity';
import { Course } from './entities/course.entity';
import { CourseModule } from './entities/module.entity';
import { Lesson } from './entities/lesson.entity';
import { Resource } from './entities/resource.entity';
import { Enrollment } from './entities/enrollment.entity';
import { Progress } from './entities/progress.entity';
import { Question } from './entities/question.entity';
import { Contest } from './entities/contest.entity';
import { DailyStreak } from './entities/daily-streak.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('localhost')
        ? false
        : { rejectUnauthorized: false },
      entities: [
        User,
        Course,
        CourseModule,
        Lesson,
        Resource,
        Enrollment,
        Progress,
        Question,
        Contest,
        DailyStreak,
      ],
      synchronize: true,
      logging: false,
    }),
    AuthModule,
    UsersModule,
    CoursesModule,
    EnrollmentsModule,
    InstructorModule,
    AdminModule,
    SuperadminModule,
    QuestionBankModule,
    ContestModule,
    DailyStreakModule,
    ModulesModule,
    LessonsModule,
  ],
  providers: [KeepAliveService],
  exports: [],
})
export class AppModule { }
