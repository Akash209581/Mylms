// Quick script to assign instructors without organizations to the default organization
require('dotenv').config();
const { DataSource } = require('typeorm');

async function fixInstructorOrgs() {
  // Parse DATABASE_URL
  const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/lms';
  console.log('Using database:', dbUrl.replace(/:[^:@]*@/, ':****@'));
  
  const dataSource = new DataSource({
    type: 'postgres',
    url: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    // Get default organization
    const orgResult = await dataSource.query(
      `SELECT id, name FROM organizations WHERE name = 'Default Organization' LIMIT 1`
    );

    if (orgResult.length === 0) {
      console.log('⚠️  No default organization found. Creating one...');
      const newOrg = await dataSource.query(`
        INSERT INTO organizations (name, type, description, country, active, created_at, updated_at)
        VALUES ('Default Organization', 'University', 'Default organization for existing data', 'India', true, NOW(), NOW())
        RETURNING id, name
      `);
      console.log('✅ Created default organization:', newOrg[0]);
      orgResult.push(newOrg[0]);
    }

    const defaultOrgId = orgResult[0].id;
    console.log(`\n📋 Using organization: ${orgResult[0].name} (ID: ${defaultOrgId})`);

    // Find users without organizationId
    const usersWithoutOrg = await dataSource.query(
      `SELECT id, name, email, role FROM users WHERE organization_id IS NULL`
    );

    console.log(`\n👥 Found ${usersWithoutOrg.length} users without organization:\n`);
    usersWithoutOrg.forEach(u => {
      console.log(`   - ${u.name} (${u.email}) - Role: ${u.role}`);
    });

    if (usersWithoutOrg.length > 0) {
      // Update users to have the default organization
      const result = await dataSource.query(
        `UPDATE users SET organization_id = $1 WHERE organization_id IS NULL`,
        [defaultOrgId]
      );

      console.log(`\n✅ Updated ${usersWithoutOrg.length} users with default organization`);
    } else {
      console.log('\n✅ All users already have an organization assigned');
    }

    await dataSource.destroy();
    console.log('\n✨ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    await dataSource.destroy();
    process.exit(1);
  }
}

fixInstructorOrgs();
