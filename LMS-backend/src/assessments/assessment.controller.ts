import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { AssessmentService } from './assessment.service';
import { SaveAnswersDto, GradeAttemptDto } from './assessment.dto';
@Controller('assessments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssessmentController {
  constructor(private readonly service: AssessmentService) {}
  @Get('managed-lessons') @Roles(UserRole.SUPERADMIN,UserRole.ADMIN,UserRole.INSTRUCTOR)
  managed(@Request() req) { return this.service.managedLessons(req.user); }
  @Post('lessons/:id/start') @Roles(UserRole.STUDENT)
  start(@Request() req, @Param('id',ParseIntPipe) id:number) { return this.service.start(req.user,id); }
  @Get('lessons/:id/attempts')
  list(@Request() req, @Param('id',ParseIntPipe) id:number) { return this.service.list(req.user,id); }
  @Get('attempts/:id')
  read(@Request() req, @Param('id',ParseIntPipe) id:number) { return this.service.read(req.user,id); }
  @Patch('attempts/:id/answers') @Roles(UserRole.STUDENT)
  save(@Request() req, @Param('id',ParseIntPipe) id:number, @Body() body: SaveAnswersDto) { return this.service.save(req.user,id,body); }
  @Post('attempts/:id/submit') @Roles(UserRole.STUDENT)
  submit(@Request() req, @Param('id',ParseIntPipe) id:number, @Body() body: SaveAnswersDto) { return this.service.save(req.user,id,body,true); }
  @Post('attempts/:id/grade') @Roles(UserRole.SUPERADMIN,UserRole.ADMIN,UserRole.INSTRUCTOR)
  grade(@Request() req, @Param('id',ParseIntPipe) id:number, @Body() body: GradeAttemptDto) { return this.service.grade(req.user,id,body); }
}
