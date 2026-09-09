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
