import {
  IsString, IsOptional, IsInt, IsBoolean, IsNumber, IsEnum,
  IsDateString, Min, Max, IsArray, IsIn, IsObject,
} from 'class-validator';
import { ExamStatus } from '../entities/exam.entity';

// ─── Create / Update Exam ────────────────────────────────────────────────────

export class CreateExamDto {
  @IsString() title: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() instructions?: string;
  @IsInt() @Min(10) @Max(360) durationMinutes: number;
  @IsDateString() @IsOptional() startAt?: string;
  @IsDateString() @IsOptional() endAt?: string;
  @IsInt() @Min(0) passingMarks: number;
  @IsBoolean() @IsOptional() negativeMarking?: boolean;
  @IsNumber() @IsOptional() negativeMarksValue?: number;
  @IsInt() @Min(1) @Max(5) @IsOptional() attemptLimit?: number;
  @IsBoolean() @IsOptional() randomizeQuestions?: boolean;
  @IsBoolean() @IsOptional() randomizeOptions?: boolean;
  @IsBoolean() @IsOptional() autoSubmit?: boolean;
  @IsBoolean() @IsOptional() showResults?: boolean;
  @IsBoolean() @IsOptional() showCorrectAnswers?: boolean;
  @IsBoolean() @IsOptional() showExplanations?: boolean;
  @IsBoolean() @IsOptional() rankingEnabled?: boolean;
  @IsBoolean() @IsOptional() tabSwitchMonitoring?: boolean;
  @IsInt() @Min(1) @Max(20) @IsOptional() maxTabSwitches?: number;
  @IsString() @IsOptional() timingMode?: string;
  @IsObject() @IsOptional() sectionDurations?: { A?: number; B?: number };
  @IsInt() @IsOptional() questionDurationSeconds?: number;
  @IsArray() @IsOptional() targetBranches?: string[];
  @IsArray() @IsOptional() targetBatches?: string[];
}

export class UpdateExamDto {
  @IsString() @IsOptional() title?: string;
  @IsString() @IsOptional() description?: string;
  @IsString() @IsOptional() instructions?: string;
  @IsInt() @Min(10) @Max(360) @IsOptional() durationMinutes?: number;
  @IsDateString() @IsOptional() startAt?: string;
  @IsDateString() @IsOptional() endAt?: string;
  @IsInt() @Min(0) @IsOptional() passingMarks?: number;
  @IsBoolean() @IsOptional() negativeMarking?: boolean;
  @IsNumber() @IsOptional() negativeMarksValue?: number;
  @IsInt() @Min(1) @Max(5) @IsOptional() attemptLimit?: number;
  @IsBoolean() @IsOptional() randomizeQuestions?: boolean;
  @IsBoolean() @IsOptional() randomizeOptions?: boolean;
  @IsBoolean() @IsOptional() autoSubmit?: boolean;
  @IsBoolean() @IsOptional() showResults?: boolean;
  @IsBoolean() @IsOptional() showCorrectAnswers?: boolean;
  @IsBoolean() @IsOptional() showExplanations?: boolean;
  @IsBoolean() @IsOptional() rankingEnabled?: boolean;
  @IsBoolean() @IsOptional() tabSwitchMonitoring?: boolean;
  @IsInt() @Min(1) @Max(20) @IsOptional() maxTabSwitches?: number;
  @IsString() @IsOptional() timingMode?: string;
  @IsObject() @IsOptional() sectionDurations?: { A?: number; B?: number };
  @IsInt() @IsOptional() questionDurationSeconds?: number;
  @IsArray() @IsOptional() targetBranches?: string[];
  @IsArray() @IsOptional() targetBatches?: string[];
  @IsEnum(ExamStatus) @IsOptional() status?: ExamStatus;
}

export class CloneExamDto {
  @IsString() @IsOptional() title?: string;
  @IsInt() @IsOptional() collegeId?: number;
  @IsDateString() @IsOptional() startAt?: string;
  @IsDateString() @IsOptional() endAt?: string;
  @IsArray() @IsOptional() targetBranches?: string[];
  @IsArray() @IsOptional() targetBatches?: string[];
}

export class UpdateQuestionMarksDto {
  @IsNumber() @Min(0) marks: number;
  @IsNumber() @Min(0) @IsOptional() negativeMarks?: number;
}

