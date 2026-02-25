const { Pool } = require('pg')
const bcrypt = require('bcryptjs')
require('dotenv').config({ path: '.env.local' })

async function createSuperAdmin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    console.log('🔐 Creating SUPERADMIN account...\n')

    // Superadmin credentials
    const name = 'Super Admin'
    const email = 'admin@lms.com'
    const password = 'admin123'
    const role = 'SUPERADMIN'

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    // Check if superadmin already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    )

    if (existingUser.rows.length > 0) {
      console.log('⚠️  Superadmin already exists! Updating password...\n')
      
      await pool.query(
        'UPDATE users SET password_hash = $1, role = $2 WHERE email = $3',
        [passwordHash, role, email]
      )
      
      console.log('✅ Superadmin password updated!\n')
    } else {
      // Insert superadmin
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role) 
         VALUES ($1, $2, $3, $4)`,
        [name, email, passwordHash, role]
      )
      
      console.log('✅ Superadmin created successfully!\n')
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 SUPERADMIN CREDENTIALS')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('Email:    admin@lms.com')
    console.log('Password: admin123')
    console.log('Role:     SUPERADMIN')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    console.log('🌐 Login at: http://localhost:3001/login\n')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

createSuperAdmin()
