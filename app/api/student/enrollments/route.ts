import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(['STUDENT'])

    // Get enrolled courses with details using JOIN
    const enrollments = await query(`
      SELECT 
        e.*,
        json_build_object(
          'id', c.id,
          'title', c.title,
          'description', c.description,
          'thumbnail_url', c.thumbnail_url,
          'category', c.category,
          'level', c.level,
          'duration_hours', c.duration_hours
        ) as course
      FROM enrollments e
      INNER JOIN courses c ON e.course_id = c.id
      WHERE e.student_id = $1
      ORDER BY e.enrolled_at DESC
    `, [user.id])

    return NextResponse.json({
      success: true,
      enrollments: enrollments || [],
    })
  } catch (error: any) {
    console.error('Enrollments API error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Unauthorized' },
      { status: 401 }
    )
  }
}
