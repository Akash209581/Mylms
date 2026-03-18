require('dotenv').config();
const { Client } = require('pg');

async function checkAdminUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') 
      ? false 
      : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if colleges table exists and has data
    const collegesResult = await client.query('SELECT * FROM colleges ORDER BY id;');
    console.log(`📋 Colleges table (${collegesResult.rows.length} records):`);
    collegesResult.rows.forEach(college => {
      console.log(`  ID ${college.id}: ${college.name}`);
    });

    // Check ADMIN users
    const adminResult = await client.query(`
      SELECT id, name, email, role, college_id, college_name 
      FROM users 
      WHERE role = 'ADMIN'
      ORDER BY id;
    `);
    
    console.log(`\n📋 ADMIN users (${adminResult.rows.length} records):`);
    adminResult.rows.forEach(user => {
      console.log(`  ID ${user.id}: ${user.name} (${user.email})`);
      console.log(`    college_id: ${user.college_id}, college_name: ${user.college_name}`);
    });

    // Check if ADMIN users have valid college_id
    if (adminResult.rows.length > 0) {
      for (const admin of adminResult.rows) {
        if (admin.college_id) {
          const collegeCheck = await client.query(
            'SELECT id, name FROM colleges WHERE id = $1',
            [admin.college_id]
          );
          if (collegeCheck.rows.length === 0) {
            console.log(`\n❌ ADMIN ${admin.email} has college_id=${admin.college_id} but college doesn't exist!`);
          } else {
            console.log(`\n✅ ADMIN ${admin.email} has valid college: ${collegeCheck.rows[0].name}`);
          }
        } else {
          console.log(`\n⚠️  ADMIN ${admin.email} has no college_id`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkAdminUser();
