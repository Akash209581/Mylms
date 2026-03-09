// Check courses and user ownership
require('dotenv').config();
const { DataSource } = require('typeorm');

async function checkCourses() {
  const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:password@localhost:5432/lms';
  
  const dataSource = new DataSource({
    type: 'postgres',
    url: dbUrl,
    ssl: dbUrl.includes('localhost') ? false : { rejectUnauthorized: false },
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected\n');

    // Get instructor user
    const instructor = await dataSource.query(
      `SELECT id, name, email, role, organization_id FROM users WHERE email = 'instructor@eduverse.com'`
    );

    if (instructor.length === 0) {
      console.log('❌ Instructor not found');
      await dataSource.destroy();
      return;
    }

    const instructorData = instructor[0];
    console.log('👤 Instructor:');
    console.log(`   ID: ${instructorData.id}`);
    console.log(`   Name: ${instructorData.name}`);
    console.log(`   Email: ${instructorData.email}`);
    console.log(`   Organization ID: ${instructorData.organization_id}\n`);

    // Get all courses
    const courses = await dataSource.query(
      `SELECT id, title, instructor_id, organization_id, status, published 
       FROM courses 
       ORDER BY id`
    );

    console.log(`📚 All Courses (${courses.length} total):\n`);
    courses.forEach(c => {
      const isOwner = c.instructor_id === instructorData.id;
      const sameOrg = c.organization_id === instructorData.organization_id;
      console.log(`   Course ID: ${c.id}`);
      console.log(`   Title: ${c.title}`);
      console.log(`   Instructor ID: ${c.instructor_id} ${isOwner ? '✅ (YOU)' : '❌'}`);
      console.log(`   Organization ID: ${c.organization_id} ${sameOrg ? '✅' : '❌'}`);
      console.log(`   Status: ${c.status}`);
      console.log(`   Published: ${c.published}`);
      console.log(`   Access: ${isOwner || (sameOrg && c.status === 'APPROVED') ? '✅ YES' : '❌ NO'}`);
      console.log();
    });

    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await dataSource.destroy();
    process.exit(1);
  }
}

checkCourses();
