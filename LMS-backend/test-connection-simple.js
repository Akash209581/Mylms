const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  // Simplify URL for testing
  const url = process.env.DATABASE_URL.split('?')[0] + '?sslmode=require';
  console.log('Testing with URL:', url);
  
  const client = new Client({
    connectionString: url,
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
