import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum ContestType {
  CONTEST = 'CONTEST',
  ASSESSMENT = 'ASSESSMENT',
  TEST = 'TEST',
}

export enum ContestStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
}

@Entity('contests')
export class Contest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: ContestType, default: ContestType.TEST })
  type: ContestType;

  @Column({ type: 'enum', enum: ContestStatus, default: ContestStatus.DRAFT })
  status: ContestStatus;

  @Column({ type: 'int', default: 60 })
  durationMinutes: number;

  @Column({ type: 'jsonb', nullable: true })
  questionIds: number[]; // IDs from questions table

  @Column({ nullable: true })
  startTime: Date;

  @Column({ nullable: true })
  endTime: Date;

  @Column({ nullable: true })
  targetRole: string; // STUDENT / ALL

  @Column({ type: 'int', default: 0 })
  totalMarks: number;

  @Column({ type: 'int', default: 0 })
  passingMarks: number;

  @Column({ nullable: true })
  createdById: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdById' })
  createdBy: User;

  @CreateDateColumn()
  createdAt: Date;
}
