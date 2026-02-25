import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(['INSTRUCTOR'])

    // Fetch instructor's courses
    const courses = await query(
      'SELECT * FROM courses WHERE instructor_id = $1 ORDER BY created_at DESC LIMIT 5',
      [user.id]
    )

    // Total courses by instructor
    const totalCoursesResult = await query(
      'SELECT COUNT(*) as count FROM courses WHERE instructor_id = $1',
      [user.id]
    )
    const totalCourses = parseInt(totalCoursesResult[0]?.count || '0')

    // Published courses
    const publishedCoursesResult = await query(
      'SELECT COUNT(*) as count FROM courses WHERE instructor_id = $1 AND is_published = true',
      [user.id]
    )
    const publishedCourses = parseInt(publishedCoursesResult[0]?.count || '0')

    // Total enrollments in instructor's courses
    const enrollmentsResult = await query(
      `SELECT COUNT(*) as count 
       FROM enrollments e 
       INNER JOIN courses c ON e.course_id = c.id 
       WHERE c.instructor_id = $1`,
      [user.id]
    )
    const totalEnrollments = parseInt(enrollmentsResult[0]?.count || '0')

    // Active enrollments
    const activeEnrollmentsResult = await query(
      `SELECT COUNT(*) as count 
       FROM enrollments e 
       INNER JOIN courses c ON e.course_id = c.id 
       WHERE c.instructor_id = $1 AND e.status = 'ACTIVE'`,
      [user.id]
    )
    const activeEnrollments = parseInt(activeEnrollmentsResult[0]?.count || '0')

    // Recent enrollments in instructor's courses
    const recentEnrollments = await query(
      `SELECT e.*, u.name as student_name, u.email as student_email, c.title as course_title
       FROM enrollments e
       INNER JOIN courses c ON e.course_id = c.id
       INNER JOIN users u ON e.student_id = u.id
       WHERE c.instructor_id = $1
       ORDER BY e.enrolled_at DESC
       LIMIT 10`,
      [user.id]
    )

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
        publishedCourses,
        totalEnrollments,
        activeEnrollments,
      },
      courses,
      recentEnrollments,
    })
  } catch (error: any) {
    console.error('Instructor Dashboard API error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Unauthorized' },
      { status: 401 }
    )
  }
}
