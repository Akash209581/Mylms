const { Client } = require('pg');
const bcrypt = require('bcrypt');

async function createTestUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lms',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Get default organization ID
    const orgResult = await client.query(
      "SELECT id FROM organizations WHERE name = 'Default Organization' LIMIT 1"
    );
    
    if (orgResult.rows.length === 0) {
      console.error('❌ Default organization not found. Please run migration first.');
      process.exit(1);
    }

    const organizationId = orgResult.rows[0].id;
    console.log(`Found Default Organization with ID: ${organizationId}`);

    // Check if test users already exist
    const existingUsers = await client.query('SELECT email FROM users WHERE email IN ($1, $2, $3)', [
      'superadmin@test.com',
      'admin@test.com',
      'student@test.com'
    ]);

    const existingEmails = existingUsers.rows.map(row => row.email);

    // Hash password once for all users
    const passwordHash = await bcrypt.hash('test123', 10);
    console.log('Password hash generated');

    // Create SUPERADMIN (no organization)
    if (!existingEmails.includes('superadmin@test.com')) {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, organization_id) 
         VALUES ($1, $2, $3, $4, NULL)`,
        ['Super Admin', 'superadmin@test.com', passwordHash, 'SUPERADMIN']
      );
      console.log('✅ Created SUPERADMIN: superadmin@test.com / test123');
    } else {
      console.log('⏭️  SUPERADMIN already exists');
    }

    // Create ADMIN
    if (!existingEmails.includes('admin@test.com')) {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, organization_id) 
         VALUES ($1, $2, $3, $4, $5)`,
        ['Test Admin', 'admin@test.com', passwordHash, 'ADMIN', organizationId]
      );
      console.log('✅ Created ADMIN: admin@test.com / test123');
    } else {
      console.log('⏭️  ADMIN already exists');
    }

    // Create STUDENT
    if (!existingEmails.includes('student@test.com')) {
      await client.query(
        `INSERT INTO users (name, email, password_hash, role, organization_id, mobile_number, country, course, branch, pursuing_year, semester, registration_number, college_name) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          'Test Student',
          'student@test.com',
          passwordHash,
          'STUDENT',
          organizationId,
          '+911234567890',
          'India',
          'B.Tech',
          'Computer Science',
          3,
          5,
          'TEST001',
          'Test University'
        ]
      );
      console.log('✅ Created STUDENT: student@test.com / test123');
    } else {
      console.log('⏭️  STUDENT already exists');
    }

    console.log('\n🎉 Test users created successfully!');
    console.log('\nLogin credentials:');
    console.log('  SUPERADMIN: superadmin@test.com / test123');
    console.log('  ADMIN:      admin@test.com / test123');
    console.log('  STUDENT:    student@test.com / test123');
    
  } catch (error) {
    console.error('❌ Failed to create test users:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

createTestUser();
