require('dotenv').config();
const { Client } = require('pg');

async function migrateColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') 
      ? false 
      : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if organization_id exists
    const checkOrg = await client.query(`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'organization_id';
    `);

    // Check if college_id exists
    const checkCollege = await client.query(`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'college_id';
    `);

    if (checkOrg.rows.length > 0 && checkCollege.rows.length === 0) {
      console.log('\n🔄 Renaming organization_id to college_id...');
      
      await client.query(`
        ALTER TABLE users 
        RENAME COLUMN organization_id TO college_id;
      `);
      
      console.log('✅ Successfully renamed organization_id to college_id');
      
      // Also rename the foreign key constraint if it exists
      try {
        await client.query(`
          ALTER TABLE users 
          DROP CONSTRAINT IF EXISTS users_organization_id_fkey;
        `);
        console.log('✅ Dropped old foreign key constraint');
      } catch (e) {
        console.log('⚠️  No old foreign key constraint found (OK)');
      }

      // Add foreign key to colleges table
      try {
        await client.query(`
          ALTER TABLE users
          ADD CONSTRAINT users_college_id_fkey 
          FOREIGN KEY (college_id) REFERENCES colleges(id) 
          ON DELETE SET NULL;
        `);
        console.log('✅ Added foreign key constraint to colleges table');
      } catch (e) {
        console.log('⚠️  Could not add foreign key:', e.message);
      }

    } else if (checkCollege.rows.length > 0) {
      console.log('✅ college_id column already exists - no migration needed');
    } else {
      console.log('⚠️  Neither organization_id nor college_id found');
    }

    // Verify the change
    const verify = await client.query(`
      SELECT column_name 
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name IN ('organization_id', 'college_id')
      ORDER BY column_name;
    `);

    console.log('\n📋 Current column status:');
    verify.rows.forEach(row => {
      console.log(`  ✓ ${row.column_name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

migrateColumn();
