const { Client } = require('pg');

async function testConnection() {
  // Try removing .c-4
  const url = 'postgresql://neondb_owner:npg_1wnFCiGM0DzV@ep-gentle-moon-aiq823ba-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&uselibpqcompat=true';
  console.log('Testing without .c-4 ...');
  
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
