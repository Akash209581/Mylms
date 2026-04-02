import {
  Controller,
  Get,
  Patch,
  Body,
  Post,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { StudentService } from './student.service';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';

@Controller('student')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.STUDENT)
export class StudentController {
  constructor(private readonly studentService: StudentService) {}

  @Get('stats')
  async getStats(@Request() req: any) {
    return this.studentService.getStats(req.user.sub);
  }

  @Get('activity')
  async getActivity(@Request() req: any) {
    return this.studentService.getActivity(req.user.sub);
  }

  @Get('skills')
  async getSkills(@Request() req: any) {
    return this.studentService.getSkills(req.user.sub);
  }

  @Get('badges')
  async getBadges(@Request() req: any) {
    return this.studentService.getBadges(req.user.sub);
  }

  @Get('completed-lessons')
  async getCompletedLessons(
    @Request() req: any,
    @Query('courseId') courseId?: number,
  ) {
    return this.studentService.getCompletedLessons(req.user.sub, courseId);
  }

  @Patch('profile')
  async updateProfile(@Request() req: any, @Body() updateData: any) {
    return this.studentService.updateProfile(req.user.sub, updateData);
  }

  @Post('lessons/:id/complete')
  async completeLesson(
    @Request() req: any,
    @Param('id', ParseIntPipe) lessonId: number,
  ) {
    return this.studentService.completeLesson(req.user.sub, lessonId);
  }
}
