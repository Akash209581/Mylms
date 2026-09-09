import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Query,
  UseInterceptors,
  UploadedFile,
  Res,
  Request,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Question,
  QuestionType,
  Difficulty,
  QuestionStatus,
} from '../entities/question.entity';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { CollegeFilterService } from '../common/college-filter.service';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  IsInt,
} from 'class-validator';
import { FileInterceptor } from '@nestjs/platform-express';
import { BulkImportService } from './bulk-import.service';
import { Response } from 'express';

class CreateQuestionDto {
  @IsEnum(QuestionType) type: QuestionType;
  @IsString() topicNames: string;
  @IsEnum(Difficulty) @IsOptional() difficulty?: Difficulty;
  @IsString() @IsOptional() companiesAppeared?: string;
  @IsString() @IsOptional() targetCompanies?: string;
  @IsString() @IsOptional() programmingLanguage?: string;
  @IsInt() @IsOptional() recentYearAppearing?: number;
  @IsString() @IsOptional() bestPracticeFor?: string;
  @IsString() questionText: string;
  @IsArray() @IsOptional() options?: string[];
  @IsString() @IsOptional() correctAnswer?: string;
  @IsArray() @IsOptional() blanks?: string[];
  @IsArray() @IsOptional() matchingPairs?: { left: string; right: string }[];
  @IsArray() @IsOptional() extraRightMatches?: string[];
  @IsArray() @IsOptional() jumbledStatements?: string[];
  @IsString() @IsOptional() problemStatement?: string;
  @IsString() @IsOptional() inputFormat?: string;
  @IsString() @IsOptional() outputFormat?: string;
  @IsString() @IsOptional() constraints?: string;
  @IsArray() @IsOptional() allowedLanguages?: string[];
  @IsArray() @IsOptional() testCases?: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  @IsString() @IsOptional() codeSnippet?: string;
  @IsString() @IsOptional() expectedOutput?: string;
  @IsString() @IsOptional() explanation?: string;
  @IsString() @IsOptional() correctCode?: string;
  @IsString() @IsOptional() domain?: string;
  @IsString() @IsOptional() description?: string;
  @IsNumber() @IsOptional() collegeId?: number; // SUPERADMIN can specify organization
  @IsEnum(QuestionStatus) @IsOptional() status?: QuestionStatus;
  @IsString() @IsOptional() rejectionReason?: string;
}

@Controller('question-bank')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.QUESTION_CREATOR)
export class QuestionBankController {
  constructor(
    @InjectRepository(Question)
    private questionRepo: Repository<Question>,
    private bulkImportService: BulkImportService,
    private CollegeFilterService: CollegeFilterService,
  ) { }

  private async generateQuestionNumber(
    type: QuestionType,
  ): Promise<string> {
    const prefix = type; // MCQ, FIB, MQ, JC, PQ, OP

    // Find the last question created of this type to get its number
    const lastQuestion = await this.questionRepo.findOne({
      where: { type },
      order: { id: 'DESC' } // Most recent ID
    });

    let nextNum = 1;
    if (lastQuestion && lastQuestion.questionNumber) {
      // Extract numeric part. e.g. MCQ0010 -> 0010 -> 10
      const numericPart = lastQuestion.questionNumber.replace(prefix, '');
      const lastNum = parseInt(numericPart, 10);
      if (!isNaN(lastNum)) {
        nextNum = lastNum + 1;
      }
    }

    // Ensure we don't accidentally conflict if someone manualy edited numbers
    // We pad with 4 digits as before
    let numStr = String(nextNum).padStart(4, '0');
    let finalCode = `${prefix}${numStr}`;

    // Extra safety: double check if this number exists (unlikely given DESC order but good for robustness)
    let exists = await this.questionRepo.findOne({ where: { questionNumber: finalCode } });
    while (exists) {
      nextNum++;
      numStr = String(nextNum).padStart(4, '0');
      finalCode = `${prefix}${numStr}`;
      exists = await this.questionRepo.findOne({ where: { questionNumber: finalCode } });
    }

    return finalCode;
  }

  @Get('pending')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async getPendingQuestions(@Request() req: any) {
    const qb = this.questionRepo.createQueryBuilder('q')
      .leftJoinAndSelect('q.creator', 'creator')
      .leftJoinAndSelect('q.college', 'college')
      .where('q.status = :status', { status: QuestionStatus.PENDING_APPROVAL });

    if (req.user?.role === UserRole.ADMIN && req.user?.collegeId) {
      qb.andWhere('q.collegeId = :cid', { cid: req.user.collegeId });
    }

    return qb.orderBy('q.createdAt', 'DESC').getMany();
  }

  @Put(':id/approve')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async approveQuestion(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const question = await this.questionRepo.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    await this.questionRepo.update(id, {
      status: QuestionStatus.APPROVED,
      approvedBy: req.user.sub,
      rejectionReason: undefined,
    });
    return { success: true, message: 'Question approved successfully' };
  }

