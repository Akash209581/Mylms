'use client'

import { useState, useEffect } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import StatCard from '@/components/StatCard'
import { 
  BookOpen, 
  Users, 
  CheckCircle, 
  TrendingUp,
  Plus,
  Eye,
  Edit
} from 'lucide-react'

interface DashboardData {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  stats: {
    totalCourses: number
    publishedCourses: number
    totalEnrollments: number
    activeEnrollments: number
  }
  courses: any[]
  recentEnrollments: any[]
}

export default function InstructorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/instructor/dashboard')
      const result = await response.json()

      if (result.success) {
        setData(result)
      } else {
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
      window.location.href = '/login'
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (!data) {
    return null
  }

  const { user, stats, courses, recentEnrollments } = data

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Instructor Dashboard 👨‍🏫
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Welcome back, {user.name}! Manage your courses and students
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Courses"
          value={stats.totalCourses}
          icon={BookOpen}
          color="blue"
          subtitle="Your courses"
        />
        <StatCard
          title="Published"
          value={stats.publishedCourses}
          icon={CheckCircle}
          color="green"
          subtitle="Live courses"
        />
        <StatCard
          title="Total Students"
          value={stats.totalEnrollments}
          icon={Users}
          color="purple"
          subtitle="Enrolled students"
        />
        <StatCard
          title="Active Students"
          value={stats.activeEnrollments}
          icon={TrendingUp}
          color="orange"
          subtitle="Currently learning"
        />
      </div>

      {/* Create Course Button */}
      <div className="mb-8">
        <button className="bg-gradient-to-r from-primary-600 to-blue-600 hover:from-primary-700 hover:to-blue-700 text-white font-semibold px-8 py-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 flex items-center space-x-3 animate-scale-in">
          <Plus className="h-6 w-6" />
          <span>Create New Course</span>
        </button>
      </div>

      {/* My Courses */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">My Courses</h2>
        {courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course: any) => (
              <div key={course.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-200 animate-slide-up">
                <div className="h-48 bg-gradient-to-br from-primary-400 to-blue-500 flex items-center justify-center">
                  {course.thumbnail_url ? (
                    <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <BookOpen className="h-20 w-20 text-white opacity-50" />
                  )}
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">{course.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      course.is_published 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {course.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  {course.description && (
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-2">
                      {course.description}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <span>{course.category || 'Uncategorized'}</span>
                    <span>{course.level || 'All Levels'}</span>
                  </div>
                  <div className="flex space-x-2">
                    <button className="flex-1 bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2">
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </button>
                    <button className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2">
                      <Eye className="h-4 w-4" />
                      <span>View</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-12 text-center">
            <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No courses yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Create your first course to get started!</p>
            <button className="bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors duration-200">
              Create Course
            </button>
          </div>
        )}
      </div>

      {/* Recent Enrollments */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-slide-up">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <Users className="h-6 w-6 mr-2 text-purple-600" />
          Recent Student Enrollments
        </h2>
        {recentEnrollments.length > 0 ? (
          <div className="space-y-4">
            {recentEnrollments.map((enrollment: any) => (
              <div key={enrollment.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{enrollment.student_name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{enrollment.student_email}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    Course: {enrollment.course_title}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    enrollment.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    enrollment.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {enrollment.status}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {formatDate(enrollment.enrolled_at)}
                  </p>
                  {enrollment.progress > 0 && (
                    <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                      Progress: {enrollment.progress}%
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">No enrollments yet</p>
        )}
      </div>
    </div>
  )
}
