import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { CourseModule } from './module.entity';

@Entity('lessons')
export class Lesson {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ length: 255 })
    title: string;

    @Column({ name: 'content_url', nullable: true })
    contentUrl: string;

    @Column({ name: 'module_id' })
    moduleId: number;

    @ManyToOne(() => CourseModule, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'module_id' })
    module: CourseModule;

    @Column({ default: 0 })
    order: number;
}