export class AssignCollegesDto {
  @IsArray()
  @IsInt({ each: true })
  collegeIds: number[];

  @IsArray()
  @IsOptional()
  branches?: string[];

  @IsArray()
  @IsOptional()
  batches?: string[];
}

// ─── Add Questions ───────────────────────────────────────────────────────────

export class AddExamQuestionDto {
  @IsInt() questionId: number;
  @IsNumber() @Min(0) marks: number;
  @IsNumber() @Min(0) @IsOptional() negativeMarks?: number;
  @IsInt() @IsOptional() sortOrder?: number;
  @IsBoolean() @IsOptional() hintsEnabled?: boolean;
  @IsString() @IsOptional() @IsIn(['MARKS', 'TIME', 'NONE']) hintPenaltyType?: 'MARKS' | 'TIME' | 'NONE';
  @IsArray() @IsOptional() hintPenalties?: number[];
}

export class UpdateQuestionHintSettingsDto {
  @IsBoolean() @IsOptional() hintsEnabled?: boolean;
  @IsString() @IsIn(['MARKS', 'TIME', 'NONE']) hintPenaltyType: 'MARKS' | 'TIME' | 'NONE';
  @IsArray() @IsOptional() hintPenalties?: number[];
}

export class UnlockHintDto {
  @IsInt() questionId: number;
  @IsInt() @Min(0) hintIndex: number;
}

export class AddManyExamQuestionsDto {
  @IsArray()
  questions: AddExamQuestionDto[];
}

// ─── Assign Students ─────────────────────────────────────────────────────────

export class AssignStudentsDto {
  @IsArray()
  @IsInt({ each: true })
  studentIds: number[];
}

// ─── MCQ Import Preview ──────────────────────────────────────────────────────

export class ImportMcqConfirmDto {
  /** The rows the server already validated; client echoes them back. */
  @IsArray()
  rows: any[];
  /** Save questions to global question bank as well? */
  @IsBoolean() @IsOptional() saveToBank?: boolean;
}

// ─── Student: save answers ───────────────────────────────────────────────────

export class SaveMcqAnswersDto {
  /** { questionId: "A"|"B"|"C"|"D"|null } */
  @IsObject() @IsOptional() answers?: Record<string, string | null>;
  /** Updated time spent { questionId: seconds } */
  @IsObject() @IsOptional() timeSpent?: Record<string, number>;
  /** Ids to add/remove from review list */
  @IsArray() @IsInt({ each: true }) @IsOptional() markedReview?: number[];
  @IsNumber() @IsOptional() faceCoveragePercent?: number;
  @IsInt() @IsOptional() faceViolationsCount?: number;
  @IsInt() @IsOptional() inactivityDurationSeconds?: number;
  @IsInt() @IsOptional() tabSwitchCount?: number;
  @IsArray() @IsOptional() tabSwitchLog?: Array<{ timestamp: string; elapsedSeconds: number; questionId?: number }>;
}

export class SubmitExamDto {
  @IsObject() @IsOptional() answers?: Record<string, string | null>;
  @IsArray() @IsInt({ each: true }) @IsOptional() markedReview?: number[];
  @IsString() @IsOptional() reason?: string;
  @IsNumber() @IsOptional() faceCoveragePercent?: number;
  @IsInt() @IsOptional() faceViolationsCount?: number;
  @IsInt() @IsOptional() inactivityDurationSeconds?: number;
  @IsInt() @IsOptional() tabSwitchCount?: number;
  @IsArray() @IsOptional() tabSwitchLog?: Array<{ timestamp: string; elapsedSeconds: number; questionId?: number }>;
}

// ─── Student: code run / submit ──────────────────────────────────────────────

export class RunCodeDto {
  @IsInt() questionId: number;
  @IsString() language: string;
  @IsString() code: string;
  @IsBoolean() @IsOptional() isFinal?: boolean; // true = grade this submission
  @IsString() @IsOptional() stdin?: string;
}

// ─── Grade manual submission ─────────────────────────────────────────────────

export class GradeCodingDto {
  @IsInt() submissionId: number;
  @IsNumber() score: number;
  @IsString() @IsOptional() feedback?: string;
}
