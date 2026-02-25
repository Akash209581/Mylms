import { NextResponse } from 'next/server'
import { getServerSession } from '@/lib/auth'

export async function GET() {
  try {
    const user = await getServerSession()

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      user,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
