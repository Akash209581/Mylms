import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn()
    id: number;

    // Who performed the action
    @Column({ name: 'actor_id', nullable: true })
    actorId?: number;

    @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
    @JoinColumn({ name: 'actor_id' })
    actor?: User;

    @Column({ name: 'actor_name', length: 200, nullable: true })
    actorName?: string;

    @Column({ name: 'actor_role', length: 50, nullable: true })
    actorRole?: string;

    // What action was performed
    @Column({ length: 100 })
    action: string; // e.g. "USER_SUSPENDED", "ROLE_CHANGED", "COURSE_FORCE_APPROVED"

    // What entity was affected
    @Column({ name: 'target_type', length: 50, nullable: true })
    targetType?: string; // e.g. "User", "Course", "Organization"

    @Column({ name: 'target_id', nullable: true })
    targetId?: number;

    @Column({ name: 'target_name', length: 255, nullable: true })
    targetName?: string;

    // Additional details in JSON
    @Column({ type: 'text', nullable: true })
    details?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
