import bcrypt from 'bcryptjs'
import { query, queryOne } from './db'
import { User } from './types'

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10)
  return bcrypt.hash(password, salt)
}

// Verify password
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Create a new user
export async function createUser(name: string, email: string, password: string, role: 'STUDENT' | 'INSTRUCTOR' | 'ADMIN' = 'STUDENT'): Promise<User> {
  const hashedPassword = await hashPassword(password)
  
  const users = await query<User>(
    `INSERT INTO users (name, email, password_hash, role) 
     VALUES ($1, $2, $3, $4) 
     RETURNING id, name, email, role, avatar_url, created_at, updated_at`,
    [name, email, hashedPassword, role]
  )
  
  return users[0]
}

// Find user by email
export async function findUserByEmail(email: string): Promise<User | null> {
  return queryOne<User>(
    'SELECT id, name, email, password_hash, role, avatar_url, created_at, updated_at FROM users WHERE email = $1',
    [email]
  )
}

// Find user by ID
export async function findUserById(id: string): Promise<User | null> {
  return queryOne<User>(
    'SELECT id, name, email, role, avatar_url, created_at, updated_at FROM users WHERE id = $1',
    [id]
  )
}

// Authenticate user
export async function authenticateUser(email: string, password: string): Promise<User | null> {
  const user = await findUserByEmail(email)
  
  if (!user || !user.password_hash) {
    return null
  }
  
  const isValid = await verifyPassword(password, user.password_hash)
  
  if (!isValid) {
    return null
  }
  
  // Remove password_hash from returned user
  const { password_hash, ...userWithoutPassword } = user
  return userWithoutPassword as User
}

// Check if email exists
export async function emailExists(email: string): Promise<boolean> {
  const result = await queryOne<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)',
    [email]
  )
  return result?.exists || false
}
