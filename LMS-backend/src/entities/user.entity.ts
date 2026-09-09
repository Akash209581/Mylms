import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { College } from './college.entity';



export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  INSTRUCTOR = 'INSTRUCTOR',
  STUDENT = 'STUDENT',
  QUESTION_CREATOR = 'QUESTION_CREATOR',
  CONTENT_CREATOR = 'CONTENT_CREATOR',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, nullable: true })
  name: string;

  @Column({ unique: true, length: 255, nullable: true })
  email: string;

  @Column({ name: 'password_hash', nullable: true, select: false })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

  // College/University - Multi-tenant support (nullable for SUPERADMIN)
  @Column({ name: 'college_id', nullable: true })
  collegeId?: number;

  @ManyToOne(() => College, (college) => college.users, {
    nullable: true,
  })
  @JoinColumn({ name: 'college_id' })
  college?: College;




  // Student Profile Fields
  @Column({ name: 'mobile_number', length: 15, nullable: true })
  mobileNumber?: string;

  @Column({ length: 100, nullable: true })
  country?: string;

  @Column({ length: 100, nullable: true })
  state?: string;

  @Column({ length: 100, nullable: true })
  course?: string;

  @Column({ length: 100, nullable: true })
  branch?: string;

  @Column({ name: 'pursuing_year', type: 'int', nullable: true })
  pursuingYear?: number;

  @Column({ type: 'int', nullable: true })
  semester?: number;

  @Column({ name: 'registration_number', length: 100, nullable: true })
  registrationNumber?: string;

  @Column({ name: 'college_name', length: 200, nullable: true })
  collegeName?: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  @Column({ name: 'profile_picture', nullable: true })
  profilePicture?: string;

  @Column({ name: 'github_url', nullable: true })
  githubUrl?: string;

  @Column({ name: 'linkedin_url', nullable: true })
  linkedInUrl?: string;

  @Column({ name: 'portfolio_url', nullable: true })
  portfolioUrl?: string;

  @Column({ name: 'twitter_url', nullable: true })
  twitterUrl?: string;

  @Column({ default: 0 })
  points: number;

  @Column({ name: 'streak_count', default: 0 })
  streakCount: number;

  @Column({ name: 'last_streak_update', nullable: true })
  lastStreakUpdate?: Date;

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
