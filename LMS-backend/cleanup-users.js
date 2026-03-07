const { Client } = require('pg');

async function cleanupAndUpdateUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lms',
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Get default organization ID
    const orgResult = await client.query(
      "SELECT id FROM organizations WHERE name = 'Default Organization' LIMIT 1"
    );
    
    if (orgResult.rows.length === 0) {
      console.error('❌ Default organization not found');
      process.exit(1);
    }

    const organizationId = orgResult.rows[0].id;
    console.log(`Default Organization ID: ${organizationId}\n`);

    // Delete test users (created today)
    const deleteResult = await client.query(
      `DELETE FROM users WHERE email IN ('superadmin@test.com', 'admin@test.com', 'student@test.com') RETURNING email`
    );
    
    if (deleteResult.rows.length > 0) {
      console.log('🗑️  Deleted test users:');
      deleteResult.rows.forEach(row => console.log(`   - ${row.email}`));
      console.log('');
    }

    // Update existing users with organization (all except SUPERADMIN)
    const updateResult = await client.query(
      `UPDATE users 
       SET organization_id = $1 
       WHERE role != 'SUPERADMIN' AND organization_id IS NULL
       RETURNING id, email, role`,
      [organizationId]
    );

    if (updateResult.rows.length > 0) {
      console.log('✅ Updated existing users with organization:');
      updateResult.rows.forEach(row => console.log(`   - ${row.email} (${row.role})`));
      console.log('');
    }

    // Show final user list
    const finalResult = await client.query(
      'SELECT id, name, email, role, organization_id FROM users ORDER BY id ASC'
    );

    console.log('📋 Final user list:\n');
    console.log('ID | Name                | Email                    | Role        | Org ID');
    console.log('---'.repeat(25));
    
    finalResult.rows.forEach(user => {
      console.log(
        `${user.id.toString().padEnd(3)}| ${user.name.padEnd(20)}| ${user.email.padEnd(25)}| ${user.role.padEnd(12)}| ${String(user.organization_id || 'NULL')}`
      );
    });

    console.log('\n✅ Cleanup completed successfully!');
    console.log('\nYou can now login with your existing users:');
    console.log('  - superadmin@eduverse.com');
    console.log('  - admin@eduverse.com');
    console.log('  - instructor@eduverse.com');
    console.log('  - student@eduverse.com');
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

cleanupAndUpdateUsers();
