import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put,
  Query, Request, Res, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { ExamService } from './exam.service';
import { ExamAnalyticsService } from './exam-analytics.service';
import { ExamExcelService } from './exam-excel.service';
import {
  CreateExamDto, UpdateExamDto, AddManyExamQuestionsDto,
  AssignStudentsDto, AssignCollegesDto, ImportMcqConfirmDto,
  CloneExamDto, UpdateQuestionMarksDto, UpdateQuestionHintSettingsDto,
} from './exam.dto';

@Controller('exams')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR)
export class ExamController {
  constructor(
    private readonly service: ExamService,
    private readonly analytics: ExamAnalyticsService,
    private readonly excel: ExamExcelService,
  ) {}

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  @Post()
  create(@Request() req, @Body() dto: CreateExamDto) {
    return this.service.create(req.user, dto);
  }

  @Post(':id/clone')
  clone(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CloneExamDto,
  ) {
    return this.service.cloneExam(req.user, id, dto);
  }

  @Get('colleges')
  getColleges(@Request() req) {
    return this.service.getColleges(req.user);
  }

  @Get()
  list(@Request() req) {
    return this.service.list(req.user);
  }

  @Get(':id')
  findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(req.user, id);
  }

  @Put(':id')
  update(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExamDto) {
    return this.service.update(req.user, id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(req.user, id);
  }

  @Post(':id/publish')
  publish(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.publish(req.user, id);
  }

  // ─── Questions ────────────────────────────────────────────────────────────

  @Post(':id/questions/mcq')
  addMcq(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddManyExamQuestionsDto,
  ) {
    return this.service.addQuestions(req.user, id, dto, 'A');
  }

  @Post(':id/questions/coding')
  addCoding(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddManyExamQuestionsDto,
  ) {
    return this.service.addQuestions(req.user, id, dto, 'B');
  }

  @Put(':id/questions/:questionId/marks')
  updateQuestionMarks(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: UpdateQuestionMarksDto,
  ) {
    return this.service.updateQuestionMarks(req.user, id, questionId, dto);
  }

  @Put(':id/questions/:questionId/hint-settings')
  updateQuestionHintSettings(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('questionId', ParseIntPipe) questionId: number,
    @Body() dto: UpdateQuestionHintSettingsDto,
  ) {
    return this.service.updateQuestionHintSettings(req.user, id, questionId, dto);
  }

  @Delete(':id/questions/:questionId')
  removeQuestion(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('questionId', ParseIntPipe) questionId: number,
  ) {
    return this.service.removeQuestion(req.user, id, questionId);
  }

  @Put(':id/questions/reorder')
  reorder(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { orderedIds: number[] },
  ) {
    return this.service.reorderQuestions(req.user, id, body.orderedIds);
  }

  // ─── Excel Import ─────────────────────────────────────────────────────────

  @Get(':id/import-mcq/template')
  downloadTemplate(@Res() res: Response) {
    const buffer = this.excel.generateTemplate();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=mcq-import-template.xlsx');
    res.send(buffer);
  }

  @Post(':id/import-mcq/validate')
  @UseInterceptors(FileInterceptor('file'))
  validateImport(@UploadedFile() file: any) {
    if (!file) throw new Error('File is required');
    return this.excel.validate(file.buffer, file.originalname);
  }

  @Post(':id/import-mcq/confirm')
  confirmImport(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ImportMcqConfirmDto,
  ) {
    return this.service.confirmImport(req.user, id, dto);
  }

  // ─── Assign ───────────────────────────────────────────────────────────────

  @Post(':id/assign')
  assign(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignStudentsDto,
  ) {
    return this.service.assign(req.user, id, dto);
  }

  @Delete(':id/assign/:studentId')
  unassign(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return this.service.unassign(req.user, id, studentId);
  }

  @Get(':id/assigned')
  listAssigned(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.listAssigned(req.user, id);
  }

  @Post(':id/assign/colleges')
  assignColleges(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignCollegesDto,
  ) {
    return this.service.assignColleges(req.user, id, dto);
  }

  @Delete(':id/assign/colleges/:collegeId')
  unassignCollege(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('collegeId', ParseIntPipe) collegeId: number,
  ) {
    return this.service.unassignCollege(req.user, id, collegeId);
  }

  @Get(':id/assigned-colleges')
  listAssignedColleges(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.listAssignedColleges(req.user, id);
  }

  // ─── Attempts (admin view) ────────────────────────────────────────────────

  @Get(':id/attempts')
  attempts(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.listAttempts(req.user, id);
  }

  // ─── Analytics ────────────────────────────────────────────────────────────

  @Get(':id/analytics')
  analyticsOverview(@Param('id', ParseIntPipe) id: number) {
    return this.analytics.overview(id);
  }

  @Get(':id/analytics/distribution')
  distribution(@Param('id', ParseIntPipe) id: number) {
    return this.analytics.scoreDistribution(id);
  }

  @Get(':id/analytics/students')
  studentPerf(
    @Param('id', ParseIntPipe) id: number,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.analytics.studentPerformance(id, parseInt(page), parseInt(limit));
  }

  @Get(':id/analytics/students/:studentId')
  studentDetail(
    @Param('id', ParseIntPipe) id: number,
    @Param('studentId', ParseIntPipe) studentId: number,
  ) {
    return this.analytics.studentDetail(id, studentId);
  }

  @Get(':id/analytics/questions')
  questionAnalytics(@Param('id', ParseIntPipe) id: number) {
    return this.analytics.questionAnalytics(id);
  }

  @Get(':id/rankings')
  rankings(@Param('id', ParseIntPipe) id: number) {
    return this.analytics.rankings(id);
  }
}
