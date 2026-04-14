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
import { CollegeModule } from './college/college.module';
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
import { College } from './entities/college.entity';
import { Organization } from './entities/organization.entity';
import { OrganizationModule } from './organization/organization.module';
import { Chapter } from './entities/chapter.entity';
import { Domain } from './entities/domain.entity';
import { Topic } from './entities/topic.entity';
import { ChaptersModule } from './chapters/chapters.module';
import { StudentModule } from './student/student.module';
import { Badge } from './entities/badge.entity';
import { UserBadge } from './entities/user-badge.entity';
import { ForumModule } from './forum/forum.module';
import { ForumPost } from './entities/forum-post.entity';
import { ForumReply } from './entities/forum-reply.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: 
        process.env.NODE_ENV === 'production' || 
        (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('localhost'))
          ? { rejectUnauthorized: false }
          : false,
      entities: [
        User,
        Course,
        CourseModule,
        Chapter,
        Lesson,
        Resource,
        Enrollment,
        Progress,
        Question,
        Contest,
        DailyStreak,
        College,
        Organization,
        Domain,
        Topic,
        Badge,
        UserBadge,
        ForumPost,
        ForumReply,
      ],
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    CoursesModule,
    EnrollmentsModule,
    InstructorModule,
    AdminModule,
    SuperadminModule,
    CollegeModule,
    QuestionBankModule,
    ContestModule,
    DailyStreakModule,
    ModulesModule,
    ChaptersModule,
    LessonsModule,
    OrganizationModule,
    StudentModule,
    ForumModule,
  ],


  providers: [KeepAliveService],
  exports: [],
})
export class AppModule { }
