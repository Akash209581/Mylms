const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neon_db_owner:1LwUPEf4JtQc@ep-patient-hill-a5x83fve.us-east-2.aws.neon.tech/neon_db?sslmode=require' });

async function check() {
  await client.connect();
  try {
    const tables = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log('Tables:', tables.rows.map(r => r.table_name));

    const courseCount = await client.query('SELECT count(*) FROM courses');
    console.log('Total courses:', courseCount.rows[0].count);

    const courses = await client.query(`
      SELECT c.id, c.title, c.status, c.college_id, u.role as instructor_role 
      FROM courses c 
      LEFT JOIN users u ON c.instructor_id = u.id 
      LIMIT 10
    `);
    console.table(courses.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

check();
