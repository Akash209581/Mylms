/**
 * Migration script to add organization support to existing database
 * Run with: npm run build && node dist/migrate-organization.js
 */

import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config(); // Load environment variables

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'lms_db',
  synchronize: false, // Don't auto-sync during migration
});

async function migrate() {
  console.log('🔄 Starting organization migration...');

  try {
    await AppDataSource.initialize();
    console.log('✅ Database connected');

    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();

    let coursesUpdated: any;
    let questionsUpdated: any;
    let usersUpdated: any;
    let defaultOrgId: number;
    let questionsTableExists: any;

    // Step 1: Create organizations table if it doesn't exist
    console.log('📋 Step 1: Creating organizations table...');
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "organizations" (
        "id" SERIAL PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL UNIQUE,
        "description" TEXT,
        "type" VARCHAR(100),
        "address" TEXT,
        "city" VARCHAR(100),
        "state" VARCHAR(100),
        "country" VARCHAR(100),
        "contact_email" VARCHAR(255),
        "contact_phone" VARCHAR(50),
        "created_by" INTEGER,
        "active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Organizations table ready');

    // Step 2: Create default organization if it doesn't exist
    console.log('📋 Step 2: Creating default organization...');
    
    // First check if organizations table has data
    const existingOrgs = await queryRunner.query(
      `SELECT id, name FROM "organizations" LIMIT 1`,
    );
    
    if (existingOrgs.length > 0) {
      defaultOrgId = existingOrgs[0].id;
      console.log(`✅ Using existing organization: ${existingOrgs[0].name} (ID: ${defaultOrgId})`);
    } else {
      // Insert with only the columns that definitely exist
      const result = await queryRunner.query(`
        INSERT INTO "organizations" (name, description, active)
        VALUES ('Default Organization', 'Migrated from single-tenant system', true)
        ON CONFLICT (name) DO NOTHING
        RETURNING id
      `);
      
      if (result.length > 0) {
        defaultOrgId = result[0].id;
        console.log(`✅ Created default organization with ID: ${defaultOrgId}`);
      } else {
        const existing = await queryRunner.query(
          `SELECT id FROM "organizations" WHERE name = 'Default Organization' LIMIT 1`,
        );
        defaultOrgId = existing[0].id;
        console.log(`✅ Using existing default organization with ID: ${defaultOrgId}`);
      }
    }

    // Step 3: Add organization_id column to courses table (nullable first)
    console.log('📋 Step 3: Adding organization_id to courses...');
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='courses' AND column_name='organization_id'
        ) THEN
          ALTER TABLE "courses" ADD COLUMN "organization_id" INTEGER;
        END IF;
      END $$;
    `);
    console.log('✅ organization_id column added to courses');

    // Step 4: Update existing courses with default organization
    console.log('📋 Step 4: Updating existing courses...');
    coursesUpdated = await queryRunner.query(`
      UPDATE "courses" 
      SET "organization_id" = $1 
      WHERE "organization_id" IS NULL
    `, [defaultOrgId]);
    console.log(`✅ Updated ${coursesUpdated[1]} courses with default organization`);

    // Step 5: Make organization_id NOT NULL and add foreign key
    console.log('📋 Step 5: Adding constraints to courses...');
    await queryRunner.query(`
      ALTER TABLE "courses" 
      ALTER COLUMN "organization_id" SET NOT NULL
    `);
    
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_courses_organization'
        ) THEN
          ALTER TABLE "courses" 
          ADD CONSTRAINT "FK_courses_organization" 
          FOREIGN KEY ("organization_id") 
          REFERENCES "organizations"("id") 
          ON DELETE CASCADE;
        END IF;
      END $$;
    `);
    console.log('✅ Constraints added to courses table');

    // Step 6: Add organization_id column to questions table (nullable first) - only if table exists
    console.log('📋 Step 6: Checking if questions table exists...');
    questionsTableExists = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'questions'
      )
    `);

    if (questionsTableExists[0].exists) {
      console.log('✅ Questions table found, adding organization_id...');
      await queryRunner.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name='questions' AND column_name='organization_id'
          ) THEN
            ALTER TABLE "questions" ADD COLUMN "organization_id" INTEGER;
          END IF;
        END $$;
      `);
      console.log('✅ organization_id column added to questions');

      // Step 7: Update existing questions with default organization
      console.log('📋 Step 7: Updating existing questions...');
      questionsUpdated = await queryRunner.query(`
        UPDATE "questions" 
        SET "organization_id" = $1 
        WHERE "organization_id" IS NULL
      `, [defaultOrgId]);
      console.log(`✅ Updated ${questionsUpdated[1]} questions with default organization`);

      // Step 8: Make organization_id NOT NULL and add foreign key for questions
      console.log('📋 Step 8: Adding constraints to questions...');
      await queryRunner.query(`
        ALTER TABLE "questions" 
        ALTER COLUMN "organization_id" SET NOT NULL
      `);
      
      await queryRunner.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'FK_questions_organization'
          ) THEN
            ALTER TABLE "questions" 
            ADD CONSTRAINT "FK_questions_organization" 
            FOREIGN KEY ("organization_id") 
            REFERENCES "organizations"("id") 
            ON DELETE CASCADE;
          END IF;
        END $$;
      `);
      console.log('✅ Constraints added to questions table');
    } else {
      console.log('⚠️  Questions table does not exist yet - will be created by TypeORM');
    }

    // Step 9: Add organization_id to users table (nullable - SUPERADMIN won't have org)
    console.log('📋 Step 9: Adding organization_id to users...');
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name='users' AND column_name='organization_id'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "organization_id" INTEGER;
        END IF;
      END $$;
    `);
    console.log('✅ organization_id column added to users');

    // Step 10: Update non-SUPERADMIN users with default organization
    console.log('📋 Step 10: Updating existing users...');
    // Note: SUPERADMIN users should have NULL organization_id, so we update all NULL values
    // If SUPERADMIN enum doesn't exist yet, we just update all users
    try {
      usersUpdated = await queryRunner.query(`
        UPDATE "users" 
        SET "organization_id" = $1 
        WHERE "organization_id" IS NULL 
        AND "role" != 'SUPERADMIN'
      `, [defaultOrgId]);
      console.log(`✅ Updated ${usersUpdated[1]} users with default organization`);
    } catch (error: any) {
      // If SUPERADMIN enum doesn't exist, update all users with NULL org
      if (error.code === '22P02') {
        console.log('⚠️  SUPERADMIN role not in enum yet, updating all users with NULL organization_id');
        usersUpdated = await queryRunner.query(`
          UPDATE "users" 
          SET "organization_id" = $1 
          WHERE "organization_id" IS NULL
        `, [defaultOrgId]);
        console.log(`✅ Updated ${usersUpdated[1]} users with default organization`);
      } else {
        throw error;
      }
    }

    // Step 11: Add foreign key for users (nullable)
    console.log('📋 Step 11: Adding foreign key to users...');
    await queryRunner.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_users_organization'
        ) THEN
          ALTER TABLE "users" 
          ADD CONSTRAINT "FK_users_organization" 
          FOREIGN KEY ("organization_id") 
          REFERENCES "organizations"("id") 
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    console.log('✅ Foreign key added to users table');

    await queryRunner.release();
    await AppDataSource.destroy();

    console.log('\n✨ Migration completed successfully!');
    console.log(`📊 Summary:
    - Default Organization ID: ${defaultOrgId}
    - Courses updated: ${coursesUpdated[1] || 0}
    - Questions updated: ${questionsTableExists[0]?.exists ? (questionsUpdated?.[1] || 0) : 'N/A (table does not exist)'}
    - Users updated: ${usersUpdated[1] || 0}
    `);
    console.log('\n🚀 You can now restart the application.');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrate();
