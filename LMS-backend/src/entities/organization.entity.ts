import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Course } from './course.entity';
import { Question } from './question.entity';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 200 })
  name: string;

  @Column({ length: 500, nullable: true })
  description?: string;

  @Column({ length: 100, nullable: true })
  type?: string; // University, College, Institute

  @Column({ length: 255, nullable: true })
  address?: string;

  @Column({ length: 100, nullable: true })
  city?: string;

  @Column({ length: 100, nullable: true })
  state?: string;

  @Column({ length: 100, nullable: true })
  country?: string;

  @Column({ name: 'contact_email', length: 255, nullable: true })
  contactEmail?: string;

  @Column({ name: 'contact_phone', length: 20, nullable: true })
  contactPhone?: string;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: number; // SUPERADMIN who created this organization

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @OneToMany(() => User, (user: any) => user.organization)
  users: User[];

  @OneToMany(() => Course, (course: any) => course.organization)
  courses: Course[];

  @OneToMany(() => Question, (question: any) => question.organization)
  questions: Question[];

}
