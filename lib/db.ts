import { Pool } from 'pg'

// Parse connection string and extract SSL parameters
const connectionString = process.env.DATABASE_URL || ''

// Create a PostgreSQL connection pool
const pool = new Pool({
  connectionString: connectionString,
  ssl: connectionString.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
})

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Connected to Neon PostgreSQL database')
})

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err)
  process.exit(-1)
})

// Helper function to execute queries
export async function query<T = any>(text: string, params?: any[]): Promise<T[]> {
  const start = Date.now()
  try {
    const res = await pool.query(text, params)
    const duration = Date.now() - start
    console.log('Executed query', { text, duration, rows: res.rowCount })
    return res.rows
  } catch (error) {
    console.error('Database query error:', error)
    throw error
  }
}

// Helper function to get a single row
export async function queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
  const rows = await query<T>(text, params)
  return rows[0] || null
}

// Export the pool for transactions
export { pool }

export default pool
