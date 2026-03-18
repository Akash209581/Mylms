require('dotenv').config();
const { Client } = require('pg');

async function fixCollegeReferences() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') 
      ? false 
      : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if colleges table exists
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'colleges';
    `);

    if (tableCheck.rows.length === 0) {
      console.log('⚠️  colleges table does not exist');
      return;
    }

    // Set all college_id to NULL temporarily
    console.log('\n🔄 Setting all college_id to NULL temporarily...');
    await client.query('UPDATE users SET college_id = NULL;');
    console.log('✅ All college_id set to NULL');

    // Auto-create colleges from existing users' college_name values
    console.log('\n🔄 Creating colleges from college_name values...');
    await client.query(`
      INSERT INTO colleges (name, active, created_at, updated_at)
      SELECT DISTINCT college_name, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM users 
      WHERE college_name IS NOT NULL 
      AND college_name != ''
      ON CONFLICT (name) DO NOTHING;
    `);
    
    const collegeCount = await client.query('SELECT COUNT(*) FROM colleges;');
    console.log(`✅ Created ${collegeCount.rows[0].count} colleges`);

    // Update users' college_id based on their college_name
    console.log('\n🔄 Updating users college_id references...');
    const updateResult = await client.query(`
      UPDATE users u
      SET college_id = c.id
      FROM colleges c
      WHERE u.college_name = c.name
      AND u.college_name IS NOT NULL;
    `);
    
    console.log(`✅ Updated ${updateResult.rowCount} users`);

    // Verify the data
    const userSample = await client.query(`
      SELECT id, email, role, college_id, college_name 
      FROM users 
      WHERE email = 'superadmin@eduverse.com'
      LIMIT 1;
    `);

    if (userSample.rows.length > 0) {
      console.log('\n📍 SUPERADMIN user:');
      console.log(userSample.rows[0]);
    }

    // Show all colleges
    const allColleges = await client.query('SELECT id, name FROM colleges ORDER BY id;');
    console.log('\n📋 All colleges:');
    allColleges.rows.forEach(college => {
      console.log(`  ${college.id}: ${college.name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixCollegeReferences();
