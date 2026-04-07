const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  // Try direct connection instead of pooler
  const directUrl = process.env.DATABASE_URL.replace('-pooler', '');
  console.log('Testing with DIRECT URL:', directUrl);
  
  const client = new Client({
    connectionString: directUrl,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected successfully!');
    const res = await client.query('SELECT NOW()');
    console.log('Result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Connection error:', err);
  }
}

testConnection();
