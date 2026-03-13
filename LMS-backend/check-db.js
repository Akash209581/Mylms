const { Client } = require('pg');
require('dotenv').config();

async function check() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const tables = await client.query(`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
  console.log('\n=== TABLES ===');
  tables.rows.forEach(r => console.log(r.tablename));

  const users = await client.query(`SELECT COUNT(*) as count FROM users`);
  console.log('\n=== USER COUNT ===', users.rows[0].count);

  const courses = await client.query(`SELECT COUNT(*) as count FROM courses`);
  console.log('=== COURSE COUNT ===', courses.rows[0].count);

  const courseList = await client.query(`SELECT id, title, status, "instructorId" FROM courses LIMIT 10`);
  console.log('\n=== COURSES ===');
  courseList.rows.forEach(r => console.log(r));

  const enrollments = await client.query(`SELECT COUNT(*) as count FROM enrollments`);
  console.log('\n=== ENROLLMENT COUNT ===', enrollments.rows[0].count);

  await client.end();
}
check().catch(e => console.error('Error:', e.message));