  @Put(':id/reject')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async rejectQuestion(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    const question = await this.questionRepo.findOne({ where: { id } });
    if (!question) throw new NotFoundException('Question not found');
    await this.questionRepo.update(id, {
      status: QuestionStatus.REJECTED,
      approvedBy: req.user.sub,
      rejectionReason: reason || 'Does not meet assessment standards',
    });
    return { success: true, message: 'Question rejected' };
  }

  @Get()
  async getAll(
    @Query('type') type?: string,
    @Query('difficulty') difficulty?: string,
    @Query('topic') topic?: string,
    @Query('domain') domain?: string,
    @Query('status') status?: string,
    @Query('targetCompanies') targetCompanies?: string,
    @Request() req?: any,
  ) {
    const userRole = req?.user?.role;
    const userCollegeId = req?.user?.collegeId;
    const userId = req?.user?.sub;

    // Get organization filter based on user role
    const collegeFilter = this.CollegeFilterService.getCollegeFilter(
      userRole,
      userCollegeId,
    );

    const qb = this.questionRepo.createQueryBuilder('q')
      .leftJoinAndSelect('q.creator', 'creator')
      .leftJoinAndSelect('q.approver', 'approver');

    // Apply organization filter (SUPERADMIN bypasses, others filtered by org)
    if (collegeFilter.collegeId) {
      qb.andWhere('q.collegeId = :collegeId', {
        collegeId: collegeFilter.collegeId
      });
    }

    // QUESTION_CREATOR sees their own questions (all statuses) + approved questions
    if (userRole === UserRole.QUESTION_CREATOR) {
      qb.andWhere('(q.createdBy = :userId OR q.status = :apprStatus)', {
        userId,
        apprStatus: QuestionStatus.APPROVED,
      });
    }

    if (type) qb.andWhere('q.type = :type', { type });
    if (difficulty) qb.andWhere('q.difficulty = :difficulty', { difficulty });
    if (domain) qb.andWhere('q.domain = :domain', { domain });
    if (status) qb.andWhere('q.status = :status', { status });
    if (targetCompanies) {
      qb.andWhere('(q.targetCompanies ILIKE :tcomp OR q.companiesAppeared ILIKE :tcomp)', {
        tcomp: `%${targetCompanies}%`,
      });
    }
    if (topic)
      qb.andWhere('q.topicNames ILIKE :topic', { topic: `%${topic}%` });
    return qb.orderBy('q.createdAt', 'DESC').getMany();
  }

  @Get('stats')
  async getStats(@Request() req?: any) {
    const userRole = req?.user?.role;
    const userCollegeId = req?.user?.collegeId;

    // Get organization filter based on user role
    const collegeFilter = this.CollegeFilterService.getCollegeFilter(
      userRole,
      userCollegeId,
    );

    // Build base query with organization filter
    const baseQuery = this.questionRepo.createQueryBuilder('q');
    if (collegeFilter.collegeId) {
      baseQuery.andWhere('q.collegeId = :collegeId', {
        collegeId: collegeFilter.collegeId
      });
    }

    const total = await baseQuery.getCount();

    const byType = await this.questionRepo
      .createQueryBuilder('q')
      .select('q.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where(collegeFilter.collegeId ? 'q.collegeId = :collegeId' : '1=1',
        collegeFilter.collegeId ? { collegeId: collegeFilter.collegeId } : {})
      .groupBy('q.type')
      .getRawMany();

    const byDifficulty = await this.questionRepo
      .createQueryBuilder('q')
      .select('q.difficulty', 'difficulty')
      .addSelect('COUNT(*)', 'count')
      .where(collegeFilter.collegeId ? 'q.collegeId = :collegeId' : '1=1',
        collegeFilter.collegeId ? { collegeId: collegeFilter.collegeId } : {})
      .groupBy('q.difficulty')
      .getRawMany();

    return { total, byType, byDifficulty };
  }

