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
import { Organization } from './organization.entity';



export enum UserRole {
  SUPERADMIN = 'SUPERADMIN',
  ADMIN = 'ADMIN',
  INSTRUCTOR = 'INSTRUCTOR',
  STUDENT = 'STUDENT',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, nullable: true })
  name: string;

  @Column({ unique: true, length: 255, nullable: true })
  email: string;

  @Column({ name: 'password_hash', nullable: true })
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

  // Organization - Multi-tenant support
  @Column({ name: 'organization_id', nullable: true })
  organizationId?: number;

  @ManyToOne(() => Organization, (organization) => organization.users, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'organization_id' })
  organization?: Organization;


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

  @Column({ name: 'last_login_at', nullable: true })
  lastLoginAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
