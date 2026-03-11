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
import { College } from './college.entity';

export enum CourseStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('courses')
export class Course {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  thumbnail: string;

  @Column({ length: 100, nullable: true })
  category: string;

  @Column({ length: 50, nullable: true })
  level: string;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    default: 0,
  })
  price: number;

  @Column({ type: 'text', nullable: true })
  objectives: string;

  @Column({ type: 'text', nullable: true })
  prerequisites: string;

  @Column({ name: 'target_audience', type: 'text', nullable: true })
  targetAudience: string;

  @Column({ type: 'int', nullable: true, comment: 'Duration in hours' })
  duration: number;

  @Column({ name: 'instructor_id', nullable: true })
  instructorId: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'instructor_id' })
  instructor: User;

  // College/University - Multi-tenant support
  @Column({ name: 'college_id' })
  collegeId: number;

  @ManyToOne(() => College, (college) => college.courses)
  @JoinColumn({ name: 'college_id' })
  college: College;

  @Column({ default: true })
  published: boolean;

  @Column({
    type: 'varchar',
    default: CourseStatus.DRAFT,
  })
  status: CourseStatus;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approver: User;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
