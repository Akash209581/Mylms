import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn,
  ManyToOne, OneToMany, JoinColumn,
} from 'typeorm';
import { College } from './college.entity';
import { User } from './user.entity';

export enum ExamStatus {
  DRAFT     = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  LIVE      = 'LIVE',
  COMPLETED = 'COMPLETED',
  ARCHIVED  = 'ARCHIVED',
}

@Entity('exams')
export class Exam {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', nullable: true })
  instructions: string;

  @Column({ name: 'college_id', nullable: true })
  collegeId: number;

  @ManyToOne(() => College, { nullable: true })
  @JoinColumn({ name: 'college_id' })
  college: College;

  @Column({ name: 'created_by_id' })
  createdById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User;

  @Column({ name: 'duration_minutes', default: 60 })
  durationMinutes: number;

  @Column({ name: 'start_at', type: 'timestamptz', nullable: true })
  startAt: Date;

  @Column({ name: 'end_at', type: 'timestamptz', nullable: true })
  endAt: Date;

  @Column({ name: 'total_marks', default: 0 })
  totalMarks: number;

  @Column({ name: 'passing_marks', default: 0 })
  passingMarks: number;

  @Column({ name: 'negative_marking', default: false })
  negativeMarking: boolean;

  @Column({ name: 'negative_marks_value', type: 'decimal', precision: 5, scale: 2, default: 0 })
  negativeMarksValue: number;

  @Column({ name: 'attempt_limit', default: 1 })
  attemptLimit: number;

  @Column({ name: 'randomize_questions', default: false })
  randomizeQuestions: boolean;

  @Column({ name: 'randomize_options', default: false })
  randomizeOptions: boolean;

  @Column({ name: 'auto_submit', default: true })
  autoSubmit: boolean;

  @Column({ type: 'enum', enum: ExamStatus, default: ExamStatus.DRAFT })
  status: ExamStatus;

  @Column({ name: 'show_results', default: true })
  showResults: boolean;

  @Column({ name: 'show_correct_answers', default: true })
  showCorrectAnswers: boolean;

  @Column({ name: 'show_explanations', default: true })
  showExplanations: boolean;

  @Column({ name: 'ranking_enabled', default: false })
  rankingEnabled: boolean;

  @Column({ name: 'tab_switch_monitoring', default: true })
  tabSwitchMonitoring: boolean;

  @Column({ name: 'max_tab_switches', default: 3 })
  maxTabSwitches: number;

  @Column({ name: 'timing_mode', length: 20, default: 'TOTAL' })
  timingMode: string; // 'TOTAL' | 'SECTION' | 'QUESTION'

  @Column({ name: 'section_durations', type: 'jsonb', nullable: true })
  sectionDurations?: { A?: number; B?: number };

  @Column({ name: 'question_duration_seconds', type: 'int', nullable: true })
  questionDurationSeconds?: number;

  @Column({ name: 'target_branches', type: 'jsonb', nullable: true })
  targetBranches?: string[];

  @Column({ name: 'target_batches', type: 'jsonb', nullable: true })
  targetBatches?: string[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
