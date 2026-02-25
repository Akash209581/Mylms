import { cookies } from 'next/headers'
import { verifyToken, TokenPayload } from './jwt'
import { findUserById } from './auth-utils'
import { User } from './types'

export async function getServerSession(): Promise<User | null> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')

    if (!token) {
      return null
    }

    const payload = await verifyToken(token.value)

    if (!payload || typeof payload !== 'object') {
      return null
    }

    const tokenData = payload as unknown as TokenPayload

    // Fetch user from database
    const user = await findUserById(tokenData.id)

    if (!user) {
      return null
    }

    return user
  } catch (error) {
    return null
  }
}

export async function requireAuth(allowedRoles?: string[]): Promise<User> {
  const user = await getServerSession()

  if (!user) {
    throw new Error('Unauthorized')
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error('Forbidden')
  }

  return user
}
