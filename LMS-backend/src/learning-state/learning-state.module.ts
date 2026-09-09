import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CourseContentModule } from '../common/course-content.module';
import { Lesson } from '../entities/lesson.entity';
import { CourseLearningState } from './course-learning-state.entity';
import { LessonLearningState } from './lesson-learning-state.entity';
import { LearningStateController } from './learning-state.controller';
import { LearningStateService } from './learning-state.service';

@Module({
  imports: [TypeOrmModule.forFeature([CourseLearningState, LessonLearningState, Lesson]), CourseContentModule],
  controllers: [LearningStateController],
  providers: [LearningStateService],
})
export class LearningStateModule {}
