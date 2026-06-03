import { Entity, Column, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('settings')
export class Settings {
  @PrimaryColumn({ length: 100 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
