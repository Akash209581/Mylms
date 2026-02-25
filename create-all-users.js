const { Pool } = require('pg')
const bcrypt = require('bcryptjs')
require('dotenv').config({ path: '.env.local' })

async function createAllRoleAccounts() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  })

  try {
    console.log('🔐 Creating accounts for all user roles...\n')

    const accounts = [
      {
        name: 'Super Admin',
        email: 'admin@lms.com',
        password: 'admin123',
        role: 'SUPERADMIN'
      },
      {
        name: 'John Admin',
        email: 'john@admin.com',
        password: 'admin123',
        role: 'ADMIN'
      },
      {
        name: 'Sarah Teacher',
        email: 'sarah@instructor.com',
        password: 'instructor123',
        role: 'INSTRUCTOR'
      },
      {
        name: 'Mike Student',
        email: 'mike@student.com',
        password: 'student123',
        role: 'STUDENT'
      }
    ]

    const salt = await bcrypt.genSalt(10)

    for (const account of accounts) {
      const passwordHash = await bcrypt.hash(account.password, salt)

      // Check if account exists
      const existing = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [account.email]
      )

      if (existing.rows.length > 0) {
        // Update existing account
        await pool.query(
          'UPDATE users SET password_hash = $1, role = $2, name = $3 WHERE email = $4',
          [passwordHash, account.role, account.name, account.email]
        )
        console.log(`✅ Updated: ${account.name} (${account.role})`)
      } else {
        // Create new account
        await pool.query(
          `INSERT INTO users (name, email, password_hash, role) 
           VALUES ($1, $2, $3, $4)`,
          [account.name, account.email, passwordHash, account.role]
        )
        console.log(`✅ Created: ${account.name} (${account.role})`)
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🎉 ALL USER ACCOUNTS READY!')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    console.log('👑 SUPERADMIN:')
    console.log('   Email: admin@lms.com')
    console.log('   Password: admin123\n')

    console.log('🛡️  ADMIN:')
    console.log('   Email: john@admin.com')
    console.log('   Password: admin123\n')

    console.log('👨‍🏫 INSTRUCTOR:')
    console.log('   Email: sarah@instructor.com')
    console.log('   Password: instructor123\n')

    console.log('🎓 STUDENT:')
    console.log('   Email: mike@student.com')
    console.log('   Password: student123\n')

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('🌐 Login at: http://localhost:3001/login')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

createAllRoleAccounts()
