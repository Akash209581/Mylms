import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { ForumPost } from './forum-post.entity';

@Entity('forum_replies')
export class ForumReply {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'post_id' })
  postId: number;

  @ManyToOne(() => ForumPost, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'post_id' })
  post: ForumPost;

  @Column({ name: 'author_id' })
  authorId: number;

  @ManyToOne(() => User, { eager: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  author: User;

  @Column({ name: 'likes_count', default: 0 })
  likesCount: number;

  @Column({ name: 'is_accepted', default: false })
  isAccepted: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
