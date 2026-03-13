const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Simple .env parser
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  console.log('Looking for .env at:', envPath);
  
  if (fs.existsSync(envPath)) {
    console.log('.env file found, loading...');
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
            console.log(`Loaded: ${key}`);
          }
        }
      }
    });
  } else {
    console.log('.env file not found');
  }
}

async function fixQuestionOrganization() {
  // Load environment variables
  loadEnv();

  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Found' : 'Not found');

  if (!process.env.DATABASE_URL) {
    console.error('✗ DATABASE_URL not found in .env file');
    process.exit(1);
  }

  // Use DATABASE_URL from .env file
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check for questions with null organizationId
    const checkResult = await client.query(
      'SELECT COUNT(*) as count FROM questions WHERE organization_id IS NULL'
    );
    const nullCount = parseInt(checkResult.rows[0].count);
    
    console.log(`\nFound ${nullCount} questions with null organization_id`);

    if (nullCount === 0) {
      console.log('✓ All questions have organization_id set. No action needed.');
      return;
    }

    // Get the first organization ID (default organization)
    const orgResult = await client.query(
      'SELECT id FROM organizations ORDER BY id ASC LIMIT 1'
    );
    
    if (orgResult.rows.length === 0) {
      console.error('✗ No organizations found in database. Please create an organization first.');
      return;
    }

    const defaultOrgId = orgResult.rows[0].id;
    console.log(`\nUsing organization ID ${defaultOrgId} as default for null questions`);

    // Update questions with null organizationId
    const updateResult = await client.query(
      'UPDATE questions SET organization_id = $1 WHERE organization_id IS NULL RETURNING id, question_number',
      [defaultOrgId]
    );

    console.log(`\n✓ Updated ${updateResult.rowCount} questions:`);
    updateResult.rows.forEach(row => {
      console.log(`  - Question ${row.question_number} (ID: ${row.id})`);
    });

    // Verify the fix
    const verifyResult = await client.query(
      'SELECT COUNT(*) as count FROM questions WHERE organization_id IS NULL'
    );
    const remainingNull = parseInt(verifyResult.rows[0].count);

    if (remainingNull === 0) {
      console.log('\n✓ Success! All questions now have organization_id set.');
    } else {
      console.log(`\n⚠ Warning: ${remainingNull} questions still have null organization_id`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    throw error;
  } finally {
    await client.end();
    console.log('\nDatabase connection closed');
  }
}

// Run the script
fixQuestionOrganization()
  .then(() => {
    console.log('\n✓ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Script failed:', error);
    process.exit(1);
  });
