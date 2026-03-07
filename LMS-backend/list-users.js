const { Client } = require('pg');

async function listUsers() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/lms',
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Get all users
    const result = await client.query(
      'SELECT id, name, email, role, organization_id, created_at FROM users ORDER BY id ASC'
    );

    console.log(`Found ${result.rows.length} users:\n`);
    console.log('ID | Name                | Email                    | Role        | Org ID | Created');
    console.log('---'.repeat(30));
    
    result.rows.forEach(user => {
      const createdDate = new Date(user.created_at).toLocaleDateString();
      console.log(
        `${user.id.toString().padEnd(3)}| ${user.name.padEnd(20)}| ${user.email.padEnd(25)}| ${user.role.padEnd(12)}| ${String(user.organization_id || 'NULL').padEnd(7)}| ${createdDate}`
      );
    });
    
  } catch (error) {
    console.error('❌ Failed to list users:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

listUsers();
