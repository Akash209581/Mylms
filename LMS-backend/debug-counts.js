
const { Client } = require('pg');
const connectionString = 'postgresql://neondb_owner:npg_1wnFCiGM0DzV@ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function migrate() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Dropping legacy module_id constraint from lessons...');
    
    // First drop the NOT NULL constraint. 
    // Even better, just drop the column since its data was already moved.
    await client.query('ALTER TABLE lessons DROP COLUMN IF EXISTS module_id');
    
    console.log('SUCCESS: module_id column dropped from lessons table');
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await client.end();
  }
}
migrate();
