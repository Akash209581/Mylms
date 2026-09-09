import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DataSource } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  const sqlPath = path.join(__dirname, '../migrations/008_creator_roles_and_approvals.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('Running migration 008...');
  await dataSource.query(sql);
  console.log('Migration 008 applied successfully!');
  await app.close();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
