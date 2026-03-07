import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
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

  @Column({ length: 100 })
  name: string;

  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ name: 'password_hash' })
  passwordHash: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.STUDENT })
  role: UserRole;

  // Organization - Multi-tenant support (nullable for SUPERADMIN)
  @Column({ name: 'organization_id', nullable: true })
  organizationId?: number;

  @ManyToOne(() => Organization, (organization) => organization.users, {
    nullable: true,
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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
