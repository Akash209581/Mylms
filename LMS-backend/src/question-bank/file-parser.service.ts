import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { ParsedQuestionRow } from './bulk-import.dto';

@Injectable()
export class FileParserService {
  private readonly allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'text/csv',
  ];
  private readonly maxFileSize = 10 * 1024 * 1024;

  validateFile(file: any): void {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file format. Only Excel (.xlsx, .xls) and CSV files are allowed',
      );
    }

    if (file.size > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds maximum limit of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }
  }

  private normalizeColumnName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  private getValue(
    row: Record<string, any>,
    possibleNames: string[],
  ): string | undefined {
    for (const name of possibleNames) {
      const normalizedName = this.normalizeColumnName(name);
      for (const [key, value] of Object.entries(row)) {
        if (this.normalizeColumnName(key) === normalizedName) {
          return value?.toString().trim();
        }
      }
    }
    return undefined;
  }

  private getNumberValue(
    row: Record<string, any>,
    possibleNames: string[],
  ): number | undefined {
    const value = this.getValue(row, possibleNames);
    if (!value) return undefined;
    const num = parseInt(value, 10);
    return isNaN(num) ? undefined : num;
  }

  parseFile(file: any): ParsedQuestionRow[] {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet);

    if (!data || data.length === 0) {
      throw new BadRequestException('File is empty or invalid');
    }

    if (data.length > 1000) {
      throw new BadRequestException('File contains more than 1000 rows');
    }

    return data.map((row: any, index) =>
      this.mapRowToQuestion(row, index + 2),
    );
  }

  private mapRowToQuestion(
    row: Record<string, any>,
    rowNumber: number,
  ): ParsedQuestionRow {
    return {
      rowNumber,
      type: this.getValue(row, ['type', 'questiontype', 'question_type']),
      questionText: this.getValue(row, [
        'questiontext',
        'question_text',
        'question',
      ]),
      topic: this.getValue(row, ['topic', 'topicnames', 'topic_names']),
      difficulty: this.getValue(row, ['difficulty', 'level']),
      companiesAppeared: this.getValue(row, [
        'companies',
        'companiesappeared',
        'companies_appeared',
      ]),
      programmingLanguage: this.getValue(row, [
        'programminglanguage',
        'programming_language',
        'language',
      ]),
      recentYear: this.getNumberValue(row, [
        'recentyear',
        'recent_year',
        'year',
      ]),
      bestPracticeFor: this.getValue(row, [
        'bestpractice',
        'best_practice',
        'bestpracticefor',
      ]),

      // MCQ fields
      optionA: this.getValue(row, ['optiona', 'option_a', 'option1']),
      optionB: this.getValue(row, ['optionb', 'option_b', 'option2']),
      optionC: this.getValue(row, ['optionc', 'option_c', 'option3']),
      optionD: this.getValue(row, ['optiond', 'option_d', 'option4']),
      correctOption: this.getValue(row, [
        'correctoption',
        'correct_option',
        'correctanswer',
        'correct_answer',
        'answer',
      ]),

      // FIB fields
      blank1: this.getValue(row, ['blank1', 'blank_1']),
      blank2: this.getValue(row, ['blank2', 'blank_2']),
      blank3: this.getValue(row, ['blank3', 'blank_3']),
      blank4: this.getValue(row, ['blank4', 'blank_4']),

      // Matching fields
      left1: this.getValue(row, ['left1', 'left_1', 'pair1left', 'pair_1_left']),
      right1: this.getValue(row, ['right1', 'right_1', 'pair1right', 'pair_1_right']),
      left2: this.getValue(row, ['left2', 'left_2', 'pair2left', 'pair_2_left']),
      right2: this.getValue(row, ['right2', 'right_2', 'pair2right', 'pair_2_right']),
      left3: this.getValue(row, ['left3', 'left_3', 'pair3left', 'pair_3_left']),
      right3: this.getValue(row, ['right3', 'right_3', 'pair3right', 'pair_3_right']),
      left4: this.getValue(row, ['left4', 'left_4', 'pair4left', 'pair_4_left']),
      right4: this.getValue(row, ['right4', 'right_4', 'pair4right', 'pair_4_right']),

      // Jumbled Code fields
      statement1: this.getValue(row, ['statement1', 'statement_1']),
      statement2: this.getValue(row, ['statement2', 'statement_2']),
      statement3: this.getValue(row, ['statement3', 'statement_3']),
      statement4: this.getValue(row, ['statement4', 'statement_4']),
      statement5: this.getValue(row, ['statement5', 'statement_5']),

      // Programming fields
      problemStatement: this.getValue(row, [
        'problemstatement',
        'problem_statement',
        'problem',
      ]),
      inputFormat: this.getValue(row, ['inputformat', 'input_format']),
      outputFormat: this.getValue(row, ['outputformat', 'output_format']),
      constraints: this.getValue(row, ['constraints']),
      testInput1: this.getValue(row, [
        'testinput1',
        'test_input_1',
        'testcase1input',
        'test_case_1_input',
      ]),
      testOutput1: this.getValue(row, [
        'testoutput1',
        'test_output_1',
        'testcase1output',
        'test_case_1_output',
      ]),
      testInput2: this.getValue(row, [
        'testinput2',
        'test_input_2',
        'testcase2input',
        'test_case_2_input',
      ]),
      testOutput2: this.getValue(row, [
        'testoutput2',
        'test_output_2',
        'testcase2output',
        'test_case_2_output',
      ]),

      // Output Prediction fields
      codeSnippet: this.getValue(row, ['codesnippet', 'code_snippet', 'code']),
      expectedOutput: this.getValue(row, [
        'expectedoutput',
        'expected_output',
        'output',
      ]),
    };
  }
}
