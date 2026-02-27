import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('daily_streaks')
export class DailyStreak {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ type: 'date' })
    date: string; // YYYY-MM-DD

    @Column()
    questionId: number; // FK to questions table

    @Column()
    questionType: string; // MCQ, FIB, etc.

    @Column({ default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
