const { Client } = require('pg');
const fs = require('fs');
const connectionString = 'postgresql://neondb_owner:npg_1wnFCiGM0DzV@ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function check() {
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const colleges = await client.query('SELECT id, name FROM colleges');
    const users = await client.query(`
      SELECT 
        u.id, 
        u.name, 
        u.role, 
        u.college_id, 
        u.college_name as raw_college_name,
        c.name as college_ref_name
      FROM users u
      LEFT JOIN colleges c ON u.college_id = c.id
      ORDER BY u.id
    `);
    
    const result = {
      colleges: colleges.rows,
      users: users.rows
    };
    
    fs.writeFileSync('db_dump.json', JSON.stringify(result, null, 2));
    console.log('Dumped to db_dump.json');

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

check();
