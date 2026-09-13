import { Injectable } from '@nestjs/common';
import { QuestionType, Difficulty } from '../entities/question.entity';
import {
  ParsedQuestionRow,
  ValidatedQuestion,
} from './bulk-import.dto';

@Injectable()
export class QuestionValidatorService {
  /**
   * Validates a parsed row and converts it to a ValidatedQuestion
   * Returns null if validation fails, with error details
   */
  validateQuestion(
    row: ParsedQuestionRow,
  ): { valid: boolean; question?: ValidatedQuestion; error?: string } {
    try {
      // Validate required fields
      if (!row.type || !row.questionText || !row.topic) {
        return {
          valid: false,
          error: 'Missing required fields: type, questionText, or topic',
        };
      }

      // Validate type enum
      if (!Object.values(QuestionType).includes(row.type as QuestionType)) {
        return {
          valid: false,
          error: `Invalid type: ${row.type}. Must be one of: MCQ, FIB, MQ, JC, PQ, OP`,
        };
      }

      // Validate difficulty enum
      const difficulty = row.difficulty
        ? (row.difficulty.toUpperCase() as Difficulty)
        : Difficulty.MEDIUM;
      if (!Object.values(Difficulty).includes(difficulty)) {
        return {
          valid: false,
          error: `Invalid difficulty: ${row.difficulty}. Must be one of: VERY_EASY, EASY, MEDIUM, HARD, VERY_HARD`,
        };
      }

      const type = row.type as QuestionType;

      // Type-specific validation
      switch (type) {
        case QuestionType.MCQ:
          return this.validateMCQ(row, difficulty);
        case QuestionType.FIB:
          return this.validateFIB(row, difficulty);
        case QuestionType.MQ:
          return this.validateMatching(row, difficulty);
        case QuestionType.JC:
          return this.validateJumbledCode(row, difficulty);
        case QuestionType.PQ:
          return this.validateProgramming(row, difficulty);
        case QuestionType.OP:
          return this.validateOutputPrediction(row, difficulty);
        default:
          return { valid: false, error: `Unknown question type: ${type}` };
      }
    } catch (error: any) {
      return { valid: false, error: `Validation error: ${error.message}` };
    }
  }

  private validateMCQ(
    row: ParsedQuestionRow,
    difficulty: Difficulty,
  ): { valid: boolean; question?: ValidatedQuestion; error?: string } {
    // Validate options
    if (!row.optionA || !row.optionB || !row.optionC || !row.optionD) {
      return {
        valid: false,
        error: 'MCQ must have all 4 options (optionA, optionB, optionC, optionD)',
      };
    }

    // Validate correct option
    if (!row.correctOption) {
      return { valid: false, error: 'MCQ must have a correctOption' };
    }

    const correctOptionUpper = row.correctOption.toUpperCase().trim();
    if (!['A', 'B', 'C', 'D'].includes(correctOptionUpper)) {
      return {
        valid: false,
        error: 'correctOption must be A, B, C, or D',
      };
    }

    const options = [row.optionA, row.optionB, row.optionC, row.optionD];
    const correctAnswer = correctOptionUpper;

    const question: ValidatedQuestion = {
      type: QuestionType.MCQ,
      topicNames: row.topic,
      difficulty,
      questionText: this.sanitizeText(row.questionText),
      options,
      correctAnswer,
      companiesAppeared: row.companiesAppeared,
      programmingLanguage: row.programmingLanguage,
      recentYearAppearing: row.recentYear,
      bestPracticeFor: row.bestPracticeFor,
      domain: row.domain || 'Programming Domain',
      description: row.description,
    };

    return { valid: true, question };
  }

  private validateFIB(
    row: ParsedQuestionRow,
    difficulty: Difficulty,
  ): { valid: boolean; question?: ValidatedQuestion; error?: string } {
    // Count [BLANK] placeholders in questionText
    const blankCount = (row.questionText.match(/\[BLANK\]/g) || []).length;

    if (blankCount === 0) {
      return {
        valid: false,
        error: 'FIB question must contain at least one [BLANK] placeholder',
      };
    }

    // Collect blanks from columns
    const blanks: string[] = [];
    for (let i = 1; i <= 5; i++) {
      const blankKey = `blank${i}` as keyof ParsedQuestionRow;
      if (row[blankKey]) {
        blanks.push(row[blankKey] as string);
      }
    }

    if (blanks.length === 0) {
      return {
        valid: false,
        error: 'FIB must have at least one blank answer (blank1, blank2, ...)',
      };
    }

    if (blanks.length !== blankCount) {
      return {
        valid: false,
        error: `[BLANK] count (${blankCount}) does not match number of blank answers (${blanks.length})`,
      };
    }

    const question: ValidatedQuestion = {
      type: QuestionType.FIB,
      topicNames: row.topic,
      difficulty,
      questionText: this.sanitizeText(row.questionText),
      blanks,
      companiesAppeared: row.companiesAppeared,
      programmingLanguage: row.programmingLanguage,
      recentYearAppearing: row.recentYear,
      bestPracticeFor: row.bestPracticeFor,
      domain: row.domain || 'Programming Domain',
    };

    return { valid: true, question };
  }

