import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Question } from '../entities/question.entity';
import {
  BulkImportResponseDto,
  ErrorDetail,
  ParsedQuestionRow,
} from './bulk-import.dto';
import { QuestionValidatorService } from './question-validator.service';
import { FileParserService } from './file-parser.service';

@Injectable()
export class BulkImportService {
  constructor(
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    private dataSource: DataSource,
    private validator: QuestionValidatorService,
    private parser: FileParserService,
  ) {}

  async importQuestionsFromFile(
    file: any,
    uploadedBy: string,
    collegeId: number,
  ): Promise<BulkImportResponseDto> {
    this.parser.validateFile(file);

    const rows = await this.parser.parseFile(file);
    const batchSize = 50;
    const errorDetails: ErrorDetail[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { successful, errors } = await this.processBatch(batch, collegeId);
      successCount += successful;
      errorDetails.push(...errors);
    }

    return {
      totalRows: rows.length,
      successfullyInserted: successCount,
      failedRows: errorDetails.length,
      errorDetails,
      uploadedBy,
      timestamp: new Date(),
    };
  }

  private async processBatch(
    batch: ParsedQuestionRow[],
    collegeId: number,
  ): Promise<{ successful: number; errors: ErrorDetail[] }> {
    const errors: ErrorDetail[] = [];
    const validQuestions: Question[] = [];

    for (const row of batch) {
      const result = this.validator.validateQuestion(row);
      if (!result.valid) {
        errors.push({
          rowNumber: row.rowNumber,
          reason: result.error || 'Validation failed',
          data: this.sanitizeRowForError(row),
        });
        continue;
      }

      const question = this.questionRepository.create({
        ...result.question!,
        questionNumber: await this.generateQuestionNumber(result.question!.type, collegeId),
        collegeId,
        isActive: true,
      });

      validQuestions.push(question);
    }

    if (validQuestions.length === 0) {
      return { successful: 0, errors };
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.save(validQuestions);
      await queryRunner.commitTransaction();
      return { successful: validQuestions.length, errors };
    } catch (error: any) {
      await queryRunner.rollbackTransaction();
      errors.push({
        rowNumber: batch[0].rowNumber,
        reason: `Database error: ${error.message}`,
        data: `Batch starting at row ${batch[0].rowNumber}`,
      });
      return { successful: 0, errors };
    } finally {
      await queryRunner.release();
    }
  }

  private async generateQuestionNumber(type: string, collegeId: number): Promise<string> {
    const lastQuestion = await this.questionRepository.findOne({
      where: { type: type as any, collegeId },
      order: { questionNumber: 'DESC' },
    });

    if (!lastQuestion || !lastQuestion.questionNumber) {
      return `${type}-001`;
    }

    const lastNumber = parseInt(lastQuestion.questionNumber.split('-')[1], 10);
    const newNumber = lastNumber + 1;
    return `${type}-${newNumber.toString().padStart(3, '0')}`;
  }

  private sanitizeRowForError(row: ParsedQuestionRow): any {
    const sanitized: any = {
      rowNumber: row.rowNumber,
      type: row.type,
      questionText: row.questionText?.substring(0, 100),
    };

    if (row.optionA) sanitized.optionA = row.optionA.substring(0, 50);
    if (row.problemStatement)
      sanitized.problemStatement = row.problemStatement.substring(0, 100);

    return sanitized;
  }
}

