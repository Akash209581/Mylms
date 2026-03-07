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
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Question,
  QuestionType,
  Difficulty,
} from '../entities/question.entity';
import { JwtAuthGuard } from '../common/jwt.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '../entities/user.entity';
import { OrganizationFilterService } from '../common/organization-filter.service';
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
  @IsString() @IsOptional() programmingLanguage?: string;
  @IsInt() @IsOptional() recentYearAppearing?: number;
  @IsString() @IsOptional() bestPracticeFor?: string;
  @IsString() questionText: string;
  @IsArray() @IsOptional() options?: string[];
  @IsString() @IsOptional() correctAnswer?: string;
  @IsArray() @IsOptional() blanks?: string[];
  @IsArray() @IsOptional() matchingPairs?: { left: string; right: string }[];
  @IsArray() @IsOptional() jumbledStatements?: string[];
  @IsString() @IsOptional() problemStatement?: string;
  @IsString() @IsOptional() inputFormat?: string;
  @IsString() @IsOptional() outputFormat?: string;
  @IsString() @IsOptional() constraints?: string;
  @IsArray() @IsOptional() testCases?: {
    input: string;
    output: string;
    explanation?: string;
  }[];
  @IsString() @IsOptional() codeSnippet?: string;
  @IsString() @IsOptional() expectedOutput?: string;
  @IsNumber() @IsOptional() organizationId?: number; // SUPERADMIN can specify organization
}

@Controller('question-bank')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
export class QuestionBankController {
  constructor(
    @InjectRepository(Question)
    private questionRepo: Repository<Question>,
    private bulkImportService: BulkImportService,
    private organizationFilterService: OrganizationFilterService,
  ) {}

  private async generateQuestionNumber(
    type: QuestionType,
    organizationId: number,
  ): Promise<string> {
    const prefix = type; // MCQ, FIB, MQ, JC, PQ, OP
    const count = await this.questionRepo.count({ 
      where: { type, organizationId } 
    });
    const num = String(count + 1).padStart(4, '0');
    return `${prefix}${num}`;
  }

  @Get()
  async getAll(
    @Query('type') type?: string,
    @Query('difficulty') difficulty?: string,
    @Query('topic') topic?: string,
    @Request() req?: any,
  ) {
    const userRole = req?.user?.role;
    const userOrganizationId = req?.user?.organizationId;

    // Get organization filter based on user role
    const orgFilter = this.organizationFilterService.getOrganizationFilter(
      userRole,
      userOrganizationId,
    );

    const qb = this.questionRepo.createQueryBuilder('q');
    
    // Apply organization filter (SUPERADMIN bypasses, others filtered by org)
    if (orgFilter.organizationId) {
      qb.andWhere('q.organizationId = :organizationId', { 
        organizationId: orgFilter.organizationId 
      });
    }
    
    if (type) qb.andWhere('q.type = :type', { type });
    if (difficulty) qb.andWhere('q.difficulty = :difficulty', { difficulty });
    if (topic)
      qb.andWhere('q.topicNames ILIKE :topic', { topic: `%${topic}%` });
    return qb.orderBy('q.createdAt', 'DESC').getMany();
  }

  @Get('stats')
  async getStats(@Request() req?: any) {
    const userRole = req?.user?.role;
    const userOrganizationId = req?.user?.organizationId;

    // Get organization filter based on user role
    const orgFilter = this.organizationFilterService.getOrganizationFilter(
      userRole,
      userOrganizationId,
    );

    // Build base query with organization filter
    const baseQuery = this.questionRepo.createQueryBuilder('q');
    if (orgFilter.organizationId) {
      baseQuery.andWhere('q.organizationId = :organizationId', { 
        organizationId: orgFilter.organizationId 
      });
    }

    const total = await baseQuery.getCount();
    
    const byType = await this.questionRepo
      .createQueryBuilder('q')
      .select('q.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where(orgFilter.organizationId ? 'q.organizationId = :organizationId' : '1=1', 
        orgFilter.organizationId ? { organizationId: orgFilter.organizationId } : {})
      .groupBy('q.type')
      .getRawMany();
    
    const byDifficulty = await this.questionRepo
      .createQueryBuilder('q')
      .select('q.difficulty', 'difficulty')
      .addSelect('COUNT(*)', 'count')
      .where(orgFilter.organizationId ? 'q.organizationId = :organizationId' : '1=1', 
        orgFilter.organizationId ? { organizationId: orgFilter.organizationId } : {})
      .groupBy('q.difficulty')
      .getRawMany();
    
    return { total, byType, byDifficulty };
  }

