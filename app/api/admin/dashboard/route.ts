import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { query } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth(['ADMIN', 'SUPERADMIN'])

    // Fetch all users
    const allUsers = await query('SELECT COUNT(*) as count FROM users')
    const totalUsers = parseInt(allUsers[0]?.count || '0')

    // Fetch users by role
    const students = await query("SELECT COUNT(*) as count FROM users WHERE role = 'STUDENT'")
    const totalStudents = parseInt(students[0]?.count || '0')

    const instructors = await query("SELECT COUNT(*) as count FROM users WHERE role = 'INSTRUCTOR'")
    const totalInstructors = parseInt(instructors[0]?.count || '0')

    const admins = await query("SELECT COUNT(*) as count FROM users WHERE role IN ('ADMIN', 'SUPERADMIN')")
    const totalAdmins = parseInt(admins[0]?.count || '0')

    // Fetch all courses
    const allCourses = await query('SELECT COUNT(*) as count FROM courses')
    const totalCourses = parseInt(allCourses[0]?.count || '0')

    const publishedCourses = await query('SELECT COUNT(*) as count FROM courses WHERE is_published = true')
    const totalPublished = parseInt(publishedCourses[0]?.count || '0')

    // Fetch enrollments
    const allEnrollments = await query('SELECT COUNT(*) as count FROM enrollments')
    const totalEnrollments = parseInt(allEnrollments[0]?.count || '0')

    const activeEnrollments = await query("SELECT COUNT(*) as count FROM enrollments WHERE status = 'ACTIVE'")
    const totalActive = parseInt(activeEnrollments[0]?.count || '0')

    // Fetch recent users
    const recentUsers = await query(`
      SELECT id, name, email, role, created_at 
      FROM users 
      ORDER BY created_at DESC 
      LIMIT 5
    `)

    // Fetch recent courses
    const recentCourses = await query(`
      SELECT c.id, c.title, c.category, c.level, c.is_published, c.created_at,
             u.name as instructor_name
      FROM courses c
      LEFT JOIN users u ON c.instructor_id = u.id
      ORDER BY c.created_at DESC 
      LIMIT 5
    `)

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      stats: {
        totalUsers,
        totalStudents,
        totalInstructors,
        totalAdmins,
        totalCourses,
        totalPublished,
        totalEnrollments,
        totalActive,
      },
      recentUsers,
      recentCourses,
    })
  } catch (error: any) {
    console.error('Admin Dashboard API error:', error)
    return NextResponse.json(
      { success: false, message: error.message || 'Unauthorized' },
      { status: 401 }
    )
  }
}
