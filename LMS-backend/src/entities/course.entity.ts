import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

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

    @Column({ name: 'instructor_id', nullable: true })
    instructorId: number;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'instructor_id' })
    instructor: User;

    @Column({ default: true })
    published: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
