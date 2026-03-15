const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neon_db_owner:1LwUPEf4JtQc@ep-patient-hill-a5x83fve.us-east-2.aws.neon.tech/neon_db?sslmode=require' });

async function check() {
  await client.connect();
  try {
    console.log('--- Colleges ---');
    const colleges = await client.query('SELECT id, name FROM colleges');
    console.table(colleges.rows);

    console.log('\n--- Courses ---');
    const courses = await client.query(`
      SELECT 
        c.id, 
        c.title, 
        c.status, 
        c.college_id, 
        u.name as instructor_name, 
        u.role as instructor_role
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
    `);
    console.table(courses.rows);

    console.log('\n--- Course Assignments ---');
    const assignments = await client.query('SELECT * FROM course_assignments');
    console.table(assignments.rows);

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

check();
