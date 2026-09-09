import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Exam } from '../entities/exam.entity';
import { ExamQuestion } from '../entities/exam-question.entity';
import { ExamAssignment } from '../entities/exam-assignment.entity';
import { ExamAttempt } from '../entities/exam-attempt.entity';
import { ExamCodingSubmission } from '../entities/exam-coding-submission.entity';
import { Question } from '../entities/question.entity';
import { User } from '../entities/user.entity';
import { College } from '../entities/college.entity';
import { ExamService } from './exam.service';
import { ExamStudentService } from './exam-student.service';
import { ExamAnalyticsService } from './exam-analytics.service';
import { ExamExcelService } from './exam-excel.service';
import { ExamRunnerService } from './exam-runner.service';
import { ExamController } from './exam.controller';
import { ExamStudentController } from './exam-student.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Exam, ExamQuestion, ExamAssignment,
      ExamAttempt, ExamCodingSubmission,
      Question, User, College,
    ]),
  ],
  providers: [
    ExamService,
    ExamStudentService,
    ExamAnalyticsService,
    ExamExcelService,
    ExamRunnerService,
  ],
  controllers: [ExamController, ExamStudentController],
})
export class ExamModule {}
