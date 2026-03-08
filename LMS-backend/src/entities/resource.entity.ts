import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Lesson } from './lesson.entity';

@Entity('resources')
export class Resource {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ name: 'file_url' })
  fileUrl: string;

  @Column({ length: 50 })
  type: string; // pdf, doc, zip, etc.

  @Column({ type: 'bigint', nullable: true })
  fileSize: number;

  @Column({ name: 'lesson_id' })
  lessonId: number;

  @ManyToOne(() => Lesson, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'lesson_id' })
  lesson: Lesson;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
