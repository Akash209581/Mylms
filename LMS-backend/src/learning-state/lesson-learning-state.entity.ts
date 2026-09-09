import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../entities/user.entity';
import { Lesson } from '../entities/lesson.entity';

@Entity('lesson_learning_states')
export class LessonLearningState {
  @PrimaryColumn({ name: 'student_id', type: 'integer' })
  studentId: number;

  @PrimaryColumn({ name: 'lesson_id', type: 'integer' })
  lessonId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  /** Plain text only; clients must not interpret this field as HTML. */
  @Column({ type: 'text', default: '' })
  note: string;

  @Column({ default: false })
  bookmarked: boolean;

  @Column({ name: 'video_seconds', type: 'double precision', default: 0 })
  videoSeconds: number;

  @Column({ name: 'pdf_page', type: 'integer', default: 1 })
  pdfPage: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