  @Post('bulk-import')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR)
  @UseInterceptors(FileInterceptor('file'))
  async bulkImport(@UploadedFile() file: any, @Request() req: any) {
    const userRole = req.user?.role;
    const userOrganizationId = req.user?.organizationId;

    // Validate user has organizationId (except SUPERADMIN can import for any org)
    if (userRole !== UserRole.SUPERADMIN && !userOrganizationId) {
      throw new Error('User must belong to an organization to import questions');
    }

    // For now, use user's organizationId. Later, SUPERADMIN can specify target org
    const organizationId = userOrganizationId || 1; // Fallback to org 1 for SUPERADMIN if needed

    const result = await this.bulkImportService.importQuestionsFromFile(
      file,
      req.user.email || 'Unknown',
      organizationId,
    );
    return result;
  }

  @Post('bulk-import/error-report')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR)
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
    const question = await this.questionRepo.findOneBy({ id });
    
    if (!question) {
      return null;
    }

    const userRole = req?.user?.role;
    const userOrganizationId = req?.user?.organizationId;

    // SUPERADMIN can access any question
    if (userRole === UserRole.SUPERADMIN) {
      return question;
    }

    // Check if user can access this question's organization
    if (!this.organizationFilterService.canAccessOrganization(
      userRole,
      userOrganizationId,
      question.organizationId
    )) {
      return null; // User cannot access question from different organization
    }

    return question;
  }

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR)
  async create(@Body() dto: CreateQuestionDto, @Request() req?: any) {
    const userRole = req?.user?.role;
    const userOrganizationId = req?.user?.organizationId;

    // Validate user has organizationId
    if (userRole !== UserRole.SUPERADMIN && !userOrganizationId) {
      throw new Error('User must belong to an organization to create questions');
    }

    // Set organizationId: SUPERADMIN can specify, others use their own org
    const organizationId = userRole === UserRole.SUPERADMIN && dto.organizationId
      ? dto.organizationId
      : userOrganizationId;

    const questionNumber = await this.generateQuestionNumber(dto.type, organizationId);
    const q = this.questionRepo.create({ 
      ...dto, 
      questionNumber,
      organizationId,
    });
    return this.questionRepo.save(q);
  }

  @Put(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.INSTRUCTOR)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateQuestionDto>,
    @Request() req?: any,
  ) {
    const question = await this.questionRepo.findOneBy({ id });
    
    if (!question) {
      return { message: 'Question not found' };
    }

    const userRole = req?.user?.role;
    const userOrganizationId = req?.user?.organizationId;

    // SUPERADMIN can update any question
    if (userRole !== UserRole.SUPERADMIN) {
      // Check if user can access this question's organization
      if (!this.organizationFilterService.canAccessOrganization(
        userRole,
        userOrganizationId,
        question.organizationId
      )) {
        return { message: 'Cannot update question from different organization' };
      }
    }

    await this.questionRepo.update(id, dto);
    return this.questionRepo.findOneBy({ id });
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async delete(@Param('id', ParseIntPipe) id: number, @Request() req?: any) {
    const question = await this.questionRepo.findOneBy({ id });
    
    if (!question) {
      return { message: 'Question not found' };
    }

    const userRole = req?.user?.role;
    const userOrganizationId = req?.user?.organizationId;

    // SUPERADMIN can delete any question
    if (userRole !== UserRole.SUPERADMIN) {
      // ADMIN can only delete questions within their organization
      if (!this.organizationFilterService.canAccessOrganization(
        userRole,
        userOrganizationId,
        question.organizationId
      )) {
        return { message: 'Cannot delete question from different organization' };
      }
    }

    await this.questionRepo.delete(id);
    return { message: 'Question deleted' };
  }
}
