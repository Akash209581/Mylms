require('dotenv').config({ path: './LMS-backend/.env' });
const { Client } = require('pg');

async function addColumns() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const columns = [
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(15)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(100)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS course VARCHAR(100)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS branch VARCHAR(100)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS pursuing_year INTEGER",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS semester INTEGER",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100)",
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS college_name VARCHAR(200)"
    ];

    console.log('Adding missing columns to users table...');
    
    for (const sql of columns) {
      await client.query(sql);
    }
    
    console.log('✅ All columns added successfully!');
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addColumns();
