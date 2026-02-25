const { Pool } = require('pg')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: '.env.local' })

async function runSchema() {
  // Check if DATABASE_URL is loaded
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL not found in .env.local')
    process.exit(1)
  }
  
  console.log('🔌 Using database:', process.env.DATABASE_URL.split('@')[1]?.split('?')[0] || 'Unknown')
  
  // Parse connection string
  const connectionString = process.env.DATABASE_URL
  
  const pool = new Pool({
    connectionString: connectionString,
    ssl: connectionString && connectionString.includes('sslmode=require') 
      ? { rejectUnauthorized: false } 
      : false,
  })

  try {
    console.log('🔌 Connecting to Neon database...')
    
    // Test connection
    const testResult = await pool.query('SELECT version()')
    console.log('✅ Connected to PostgreSQL:', testResult.rows[0].version.split(' ')[1])
    
    // Read schema file
    const schemaPath = path.join(__dirname, 'neon-schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    
    console.log('📝 Running schema...')
    
    // Execute schema
    await pool.query(schema)
    
    console.log('✅ Schema created successfully!')
    console.log('\n📊 Verifying tables...')
    
    // Verify tables
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    console.log('\nCreated tables:')
    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`)
    })
    
    console.log('\n🎉 Database setup complete!')
    
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

runSchema()
