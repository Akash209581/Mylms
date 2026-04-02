import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('badges')
export class Badge {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  icon: string;

  @Column({ name: 'criteria_type' })
  criteriaType: string; // e.g., 'STREAK', 'COURSE_COMPLETION', 'POINTS'

  @Column({ name: 'criteria_value' })
  criteriaValue: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
