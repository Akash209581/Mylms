const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Simple .env parser
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    lines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const match = trimmedLine.match(/^([^=:#]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      }
    });
  }
}

async function runMigration() {
  loadEnv();

  if (!process.env.DATABASE_URL) {
    console.error('✗ DATABASE_URL not found in .env file');
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Check if column already exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'questions' 
      AND column_name = 'allowed_languages'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✓ Column allowed_languages already exists');
      return;
    }

    console.log('\nAdding allowed_languages column...');

    // Add the column
    await client.query(`
      ALTER TABLE questions 
      ADD COLUMN allowed_languages JSONB
    `);

    console.log('✓ Column allowed_languages added successfully');

    // Set default value for programming questions
    await client.query(`
      UPDATE questions 
      SET allowed_languages = '["Python"]'::jsonb 
      WHERE type = 'PQ' AND allowed_languages IS NULL
    `);

    console.log('✓ Set default allowed_languages for existing programming questions');

    // Verify
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'questions' 
      AND column_name = 'allowed_languages'
    `);

    if (verifyResult.rows.length > 0) {
      console.log('\n✓ Verification successful:');
      console.log(verifyResult.rows[0]);
    }

  } catch (error) {
    console.error('✗ Error:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('\nDatabase connection closed');
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n✓ Migration completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Migration failed:', error);
    process.exit(1);
  });
