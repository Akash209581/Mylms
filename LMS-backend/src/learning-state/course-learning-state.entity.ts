import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../entities/user.entity';
import { Course } from '../entities/course.entity';
import { Lesson } from '../entities/lesson.entity';

/** Personal learning preferences. Completion and grading remain in their own stores. */
@Entity('course_learning_states')
export class CourseLearningState {
  @PrimaryColumn({ name: 'student_id', type: 'integer' })
  studentId: number;

  @PrimaryColumn({ name: 'course_id', type: 'integer' })
  courseId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'student_id' })
  student: User;

  @ManyToOne(() => Course, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'course_id' })
  course: Course;

  @Column({ default: false })
  saved: boolean;

  @Column({ name: 'saved_at', type: 'timestamptz', nullable: true })
  savedAt: Date | null;

  @Column({ name: 'last_lesson_id', type: 'integer', nullable: true })
  lastLessonId: number | null;

  @ManyToOne(() => Lesson, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'last_lesson_id' })
  lastLesson: Lesson | null;

  @Column({ name: 'last_viewed_at', type: 'timestamptz', nullable: true })
  lastViewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
