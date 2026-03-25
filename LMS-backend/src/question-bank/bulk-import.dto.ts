import { QuestionType, Difficulty } from '../entities/question.entity';

// DTOs for bulk import
export class BulkImportResponseDto {
  totalRows: number;
  successfullyInserted: number;
  failedRows: number;
  errorDetails: ErrorDetail[];
  uploadedBy?: string;
  timestamp: Date;
}

export class ErrorDetail {
  rowNumber: number;
  reason: string;
  data?: any;
}

// Interface for parsed row
export interface ParsedQuestionRow {
  rowNumber: number;
  type: string;
  title?: string;
  questionText: string;
  difficulty?: string;
  topic: string;
  domain?: string;
  marks?: number;
  programmingLanguage?: string;
  companiesAppeared?: string;
  recentYear?: number;
  bestPracticeFor?: string;

  // MCQ
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: string;

  // FILL_IN_THE_BLANK
  blank1?: string;
  blank2?: string;
  blank3?: string;
  blank4?: string;
  blank5?: string;

  // MATCHING
  left1?: string;
  right1?: string;
  left2?: string;
  right2?: string;
  left3?: string;
  right3?: string;
  left4?: string;
  right4?: string;
  left5?: string;
  right5?: string;

  // JUMBLED_CODE
  statement1?: string;
  statement2?: string;
  statement3?: string;
  statement4?: string;
  statement5?: string;
  statement6?: string;
  statement7?: string;
  statement8?: string;

  // PROGRAMMING
  problemStatement?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  timeLimit?: string;
  memoryLimit?: string;
  testInput1?: string;
  testOutput1?: string;
  testInput2?: string;
  testOutput2?: string;
  testInput3?: string;
  testOutput3?: string;
  testInput4?: string;
  testOutput4?: string;
  testInput5?: string;
  testOutput5?: string;

  // OUTPUT_PREDICTION
  codeSnippet?: string;
  expectedOutput?: string;
}

// Validated question ready for insertion
export interface ValidatedQuestion {
  type: QuestionType;
  topicNames: string;
  difficulty: Difficulty;
  companiesAppeared?: string;
  programmingLanguage?: string;
  recentYearAppearing?: number;
  bestPracticeFor?: string;
  domain?: string;
  questionText: string;
  options?: string[];
  correctAnswer?: string;
  blanks?: string[];
  matchingPairs?: { left: string; right: string }[];
  jumbledStatements?: string[];
  problemStatement?: string;
  inputFormat?: string;
  outputFormat?: string;
  constraints?: string;
  testCases?: { input: string; output: string; explanation?: string }[];
  codeSnippet?: string;
  expectedOutput?: string;
}
