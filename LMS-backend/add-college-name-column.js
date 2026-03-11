/**
 * Quick script to add the college_name column to the users table
 * Run with: node add-college-name-column.js
 */

const { Client } = require('pg');
require('dotenv').config();

async function addCollegeNameColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('neon.tech')
      ? { rejectUnauthorized: false }
      : false,
  });

  try {
    await client.connect();
    console.log('🔗 Connected to database');

    // Check if column exists
    const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'college_name'
    `);

    if (checkResult.rows.length > 0) {
      console.log('ℹ️  college_name column already exists');
    } else {
      console.log('📝 Adding college_name column...');
      
      // Add column
      await client.query(`
        ALTER TABLE users ADD COLUMN college_name VARCHAR(200)
      `);
      
      console.log('✅ Added college_name column');
      
      // Populate from colleges table
      console.log('📝 Populating college_name from colleges table...');
      const updateResult = await client.query(`
        UPDATE users u
        SET college_name = c.name
        FROM colleges c
        WHERE u.college_id = c.id AND u.college_name IS NULL
      `);
      
      console.log(`✅ Updated ${updateResult.rowCount} rows with college names`);
    }

    console.log('✅ Migration complete!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addCollegeNameColumn();
