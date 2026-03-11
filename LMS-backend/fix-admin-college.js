require('dotenv').config();
const { Client } = require('pg');

async function fixAdminCollege() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') 
      ? false 
      : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Get or create a default college for admin
    let college = await client.query('SELECT * FROM colleges LIMIT 1;');
    
    if (college.rows.length === 0) {
      // Create a default college
      console.log('🔨 Creating default college...');
      const result = await client.query(`
        INSERT INTO colleges (name, active, created_at, updated_at)
        VALUES ('Default College', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING *;
      `);
      college = result;
      console.log(`✅ Created college: ${college.rows[0].name} (ID: ${college.rows[0].id})`);
    } else {
      console.log(`📋 Using existing college: ${college.rows[0].name} (ID: ${college.rows[0].id})`);
    }

    const collegeId = college.rows[0].id;
    const collegeName = college.rows[0].name;

    // Update ADMIN users without college_id
    const result = await client.query(`
      UPDATE users 
      SET college_id = $1, college_name = $2
      WHERE role = 'ADMIN' AND college_id IS NULL
      RETURNING id, name, email, college_id, college_name;
    `, [collegeId, collegeName]);

    if (result.rows.length > 0) {
      console.log(`\n✅ Updated ${result.rows.length} ADMIN users:`);
      result.rows.forEach(user => {
        console.log(`  - ${user.name} (${user.email}): college_id=${user.college_id}, college_name=${user.college_name}`);
      });
    } else {
      console.log('\n✅ No ADMIN users needed updating');
    }

    // Verify all ADMIN users now have college
    const verify = await client.query(`
      SELECT id, name, email, role, college_id, college_name 
      FROM users 
      WHERE role = 'ADMIN'
      ORDER BY id;
    `);

    console.log(`\n📋 All ADMIN users (after fix):`);
    verify.rows.forEach(user => {
      console.log(`  ✓ ${user.name} (${user.email}): college_id=${user.college_id}, college_name=${user.college_name}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

fixAdminCollege();
