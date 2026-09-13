import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as ExcelJS from 'exceljs';
import { Question } from '../entities/question.entity';
import {
  BulkImportResponseDto,
  ErrorDetail,
  ParsedQuestionRow,
} from './bulk-import.dto';
import { QuestionValidatorService } from './question-validator.service';
import { FileParserService } from './file-parser.service';
import {
  DUPLICATE_QUESTION_MESSAGE,
  questionDuplicateKey,
} from '../common/question-duplicate.util';

@Injectable()
export class BulkImportService {
  constructor(
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
    private dataSource: DataSource,
    private validator: QuestionValidatorService,
    private parser: FileParserService,
  ) { }

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

    const existing = await this.questionRepository.find({
      where: { collegeId },
      select: ['id', 'type', 'questionText'],
    });
    const seen = new Set(
      existing.map((q) => questionDuplicateKey(q.type, q.questionText)),
    );

    for (let i = 0; i < rows.length; i += batchSize) {
      const batch = rows.slice(i, i + batchSize);
      const { successful, errors } = await this.processBatch(batch, collegeId, seen);
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
    seen: Set<string>,
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

      const key = questionDuplicateKey(result.question!.type, result.question!.questionText);
      if (seen.has(key)) {
        errors.push({
          rowNumber: row.rowNumber,
          reason: DUPLICATE_QUESTION_MESSAGE,
          data: this.sanitizeRowForError(row),
        });
        continue;
      }
      seen.add(key);

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

  async generateTemplate(): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Question Import Template');

    worksheet.columns = [
      { header: 'Type', key: 'type', width: 12 },
      { header: 'Question Text', key: 'questionText', width: 25 },
      { header: 'Problem Statement', key: 'problemStatement', width: 40 },
      { header: 'Topic', key: 'topic', width: 18 },
      { header: 'Difficulty', key: 'difficulty', width: 14 },
      { header: 'Pre Code / Starter Code', key: 'codeSnippet', width: 35 },
      { header: 'Allowed Languages', key: 'allowedLanguages', width: 24 },
      { header: 'Input Format', key: 'inputFormat', width: 25 },
      { header: 'Output Format', key: 'outputFormat', width: 25 },
      { header: 'Constraints', key: 'constraints', width: 25 },
      { header: 'Test Input 1', key: 'testInput1', width: 20 },
      { header: 'Test Output 1', key: 'testOutput1', width: 20 },
      { header: 'Test Input 2', key: 'testInput2', width: 20 },
      { header: 'Test Output 2', key: 'testOutput2', width: 20 },
      { header: 'Option A', key: 'optionA', width: 18 },
      { header: 'Option B', key: 'optionB', width: 18 },
      { header: 'Option C', key: 'optionC', width: 18 },
      { header: 'Option D', key: 'optionD', width: 18 },
      { header: 'Correct Option', key: 'correctOption', width: 15 },
      { header: 'Companies Appeared', key: 'companiesAppeared', width: 22 },
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4F46E5' },
    };

    // Example 1: Programming Question (PQ) with pre-code
    worksheet.addRow({
      type: 'PQ',
      questionText: 'Two Sum',
      problemStatement: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.',
      topic: 'Arrays',
      difficulty: 'EASY',
      codeSnippet: 'def two_sum(nums, target):\n    # Write your solution here\n    pass',
      allowedLanguages: 'python, java, cpp, c',
      inputFormat: 'First line: array elements, Second line: target sum',
      outputFormat: 'Array indices [i, j]',
      constraints: '2 <= nums.length <= 10^4',
      testInput1: '2 7 11 15\n9',
      testOutput1: '0 1',
      testInput2: '3 2 4\n6',
      testOutput2: '1 2',
      companiesAppeared: 'Amazon, Google, TCS',
    });

    // Example 2: Multiple Choice Question (MCQ)
    worksheet.addRow({
      type: 'MCQ',
      questionText: 'What is the average time complexity of quicksort?',
      topic: 'Algorithms',
      difficulty: 'MEDIUM',
      optionA: 'O(n)',
      optionB: 'O(n log n)',
      optionC: 'O(n^2)',
      optionD: 'O(log n)',
      correctOption: 'B',
      companiesAppeared: 'Infosys, Wipro',
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

