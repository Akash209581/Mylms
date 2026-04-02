import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ForumReply } from './forum-reply.entity';

export enum ForumCategory {
  GENERAL = 'General Discussion',
  DSA = 'Data Structures & Algorithms',
  ML = 'Machine Learning',
  WEB = 'Web Development',
  CAREER = 'Career Guidance',
  STUDY = 'Study Groups',
}

@Entity('forum_posts')
export class ForumPost {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: ForumCategory, default: ForumCategory.GENERAL })
  category: ForumCategory;

  @Column({ name: 'author_id' })
  authorId: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'likes_count', default: 0 })
  likesCount: number;

  @Column({ name: 'views_count', default: 0 })
  viewsCount: number;

  @Column({ name: 'is_pinned', default: false })
  isPinned: boolean;

  @Column({ name: 'tags', type: 'simple-array', nullable: true })
  tags: string[];

  @OneToMany(() => ForumReply, (reply) => reply.post)
  replies: ForumReply[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
