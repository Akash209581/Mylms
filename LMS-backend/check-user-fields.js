require('dotenv').config();
const { Client } = require('pg');

async function checkUserFields() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') 
      ? false 
      : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Check users table columns
    const result = await client.query(`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('Users table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkUserFields();