  @Post('bulk-import')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.QUESTION_CREATOR)
  @UseInterceptors(FileInterceptor('file'))
  async bulkImport(@UploadedFile() file: any, @Request() req: any) {
    const userRole = req.user?.role;
    const userCollegeId = req.user?.collegeId;

    // Validate user has collegeId (except SUPERADMIN can import for any org)
    if (userRole !== UserRole.SUPERADMIN && !userCollegeId) {
      throw new Error('User must belong to an organization to import questions');
    }

    // For now, use user's collegeId. Later, SUPERADMIN can specify target org
    const collegeId = userCollegeId || 1; // Fallback to org 1 for SUPERADMIN if needed

    const result = await this.bulkImportService.importQuestionsFromFile(
      file,
      req.user.email || 'Unknown',
      collegeId,
    );
    return result;
  }

  @Post('bulk-import/error-report')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.QUESTION_CREATOR)
  async downloadErrorReport(@Body() body: any, @Res() res: Response) {
    const { errorDetails } = body;

    if (!errorDetails || !Array.isArray(errorDetails)) {
      res.status(400).json({ message: 'Invalid error details' });
      return;
    }

    const csvRows = [
      ['Row Number', 'Error Reason', 'Data'].join(','),
      ...errorDetails.map((err) =>
        [
          err.rowNumber,
          `"${err.reason}"`,
          `"${JSON.stringify(err.data).replace(/"/g, '""')}"`,
        ].join(','),
      ),
    ];

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=error_report.csv',
    );
    res.send(csv);
  }

  @Get(':id')
  async getOne(@Param('id', ParseIntPipe) id: number, @Request() req?: any) {
    try {
      const question = await this.questionRepo.findOne({
        where: { id },
        relations: ['creator', 'approver'],
      });

      if (!question) {
        return null;
      }

      const userRole = req?.user?.role;
      const userCollegeId = req?.user?.collegeId;
      const userId = req?.user?.sub;

      // SUPERADMIN can access any question.
      if (userRole === UserRole.SUPERADMIN) {
        return question;
      }

      // QUESTION_CREATOR can access questions they created
      if (userRole === UserRole.QUESTION_CREATOR && question.createdBy === userId) {
        return question;
      }

      const targetCollegeId = question.collegeId;
      if (!targetCollegeId) {
        return question;
      }

      if (!this.CollegeFilterService.canAccessCollege(
        userRole,
        userCollegeId,
        targetCollegeId,
      )) {
        return null;
      }

      return question;
    } catch (error) {
      console.error('Error fetching question:', error);
      throw new Error(`Failed to fetch question: ${error.message}`);
    }
  }

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.QUESTION_CREATOR)
  async create(@Body() dto: CreateQuestionDto, @Request() req?: any) {
    const userRole = req?.user?.role;
    const userCollegeId = req?.user?.collegeId;
    const userId = req?.user?.sub;

    // Validate user has collegeId
    if (userRole !== UserRole.SUPERADMIN && !userCollegeId) {
      throw new Error('User must belong to an organization to create questions');
    }

    // Set collegeId: SUPERADMIN can specify, others use their own org or fallback to 1
    const collegeId = (userRole === UserRole.SUPERADMIN && dto.collegeId)
      ? dto.collegeId
      : (userCollegeId || 1);

    const questionNumber = await this.generateQuestionNumber(dto.type);

    // If QUESTION_CREATOR, mark as PENDING_APPROVAL and record createdBy
    let status = QuestionStatus.APPROVED;
    if (userRole === UserRole.QUESTION_CREATOR) {
      status = QuestionStatus.PENDING_APPROVAL;
    } else if (dto.status) {
      status = dto.status;
    }

    const q = this.questionRepo.create({
      ...dto,
      targetCompanies: dto.targetCompanies || dto.companiesAppeared,
      companiesAppeared: dto.companiesAppeared || dto.targetCompanies,
      questionNumber,
      collegeId,
      status,
      createdBy: userId,
    });
    return this.questionRepo.save(q);
  }

  @Put(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.QUESTION_CREATOR)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateQuestionDto>,
    @Request() req?: any,
  ) {
    try {
      const question = await this.questionRepo.findOneBy({ id });

      if (!question) {
        return { message: 'Question not found' };
      }

      const userRole = req?.user?.role;
      const userCollegeId = req?.user?.collegeId;
      const userId = req?.user?.sub;
      const targetCollegeId = question.collegeId;

      // SUPERADMIN can update any question
      if (userRole === UserRole.QUESTION_CREATOR) {
        // Creator can only update their own question, and edits reset status to PENDING_APPROVAL
        if (question.createdBy !== userId) {
          return { message: 'Cannot edit questions created by other users' };
        }
        dto.status = QuestionStatus.PENDING_APPROVAL;
        dto.rejectionReason = undefined;
      } else if (userRole !== UserRole.SUPERADMIN) {
        if (!targetCollegeId) {
          return { message: 'This question has no college assignment and can only be updated by SUPERADMIN' };
        }

        // ADMIN/INSTRUCTOR can update only within their college.
        if (!this.CollegeFilterService.canAccessCollege(
          userRole,
          userCollegeId,
          targetCollegeId,
        )) {
          return { message: 'Cannot update question from different college' };
        }
      }

      if (dto.targetCompanies || dto.companiesAppeared) {
        dto.targetCompanies = dto.targetCompanies || dto.companiesAppeared;
        dto.companiesAppeared = dto.companiesAppeared || dto.targetCompanies;
      }

      await this.questionRepo.update(id, dto);
      return this.questionRepo.findOneBy({ id });
    } catch (error) {
      console.error('Error updating question:', error);
      throw new Error(`Failed to update question: ${error.message}`);
    }
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async delete(@Param('id', ParseIntPipe) id: number, @Request() req?: any) {
    const question = await this.questionRepo.findOneBy({ id });

    if (!question) {
      return { message: 'Question not found' };
    }

    const userRole = req?.user?.role;
    const userCollegeId = req?.user?.collegeId;

    // SUPERADMIN can delete any question
    if (userRole !== UserRole.SUPERADMIN) {
      // ADMIN can only delete questions within their college
      if (!this.CollegeFilterService.canAccessCollege(
        userRole,
        userCollegeId,
        question.collegeId
      )) {
        return { message: 'Cannot delete question from different college' };
      }
    }

    await this.questionRepo.delete(id);
    return { message: 'Question deleted' };
  }
}

