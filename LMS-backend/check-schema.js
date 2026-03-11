require('dotenv').config();
const { Client } = require('pg');

async function checkSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') 
      ? false 
      : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check users table columns
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Users table columns:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type}) ${row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Check if college_name exists
    const hasCollegeName = result.rows.some(row => row.column_name === 'college_name');
    if (hasCollegeName) {
      console.log('\n✅ college_name column EXISTS');
    } else {
      console.log('\n❌ college_name column MISSING');
    }

    // Check a sample user
    const userResult = await client.query(`
      SELECT id, email, role, college_id, college_name 
      FROM users 
      WHERE email = 'superadmin@eduverse.com'
      LIMIT 1;
    `);

    if (userResult.rows.length > 0) {
      console.log('\n📍 SUPERADMIN user data:');
      console.log(userResult.rows[0]);
    } else {
      console.log('\n❌ SUPERADMIN user not found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.message.includes('column')) {
      console.error('\n⚠️  This looks like a missing column error!');
    }
  } finally {
    await client.end();
  }
}

checkSchema();
