require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    const domains = await client.query('SELECT * FROM domains');
    console.log('--- DATABASE STATUS ---');
    console.log(`Found ${domains.rowCount} domains:`);
    domains.rows.forEach(d => console.log(`- ${d.name}`));
    
    const topics = await client.query('SELECT count(*) FROM topics');
    console.log(`Total topics in DB: ${topics.rows[0].count}`);
    console.log('-----------------------');
  } catch (e) {
    console.error('DATABASE ERROR:', e.message);
  } finally {
    await client.end();
  }
}

main();
