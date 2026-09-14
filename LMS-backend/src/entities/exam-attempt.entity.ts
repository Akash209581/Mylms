import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
  CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Exam } from './exam.entity';
import { User } from './user.entity';

export enum AttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED   = 'SUBMITTED',
  EVALUATED   = 'EVALUATED',
}

@Entity('exam_attempts')
export class ExamAttempt {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'exam_id' })
  examId: number;

  @ManyToOne(() => Exam, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'exam_id' })
  exam: Exam;

  @Column({ name: 'student_id' })
  studentId: number;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @Column({ name: 'attempt_number', type: 'smallint', default: 1 })
  attemptNumber: number;

  @Column({ type: 'enum', enum: AttemptStatus, default: AttemptStatus.IN_PROGRESS })
  status: AttemptStatus;

  @Column({ name: 'start_time', type: 'timestamptz', default: () => 'now()' })
  startTime: Date;

  @Column({ name: 'deadline_at', type: 'timestamptz' })
  deadlineAt: Date;

  @Column({ name: 'end_time', type: 'timestamptz', nullable: true })
  endTime: Date;

  /** { questionId: "A"|"B"|"C"|"D"|null } */
  @Column({ name: 'mcq_answers', type: 'jsonb', default: {} })
  mcqAnswers: Record<string, string | null>;

  /** { questionId: seconds } */
  @Column({ name: 'time_spent', type: 'jsonb', default: {} })
  timeSpent: Record<string, number>;

  /** [questionId, ...] */
  @Column({ name: 'marked_review', type: 'jsonb', default: [] })
  markedReview: number[];

  /** { questionId: [hintIndex0, hintIndex1, ...] } */
  @Column({ name: 'unlocked_hints', type: 'jsonb', default: {} })
  unlockedHints: Record<string, number[]>;

  /** Cumulative time in seconds reduced from exam timer due to hint reveals */
  @Column({ name: 'time_deducted_seconds', type: 'int', default: 0 })
  timeDeductedSeconds: number;

  @Column({ name: 'tab_switch_count', type: 'int', default: 0 })
  tabSwitchCount: number;

  @Column({ name: 'face_coverage_percent', type: 'decimal', precision: 5, scale: 2, default: 100 })
  faceCoveragePercent: number;

  @Column({ name: 'face_violations_count', type: 'int', default: 0 })
  faceViolationsCount: number;

  @Column({ name: 'inactivity_duration_seconds', type: 'int', default: 0 })
  inactivityDurationSeconds: number;

  @Column({ name: 'tab_switch_log', type: 'jsonb', default: [] })
  tabSwitchLog: Array<{ timestamp: string; elapsedSeconds: number; questionId?: number }>;

  @Column({ name: 'coding_timeline', type: 'jsonb', default: [] })
  codingTimeline: Array<{
    questionId: number;
    type: 'RUN' | 'SUBMIT';
    status: string;
    passedCases?: number;
    totalCases?: number;
    score?: number;
    timestamp: string;
    elapsedSeconds: number;
  }>;

  @Column({ name: 'auto_submitted_reason', type: 'varchar', length: 32, nullable: true })
  autoSubmittedReason: string | null;

  @Column({ name: 'mcq_score', type: 'decimal', precision: 9, scale: 2, nullable: true })
  mcqScore: number;

  @Column({ name: 'coding_score', type: 'decimal', precision: 9, scale: 2, nullable: true })
  codingScore: number;

  @Column({ name: 'total_score', type: 'decimal', precision: 9, scale: 2, nullable: true })
  totalScore: number;

  @Column({ nullable: true })
  passed: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
