import {
  Body, Controller, Get, Param, ParseIntPipe, Post, Patch, Request, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { ExamStudentService } from './exam-student.service';
import { SaveMcqAnswersDto, RunCodeDto } from './exam.dto';

@Controller('student/exams')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class ExamStudentController {
  constructor(private readonly service: ExamStudentService) {}

  @Get()
  myExams(@Request() req) {
    return this.service.myExams(req.user);
  }

  @Get(':id')
  instructions(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.instructions(req.user, id);
  }

  @Post(':id/start')
  start(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.start(req.user, id);
  }

  @Get('attempts/:attemptId')
  getAttempt(@Request() req, @Param('attemptId', ParseIntPipe) attemptId: number) {
    return this.service.getAttempt(req.user, attemptId);
  }

  @Patch('attempts/:attemptId/answers')
  saveAnswers(
    @Request() req,
    @Param('attemptId', ParseIntPipe) attemptId: number,
    @Body() dto: SaveMcqAnswersDto,
  ) {
    return this.service.saveAnswers(req.user, attemptId, dto);
  }

  @Post('attempts/:attemptId/code')
  runCode(
    @Request() req,
    @Param('attemptId', ParseIntPipe) attemptId: number,
    @Body() dto: RunCodeDto,
  ) {
    return this.service.runCode(req.user, attemptId, dto);
  }

  @Get('attempts/:attemptId/code/jobs/:jobId')
  getJobStatus(
    @Request() req,
    @Param('attemptId', ParseIntPipe) attemptId: number,
    @Param('jobId') jobId: string,
  ) {
    return this.service.getJobStatus(req.user, attemptId, jobId);
  }

  @Post('attempts/:attemptId/submit')
  submit(@Request() req, @Param('attemptId', ParseIntPipe) attemptId: number) {
    return this.service.submitAttempt(req.user, attemptId);
  }

  @Get('attempts/:attemptId/result')
  result(@Request() req, @Param('attemptId', ParseIntPipe) attemptId: number) {
    return this.service.result(req.user, attemptId);
  }
}
