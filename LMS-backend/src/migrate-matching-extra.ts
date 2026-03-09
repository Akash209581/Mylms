/**
 * Migration script to add extra right matching support to questions
 * Run with: npx ts-node src/migrate-matching-extra.ts
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config(); // Load environment variables

const AppDataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    synchronize: false,
});

async function migrate() {
    console.log('🔄 Starting matching extra options migration...');

    try {
        await AppDataSource.initialize();
        console.log('✅ Database connected');

        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();

        console.log('📋 Adding extra_right_matches column to questions table...');
        await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='questions' AND column_name='extra_right_matches'
        ) THEN
          ALTER TABLE "questions" ADD COLUMN "extra_right_matches" JSONB DEFAULT '[]';
        END IF;
      END $$;
    `);
        console.log('✅ Column extra_right_matches added successfully');

        await queryRunner.release();
        await AppDataSource.destroy();

        console.log('\n✨ Migration completed successfully!');
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
