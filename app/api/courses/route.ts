import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { Course } from '@/lib/types'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const level = searchParams.get('level')

    let sql = 'SELECT * FROM courses WHERE is_published = true'
    const params: any[] = []
    let paramCount = 1

    if (category) {
      sql += ` AND category = $${paramCount}`
      params.push(category)
      paramCount++
    }

    if (level) {
      sql += ` AND level = $${paramCount}`
      params.push(level)
      paramCount++
    }

    sql += ' ORDER BY created_at DESC'

    const courses = await query<Course>(sql, params)

    return NextResponse.json({
      success: true,
      courses: courses || [],
    })
  } catch (error) {
    console.error('Courses API error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
