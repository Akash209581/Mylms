import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Exam } from './exam.entity';
import { Question } from './question.entity';

@Entity('exam_questions')
export class ExamQuestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'exam_id' })
  examId: number;

  @ManyToOne(() => Exam, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'exam_id' })
  exam: Exam;

  @Column({ name: 'question_id' })
  questionId: number;

  @ManyToOne(() => Question, { eager: true })
  @JoinColumn({ name: 'question_id' })
  question: Question;

  /** 'A' = MCQ section, 'B' = Coding section */
  @Column({ length: 1 })
  section: string;

  @Column({ type: 'decimal', precision: 7, scale: 2, default: 1 })
  marks: number;

  @Column({ name: 'negative_marks', type: 'decimal', precision: 7, scale: 2, default: 0 })
  negativeMarks: number;

  @Column({ name: 'hints_enabled', default: true })
  hintsEnabled: boolean;

  /** 'MARKS' (deducts marks per hint), 'TIME' (deducts time from exam), 'NONE' (free hints) */
  @Column({ name: 'hint_penalty_type', type: 'varchar', length: 16, default: 'MARKS' })
  hintPenaltyType: 'MARKS' | 'TIME' | 'NONE';

  /** Array of penalty amounts per hint index [hint0Penalty, hint1Penalty, ...] */
  @Column({ name: 'hint_penalties', type: 'jsonb', nullable: true })
  hintPenalties?: number[] | null;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;
}
