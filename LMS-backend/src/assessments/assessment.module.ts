import { Module } from '@nestjs/common';
import { CourseContentModule } from '../common/course-content.module';
import { AssessmentController } from './assessment.controller';
import { AssessmentService } from './assessment.service';
@Module({ imports: [CourseContentModule], controllers: [AssessmentController], providers: [AssessmentService] })
export class AssessmentModule {}
