import { NextRequest, NextResponse } from 'next/server'
import { createToken } from '@/lib/jwt'
import { createUser, emailExists } from '@/lib/auth-utils'
import { z } from 'zod'

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate input
    const validatedData = signupSchema.parse(body)
    const { name, email, password } = validatedData

    // Check if email already exists
    const exists = await emailExists(email)
    if (exists) {
      return NextResponse.json(
        { success: false, message: 'Email already registered' },
        { status: 400 }
      )
    }

    // Create user with hashed password
    const userData = await createUser(name, email, password, 'STUDENT')

    // Generate JWT token
    const token = await createToken(userData)

    // Remove sensitive data from response
    const { password_hash, ...userResponse } = userData as any

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      user: userResponse,
      token,
      message: 'Account created successfully',
    })

    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, message: error.errors[0].message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
