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
import { User } from './entities/user.entity';
import { Course } from './entities/course.entity';
import { CourseModule } from './entities/module.entity';
import { Lesson } from './entities/lesson.entity';
import { Enrollment } from './entities/enrollment.entity';
import { Progress } from './entities/progress.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      entities: [User, Course, CourseModule, Lesson, Enrollment, Progress],
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
  ],
})
export class AppModule { }
