import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(['STUDENT'])

    // Fetch student enrollments with course details
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
          'duration_hours', c.duration_hours,
          'price', c.price
        ) as course
      FROM enrollments e
      INNER JOIN courses c ON e.course_id = c.id
      WHERE e.student_id = $1
      ORDER BY e.enrolled_at DESC
      LIMIT 3
    `, [user.id])

    // Calculate statistics
    const totalCourses = enrollments?.length || 0
    const completedCourses = enrollments?.filter((e: any) => e.status === 'COMPLETED').length || 0
    const averageProgress = enrollments?.length 
      ? Math.round(enrollments.reduce((sum: number, e: any) => sum + (e.progress || 0), 0) / enrollments.length)
      : 0
    const totalHours = enrollments?.reduce((sum: number, e: any) => sum + (e.course?.duration_hours || 0), 0) || 0

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      stats: {
        totalCourses,
        completedCourses,
        averageProgress,
        totalHours,
      },
      enrollments,
    })
  } catch (error: any) {
    console.error('Dashboard API error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Unauthorized' },
      { status: 401 }
    )
  }
}
