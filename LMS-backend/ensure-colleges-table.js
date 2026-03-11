require('dotenv').config();
const { Client } = require('pg');

async function checkTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') 
      ? false 
      : { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Check if colleges table exists
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('colleges', 'organizations', 'users')
      ORDER BY table_name;
    `);

    console.log('\n📋 Existing tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });

   // If colleges table doesn't exist, create it
    const collegesExists = tablesResult.rows.some(row => row.table_name === 'colleges');
    
    if (!collegesExists) {
      console.log('\n🔨 Creating colleges table...');
      
      await client.query(`
        CREATE TABLE colleges (
          id SERIAL PRIMARY KEY,
          name VARCHAR(200) UNIQUE NOT NULL,
          description VARCHAR(500),
          type VARCHAR(100),
          address VARCHAR(255),
          city VARCHAR(100),
          state VARCHAR(100),
          country VARCHAR(100),
          contact_email VARCHAR(255),
          contact_phone VARCHAR(20),
          created_by INTEGER,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      
      console.log('✅ colleges table created');

      // Add foreign key constraint now
      await client.query(`
        ALTER TABLE users
        ADD CONSTRAINT users_college_id_fkey 
        FOREIGN KEY (college_id) REFERENCES colleges(id) 
        ON DELETE SET NULL;
      `);
      
      console.log('✅ Foreign key constraint added');
      
      // Auto-create colleges from existing users' college_name values
      await client.query(`
        INSERT INTO colleges (name, active, created_at, updated_at)
        SELECT DISTINCT college_name, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        FROM users 
        WHERE college_name IS NOT NULL 
        AND college_name != ''
        ON CONFLICT (name) DO NOTHING;
      `);
      
      console.log('✅ Auto-created colleges from existing user data');

      // Update users' college_id based on their college_name
      await client.query(`
        UPDATE users u
        SET college_id = c.id
        FROM colleges c
        WHERE u.college_name = c.name
        AND u.college_id IS NULL;
      `);
      
      console.log('✅ Updated users college_id references');
    }

    // Verify data
    const collegeCount = await client.query('SELECT COUNT(*) FROM colleges;');
    console.log(`\n📊 Total colleges: ${collegeCount.rows[0].count}`);

    const userSample = await client.query(`
      SELECT id, email, role, college_id, college_name 
      FROM users 
      WHERE email = 'superadmin@eduverse.com'
      LIMIT 1;
    `);

    if (userSample.rows.length > 0) {
      console.log('\n📍 SUPERADMIN user:');
      console.log(userSample.rows[0]);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkTables();
