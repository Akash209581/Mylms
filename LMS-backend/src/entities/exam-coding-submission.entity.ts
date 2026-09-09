import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn,
} from 'typeorm';
import { ExamAttempt } from './exam-attempt.entity';
import { Question } from './question.entity';

export enum SubmissionStatus {
  PENDING       = 'PENDING',
  RUNNING       = 'RUNNING',
  ACCEPTED      = 'ACCEPTED',
  WRONG_ANSWER  = 'WRONG_ANSWER',
  COMPILE_ERROR = 'COMPILE_ERROR',
  RUNTIME_ERROR = 'RUNTIME_ERROR',
  TIME_LIMIT    = 'TIME_LIMIT',
  MEMORY_LIMIT  = 'MEMORY_LIMIT',
  PARTIAL       = 'PARTIAL',
}

@Entity('exam_coding_submissions')
export class ExamCodingSubmission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'attempt_id' })
  attemptId: number;

  @ManyToOne(() => ExamAttempt, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'attempt_id' })
  attempt: ExamAttempt;

  @Column({ name: 'question_id' })
  questionId: number;

  @ManyToOne(() => Question, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ length: 30 })
  language: string;

  @Column({ type: 'text' })
  code: string;

  // Public test case results
  @Column({ name: 'passed_cases', default: 0 })
  passedCases: number;

  @Column({ name: 'total_cases', default: 0 })
  totalCases: number;

  // Hidden test case results (never exposed to student)
  @Column({ name: 'hidden_passed', default: 0 })
  hiddenPassed: number;

  @Column({ name: 'hidden_total', default: 0 })
  hiddenTotal: number;

  @Column({ type: 'decimal', precision: 9, scale: 2, default: 0 })
  score: number;

  @Column({ name: 'exec_time_ms', nullable: true })
  execTimeMs: number;

  @Column({ name: 'memory_kb', nullable: true })
  memoryKb: number;

  @Column({ name: 'compilation_error', type: 'text', nullable: true })
  compilationError: string;

  @Column({ name: 'runtime_error', type: 'text', nullable: true })
  runtimeError: string;

  @Column({ type: 'enum', enum: SubmissionStatus, default: SubmissionStatus.PENDING })
  status: SubmissionStatus;

  /** True = final graded submission; false = "run" attempt */
  @Column({ name: 'is_final', default: false })
  isFinal: boolean;

  @CreateDateColumn({ name: 'submitted_at' })
  submittedAt: Date;
}
