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
      AND column_name = 'extra_right_matches'
    `);

    if (checkResult.rows.length > 0) {
      console.log('✓ Column extra_right_matches already exists');
      return;
    }

    console.log('\nAdding extra_right_matches column...');

    // Add the column
    await client.query(`
      ALTER TABLE questions 
      ADD COLUMN extra_right_matches JSONB
    `);

    console.log('✓ Column extra_right_matches added successfully');

    // Verify
    const verifyResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'questions' 
      AND column_name = 'extra_right_matches'
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
