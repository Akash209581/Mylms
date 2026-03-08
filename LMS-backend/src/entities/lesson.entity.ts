import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CourseModule } from './module.entity';

@Entity('lessons')
export class Lesson {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'video_url', nullable: true })
  videoUrl: string;

  @Column({ name: 'content_url', nullable: true })
  contentUrl: string;

  @Column({ type: 'int', nullable: true, comment: 'Duration in minutes' })
  duration: number;

  @Column({ length: 50, default: 'video' })
  type: string;

  @Column({ default: false })
  published: boolean;

  @Column({ name: 'module_id' })
  moduleId: number;

  @ManyToOne(() => CourseModule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module: CourseModule;

  @Column({ default: 0 })
  order: number;

  /** Block-based TipTap JSON content */
  @Column({ type: 'jsonb', nullable: true, name: 'rich_content' })
  content: Record<string, any>;

  /** Increments on every content save */
  @Column({ default: 1 })
  version: number;

  /** Name/email of last editor */
  @Column({ name: 'last_edited_by', nullable: true })
  lastEditedBy: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
