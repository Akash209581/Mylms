import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

// synchronize is disabled, so every column added to an entity must also be
// added here (idempotently) or queries selecting it fail with a 500.
const STATEMENTS = [
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT`,
  `UPDATE users SET roles = role::text WHERE roles IS NULL OR roles = ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS department VARCHAR(100)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS section VARCHAR(50)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_year VARCHAR(50)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS current_year VARCHAR(50)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS batch_no VARCHAR(50)`,
];

@Injectable()
export class SchemaGuardService implements OnModuleInit {
  private readonly logger = new Logger(SchemaGuardService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit() {
    for (const sql of STATEMENTS) {
      try {
        await this.dataSource.query(sql);
      } catch (err: any) {
        this.logger.error(`Schema guard failed: ${sql} -> ${err?.message || err}`);
      }
    }
  }
}
