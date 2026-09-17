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
  BadRequestException,
  ConflictException,
  HttpException,
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
import type { Response } from 'express';
import { normalizeMcqLetter } from '../common/mcq-answer.util';
import {
  DUPLICATE_QUESTION_MESSAGE,
  questionDuplicateKey,
} from '../common/question-duplicate.util';

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

  private async assertQuestionIsNew(
    type: QuestionType,
    questionText: string,
    collegeId?: number,
    excludeId?: number,
  ) {
    const incoming = questionDuplicateKey(type, questionText);
    if (!incoming.endsWith(':')) {
      const qb = this.questionRepo
        .createQueryBuilder('q')
        .select(['q.id', 'q.type', 'q.questionText'])
        .where(collegeId ? 'q.collegeId = :collegeId' : '(q.collegeId IS NULL OR q.collegeId = 1)', { collegeId })
        .andWhere('q.type = :type', { type })
        .andWhere('(q.isActive IS NULL OR q.isActive = true)');
      if (excludeId) qb.andWhere('q.id != :excludeId', { excludeId });
      const matches = await qb.getMany();
      if (matches.some((q) => questionDuplicateKey(q.type, q.questionText) === incoming)) {
        throw new ConflictException(DUPLICATE_QUESTION_MESSAGE);
      }
    }
  }

  @Get('pending')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async getPendingQuestions(@Request() req: any) {
    const qb = this.questionRepo.createQueryBuilder('q')
      .leftJoinAndSelect('q.creator', 'creator')
      .leftJoinAndSelect('q.college', 'college')
      .where('q.status = :status', { status: QuestionStatus.PENDING_APPROVAL })
      .andWhere('(q.isActive IS NULL OR q.isActive = true)');

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
    @Query('search') search?: string,
    @Query('limit') limit?: string,
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
      .leftJoinAndSelect('q.approver', 'approver')
      .where('(q.isActive IS NULL OR q.isActive = true)');

    // Apply organization filter (SUPERADMIN bypasses, others filtered by org)
    if (collegeFilter.collegeId) {
      qb.andWhere('q.collegeId = :collegeId', {
        collegeId: collegeFilter.collegeId
      });
    }

    // Filter questions by status
    if (status) {
      if (status !== 'ALL') {
        qb.andWhere('q.status = :status', { status });
      }
    } else if (userRole === UserRole.QUESTION_CREATOR) {
      // QUESTION_CREATOR sees their own questions (all statuses) + approved questions
      qb.andWhere('(q.createdBy = :userId OR q.status = :apprStatus)', {
        userId,
        apprStatus: QuestionStatus.APPROVED,
      });
    } else {
      // Default to showing only APPROVED questions in Question Bank
      qb.andWhere('q.status = :apprStatus', {
        apprStatus: QuestionStatus.APPROVED,
      });
    }

    if (type) qb.andWhere('q.type = :type', { type });
    if (difficulty) qb.andWhere('q.difficulty = :difficulty', { difficulty });
    if (domain) qb.andWhere('q.domain = :domain', { domain });
    if (targetCompanies) {
      qb.andWhere('(q.targetCompanies ILIKE :tcomp OR q.companiesAppeared ILIKE :tcomp)', {
        tcomp: `%${targetCompanies}%`,
      });
    }
    if (topic)
      qb.andWhere('q.topicNames ILIKE :topic', { topic: `%${topic}%` });
    if (search?.trim()) {
      qb.andWhere(
        '(q.questionText ILIKE :search OR q.problemStatement ILIKE :search OR q.topicNames ILIKE :search)',
        { search: `%${search.trim()}%` },
      );
    }
    const take = limit ? Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200) : undefined;
    if (take) qb.take(take);
    return qb.orderBy('q.createdAt', 'DESC').getMany();
  }

  @Get('stats')
  async getStats(@Request() req?: any) {
    const userRole = req?.user?.role;
    const userCollegeId = req?.user?.collegeId;
    const userId = req?.user?.sub;

    // Get organization filter based on user role
    const collegeFilter = this.CollegeFilterService.getCollegeFilter(
      userRole,
      userCollegeId,
    );

    const activeCond = '(q.isActive IS NULL OR q.isActive = true)';
    let statusFilter = 'q.status = :apprStatus';
    let statusParams: any = { apprStatus: QuestionStatus.APPROVED };
    if (userRole === UserRole.QUESTION_CREATOR) {
      statusFilter = '(q.createdBy = :userId OR q.status = :apprStatus)';
      statusParams = { userId, apprStatus: QuestionStatus.APPROVED };
    }

    // Build base query with organization filter
    const baseQuery = this.questionRepo.createQueryBuilder('q')
      .where(activeCond)
      .andWhere(statusFilter, statusParams);
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
      .where(activeCond)
      .andWhere(statusFilter, statusParams)
      .andWhere(collegeFilter.collegeId ? 'q.collegeId = :collegeId' : '1=1',
        collegeFilter.collegeId ? { collegeId: collegeFilter.collegeId } : {})
      .groupBy('q.type')
      .getRawMany();

    const byDifficulty = await this.questionRepo
      .createQueryBuilder('q')
      .select('q.difficulty', 'difficulty')
      .addSelect('COUNT(*)', 'count')
      .where(activeCond)
      .andWhere(statusFilter, statusParams)
      .andWhere(collegeFilter.collegeId ? 'q.collegeId = :collegeId' : '1=1',
        collegeFilter.collegeId ? { collegeId: collegeFilter.collegeId } : {})
      .groupBy('q.difficulty')
      .getRawMany();

    return { total, byType, byDifficulty };
  }

  @Post('upload-image')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.QUESTION_CREATOR)
  @UseInterceptors(FileInterceptor('file', {
    limits: { fileSize: 10 * 1024 * 1024 }
  }))
  async uploadQuestionImage(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No image file uploaded');
    }

    const fs = require('fs');
    const path = require('path');

    const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
    const questionUploadsDir = path.join(baseUploadsDir, 'questions');
    if (!fs.existsSync(questionUploadsDir)) {
      fs.mkdirSync(questionUploadsDir, { recursive: true });
    }
    const ext = path.extname(file.originalname) || '.png';
    const shortId = Math.random().toString(36).substring(2, 8);
    const safeName = `q_${Date.now()}_${shortId}${ext}`;
    const filePath = path.join(questionUploadsDir, safeName);
    fs.writeFileSync(filePath, file.buffer);
    const fileUrl = `/uploads/questions/${safeName}`;

    return { url: fileUrl };
  }

  @Post('bulk-import')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.QUESTION_CREATOR)
  @UseInterceptors(FileInterceptor('file'))
  async bulkImport(@UploadedFile() file: any, @Request() req: any) {
    const userRole = req.user?.role;
    const userCollegeId = req.user?.collegeId;

    // Validate user has collegeId (except SUPERADMIN and QUESTION_CREATOR who can import globally)
    if (userRole !== UserRole.SUPERADMIN && userRole !== UserRole.QUESTION_CREATOR && !userCollegeId) {
      throw new BadRequestException('User must belong to an organization to import questions');
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

  @Get('bulk-import/template')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.QUESTION_CREATOR)
  async downloadTemplate(@Res() res: Response) {
    const buffer = await this.bulkImportService.generateTemplate();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=question_bank_import_template.xlsx',
    );
    res.send(buffer);
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

    // Validate user has collegeId (SUPERADMIN and QUESTION_CREATOR are global roles)
    if (userRole !== UserRole.SUPERADMIN && userRole !== UserRole.QUESTION_CREATOR && !userCollegeId) {
      throw new BadRequestException('User must belong to an organization to create questions');
    }

    // Set collegeId: SUPERADMIN can specify, others use their own org or fallback to 1
    const collegeId = (userRole === UserRole.SUPERADMIN && dto.collegeId)
      ? dto.collegeId
      : (userCollegeId || 1);

    await this.assertQuestionIsNew(dto.type, dto.questionText, collegeId);

    const questionNumber = await this.generateQuestionNumber(dto.type);

    if (dto.type === QuestionType.MCQ && dto.correctAnswer) {
      dto.correctAnswer = normalizeMcqLetter(dto.correctAnswer, dto.options) || dto.correctAnswer;
    }

    // If QUESTION_CREATOR, mark as DRAFT or PENDING_APPROVAL and record createdBy
    let status = QuestionStatus.APPROVED;
    if (userRole === UserRole.QUESTION_CREATOR) {
      status = dto.status === QuestionStatus.DRAFT ? QuestionStatus.DRAFT : QuestionStatus.PENDING_APPROVAL;
    } else if (dto.status) {
      status = dto.status;
    }

    const allowedLanguages = dto.type === QuestionType.PQ
      ? (Array.isArray(dto.allowedLanguages) && dto.allowedLanguages.length > 0 ? dto.allowedLanguages : ['Python'])
      : null;

    const q = this.questionRepo.create({
      ...dto,
      allowedLanguages: allowedLanguages as any,
      targetCompanies: dto.targetCompanies ?? undefined,
      companiesAppeared: dto.companiesAppeared ?? undefined,
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
        // Creator can only update their own question
        if (question.createdBy !== userId) {
          throw new BadRequestException('Cannot edit questions created by other users');
        }
        // Don't give edit option to question Creator after getting approval
        if (question.status === QuestionStatus.APPROVED) {
          throw new BadRequestException('Cannot edit question after it has been approved');
        }
        // Creator can save as DRAFT or submit as PENDING_APPROVAL (default to PENDING_APPROVAL)
        dto.status = dto.status === QuestionStatus.DRAFT ? QuestionStatus.DRAFT : QuestionStatus.PENDING_APPROVAL;
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

      if ((dto.type === QuestionType.MCQ || question.type === QuestionType.MCQ) && dto.correctAnswer) {
        dto.correctAnswer = normalizeMcqLetter(dto.correctAnswer, dto.options || question.options) || dto.correctAnswer;
      }

      const nextType = dto.type || question.type;
      if (nextType !== QuestionType.PQ) {
        dto.allowedLanguages = null as any;
      }

      const nextText = dto.questionText ?? question.questionText;
      const nextCollegeId = question.collegeId || userCollegeId || undefined;
      await this.assertQuestionIsNew(nextType, nextText, nextCollegeId, id);

      // Sanitize payload to only valid Question entity columns to prevent TypeORM EntityPropertyNotFoundError
      const allowedQuestionKeys = [
        'questionNumber', 'type', 'topicNames', 'difficulty', 'domain',
        'companiesAppeared', 'targetCompanies', 'programmingLanguage',
        'recentYearAppearing', 'bestPracticeFor', 'questionText', 'options',
        'correctAnswer', 'blanks', 'matchingPairs', 'extraRightMatches',
        'jumbledStatements', 'problemStatement', 'inputFormat', 'outputFormat',
        'constraints', 'allowedLanguages', 'testCases', 'codeSnippet',
        'expectedOutput', 'explanation', 'correctCode', 'hints', 'isActive',
        'status', 'createdBy', 'approvedBy', 'rejectionReason', 'collegeId',
      ];

      const updatePayload: Record<string, any> = {};
      for (const key of allowedQuestionKeys) {
        if ((dto as any)[key] !== undefined) {
          updatePayload[key] = (dto as any)[key];
        }
      }

      await this.questionRepo.update(id, updatePayload);
      return this.questionRepo.findOneBy({ id });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Error updating question:', error);
      throw new BadRequestException(error.message || 'Failed to update question');
    }
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR, UserRole.QUESTION_CREATOR)
  async delete(@Param('id', ParseIntPipe) id: number, @Request() req?: any) {
    const question = await this.questionRepo.findOneBy({ id });

    if (!question) {
      return { message: 'Question not found' };
    }

    const userRole = req?.user?.role;
    const userCollegeId = req?.user?.collegeId;
    const userId = req?.user?.sub;

    if (userRole === UserRole.QUESTION_CREATOR) {
      if (question.createdBy !== userId) {
        throw new BadRequestException('Cannot delete questions created by other users');
      }
      if (question.status === QuestionStatus.APPROVED) {
        throw new BadRequestException('Cannot delete question after it has been approved');
      }
    } else if (userRole !== UserRole.SUPERADMIN) {
      if (!this.CollegeFilterService.canAccessCollege(
        userRole,
        userCollegeId,
        question.collegeId
      )) {
        throw new BadRequestException('Cannot delete question from different college');
      }
    }

    try {
      await this.questionRepo.delete(id);
    } catch (err) {
      // If foreign key constraint or references prevent hard deletion, mark inactive
      await this.questionRepo.update(id, { isActive: false });
    }

    return { success: true, message: 'Question deleted' };
  }
}

