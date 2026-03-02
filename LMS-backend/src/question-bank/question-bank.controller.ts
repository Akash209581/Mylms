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
import {
  IsString,
  IsEnum,
  IsOptional,
  IsArray,
  IsNumber,
  IsInt,
} from 'class-validator';

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
}

@Controller('question-bank')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
export class QuestionBankController {
  constructor(
    @InjectRepository(Question)
    private questionRepo: Repository<Question>,
  ) {}

  private async generateQuestionNumber(type: QuestionType): Promise<string> {
    const prefix = type; // MCQ, FIB, MQ, JC, PQ, OP
    const count = await this.questionRepo.count({ where: { type } });
    const num = String(count + 1).padStart(4, '0');
    return `${prefix}${num}`;
  }

  @Get()
  async getAll(
    @Query('type') type?: string,
    @Query('difficulty') difficulty?: string,
    @Query('topic') topic?: string,
  ) {
    const qb = this.questionRepo.createQueryBuilder('q');
    if (type) qb.andWhere('q.type = :type', { type });
    if (difficulty) qb.andWhere('q.difficulty = :difficulty', { difficulty });
    if (topic)
      qb.andWhere('q.topicNames ILIKE :topic', { topic: `%${topic}%` });
    return qb.orderBy('q.createdAt', 'DESC').getMany();
  }

  @Get('stats')
  async getStats() {
    const total = await this.questionRepo.count();
    const byType = await this.questionRepo
      .createQueryBuilder('q')
      .select('q.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .groupBy('q.type')
      .getRawMany();
    const byDifficulty = await this.questionRepo
      .createQueryBuilder('q')
      .select('q.difficulty', 'difficulty')
      .addSelect('COUNT(*)', 'count')
      .groupBy('q.difficulty')
      .getRawMany();
    return { total, byType, byDifficulty };
  }

  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.questionRepo.findOneBy({ id });
  }

  @Post()
  async create(@Body() dto: CreateQuestionDto) {
    const questionNumber = await this.generateQuestionNumber(dto.type);
    const q = this.questionRepo.create({ ...dto, questionNumber });
    return this.questionRepo.save(q);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<CreateQuestionDto>,
  ) {
    await this.questionRepo.update(id, dto);
    return this.questionRepo.findOneBy({ id });
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    await this.questionRepo.delete(id);
    return { message: 'Question deleted' };
  }
}
