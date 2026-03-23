import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { CourseModule } from './module.entity';
import { Lesson } from './lesson.entity';

@Entity('chapters')
export class Chapter {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'module_id' })
  moduleId: number;

  @ManyToOne(() => CourseModule, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'module_id' })
  module: CourseModule;

  @OneToMany(() => Lesson, (lesson) => lesson.chapter)
  lessons: Lesson[];

  @Column({ default: 0 })
  order: number;
}
