require('dotenv').config();
const { Client } = require('pg');

async function fixSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') 
      ? false 
      : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // 1. Set college_id to 1 where it's null (assuming it should be 1)
    await client.query('UPDATE questions SET college_id = 1 WHERE college_id IS NULL');
    console.log('✅ Updated college_id for existing questions');

    // 2. Add organization_id if it's missing
    try {
      await client.query('ALTER TABLE questions ADD COLUMN organization_id integer DEFAULT 1');
      console.log('✅ Added organization_id column');
    } catch (e) {
      if (e.code === '42701') console.log('ℹ️ organization_id already exists');
      else console.error('❌ Error adding organization_id:', e.message);
    }

    // 3. Add createdAt if it's missing (important for orderBy)
    try {
      await client.query('ALTER TABLE questions ADD COLUMN "createdAt" TIMESTAMP DEFAULT now()');
      console.log('✅ Added "createdAt" column');
    } catch (e) {
      if (e.code === '42701') console.log('ℹ️ "createdAt" already exists');
      else console.error('❌ Error adding "createdAt":', e.message);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixSchema();