  private validateMatching(
    row: ParsedQuestionRow,
    difficulty: Difficulty,
  ): { valid: boolean; question?: ValidatedQuestion; error?: string } {
    const matchingPairs: { left: string; right: string }[] = [];

    for (let i = 1; i <= 5; i++) {
      const leftKey = `left${i}` as keyof ParsedQuestionRow;
      const rightKey = `right${i}` as keyof ParsedQuestionRow;

      const left = row[leftKey];
      const right = row[rightKey];

      if (left && right) {
        matchingPairs.push({ left: left as string, right: right as string });
      } else if (left || right) {
        return {
          valid: false,
          error: `Matching pair ${i} is incomplete (has left or right but not both)`,
        };
      }
    }

    if (matchingPairs.length < 2) {
      return {
        valid: false,
        error: 'Matching question must have at least 2 pairs',
      };
    }

    const question: ValidatedQuestion = {
      type: QuestionType.MQ,
      topicNames: row.topic,
      difficulty,
      questionText: this.sanitizeText(row.questionText),
      matchingPairs,
      companiesAppeared: row.companiesAppeared,
      programmingLanguage: row.programmingLanguage,
      recentYearAppearing: row.recentYear,
      bestPracticeFor: row.bestPracticeFor,
      domain: row.domain || 'Programming Domain',
    };

    return { valid: true, question };
  }

  private validateJumbledCode(
    row: ParsedQuestionRow,
    difficulty: Difficulty,
  ): { valid: boolean; question?: ValidatedQuestion; error?: string } {
    const jumbledStatements: string[] = [];

    for (let i = 1; i <= 8; i++) {
      const stmtKey = `statement${i}` as keyof ParsedQuestionRow;
      if (row[stmtKey]) {
        jumbledStatements.push(row[stmtKey] as string);
      }
    }

    if (jumbledStatements.length < 2) {
      return {
        valid: false,
        error: 'Jumbled code must have at least 2 statements',
      };
    }

    const question: ValidatedQuestion = {
      type: QuestionType.JC,
      topicNames: row.topic,
      difficulty,
      questionText: this.sanitizeText(row.questionText),
      jumbledStatements,
      companiesAppeared: row.companiesAppeared,
      programmingLanguage: row.programmingLanguage,
      recentYearAppearing: row.recentYear,
      bestPracticeFor: row.bestPracticeFor,
      domain: row.domain || 'Programming Domain',
    };

    return { valid: true, question };
  }

  private validateProgramming(
    row: ParsedQuestionRow,
    difficulty: Difficulty,
  ): { valid: boolean; question?: ValidatedQuestion; error?: string } {
    if (!row.problemStatement) {
      return {
        valid: false,
        error: 'Programming question must have problemStatement',
      };
    }

    // Collect test cases
    const testCases: { input: string; output: string }[] = [];

    for (let i = 1; i <= 5; i++) {
      const inputKey = `testInput${i}` as keyof ParsedQuestionRow;
      const outputKey = `testOutput${i}` as keyof ParsedQuestionRow;

      const input = row[inputKey];
      const output = row[outputKey];

      if (input && output) {
        testCases.push({ input: input as string, output: output as string });
      } else if (input || output) {
        return {
          valid: false,
          error: `Test case ${i} is incomplete (has input or output but not both)`,
        };
      }
    }

    if (testCases.length === 0) {
      return {
        valid: false,
        error: 'Programming question must have at least 1 test case',
      };
    }

    const allowedLanguages = row.allowedLanguages
      ? row.allowedLanguages.split(/[,;|]/).map((s) => s.trim().toLowerCase()).filter(Boolean)
      : undefined;

    const question: ValidatedQuestion = {
      type: QuestionType.PQ,
      topicNames: row.topic,
      difficulty,
      questionText: this.sanitizeText(row.questionText),
      problemStatement: this.sanitizeText(row.problemStatement),
      inputFormat: row.inputFormat,
      outputFormat: row.outputFormat,
      constraints: row.constraints,
      codeSnippet: row.codeSnippet ? this.sanitizeText(row.codeSnippet) : undefined,
      allowedLanguages,
      testCases,
      companiesAppeared: row.companiesAppeared,
      programmingLanguage: row.programmingLanguage,
      recentYearAppearing: row.recentYear,
      bestPracticeFor: row.bestPracticeFor,
      domain: row.domain || 'Programming Domain',
    };

    return { valid: true, question };
  }

  private validateOutputPrediction(
    row: ParsedQuestionRow,
    difficulty: Difficulty,
  ): { valid: boolean; question?: ValidatedQuestion; error?: string } {
    if (!row.codeSnippet) {
      return {
        valid: false,
        error: 'Output prediction must have codeSnippet',
      };
    }

    if (!row.expectedOutput) {
      return {
        valid: false,
        error: 'Output prediction must have expectedOutput',
      };
    }

    const question: ValidatedQuestion = {
      type: QuestionType.OP,
      topicNames: row.topic,
      difficulty,
      questionText: this.sanitizeText(row.questionText),
      codeSnippet: this.sanitizeText(row.codeSnippet),
      expectedOutput: row.expectedOutput,
      companiesAppeared: row.companiesAppeared,
      programmingLanguage: row.programmingLanguage,
      recentYearAppearing: row.recentYear,
      bestPracticeFor: row.bestPracticeFor,
      domain: row.domain || 'Programming Domain',
    };

    return { valid: true, question };
  }

  /**
   * Sanitizes text to prevent SQL injection and XSS
   */
  private sanitizeText(text: string): string {
    if (!text) return '';
    // Remove potentially dangerous characters but preserve formatting
    return text
      .trim()
      .replace(/[<>]/g, '') // Remove HTML tags
      .substring(0, 10000); // Limit length
  }
}
