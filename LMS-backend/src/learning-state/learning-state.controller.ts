import { Body, Controller, Get, Param, ParseIntPipe, Patch, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { CourseReader } from '../common/course-content.service';
import { LearningStateService } from './learning-state.service';
import { UpdateCourseLearningStateDto, UpdateLessonLearningStateDto } from './learning-state.dto';

@Controller('learning-state')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class LearningStateController {
  constructor(private readonly learningState: LearningStateService) {}

  @Get('courses')
  listCourses(@Request() req: { user: CourseReader }) {
    return this.learningState.listCourses(req.user);
  }

  @Get('courses/:courseId')
  getCourse(@Request() req: { user: CourseReader }, @Param('courseId', ParseIntPipe) courseId: number) {
    return this.learningState.getCourse(req.user, courseId);
  }

  @Get('courses/:courseId/lessons')
  listLessons(@Request() req: { user: CourseReader }, @Param('courseId', ParseIntPipe) courseId: number) {
    return this.learningState.listLessons(req.user, courseId);
  }

  @Patch('courses/:courseId')
  updateCourse(@Request() req: { user: CourseReader }, @Param('courseId', ParseIntPipe) courseId: number,
    @Body() body: UpdateCourseLearningStateDto) {
    return this.learningState.updateCourse(req.user, courseId, body);
  }

  @Get('lessons/:lessonId')
  getLesson(@Request() req: { user: CourseReader }, @Param('lessonId', ParseIntPipe) lessonId: number) {
    return this.learningState.getLesson(req.user, lessonId);
  }

  @Patch('lessons/:lessonId')
  updateLesson(@Request() req: { user: CourseReader }, @Param('lessonId', ParseIntPipe) lessonId: number,
    @Body() body: UpdateLessonLearningStateDto) {
    return this.learningState.updateLesson(req.user, lessonId, body);
  }
}
