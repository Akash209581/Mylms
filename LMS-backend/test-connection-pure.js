const { Client } = require('pg');
require('dotenv').config();

async function testConnection() {
  const pureUrl = process.env.DATABASE_URL.split('?')[0];
  console.log('Testing with pure URL:', pureUrl);
  
  const client = new Client({
    connectionString: pureUrl,
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
