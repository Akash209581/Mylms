'use client'

import { useState, useEffect } from 'react'
import StatCard from '@/components/StatCard'
import CourseCard from '@/components/CourseCard'
import LoadingSpinner from '@/components/LoadingSpinner'
import { 
  BookOpen, 
  Clock, 
  Award, 
  TrendingUp,
  ArrowRight 
} from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

interface DashboardData {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  stats: {
    totalCourses: number
    completedCourses: number
    averageProgress: number
    totalHours: number
  }
  enrollments: any[]
}

export default function StudentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/student/dashboard')
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

  const { user, stats, enrollments } = data

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
          Welcome back, {user.name}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Continue your learning journey and track your progress
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Enrolled Courses"
          value={stats.totalCourses}
          icon={BookOpen}
          color="blue"
          subtitle="Total courses"
        />
        <StatCard
          title="Learning Hours"
          value={stats.totalHours}
          icon={Clock}
          color="green"
          subtitle="Total duration"
        />
        <StatCard
          title="Completed"
          value={stats.completedCourses}
          icon={Award}
          color="purple"
          subtitle="Courses finished"
        />
        <StatCard
          title="Average Progress"
          value={`${stats.averageProgress}%`}
          icon={TrendingUp}
          color="orange"
          subtitle="Overall"
        />
      </div>

      {/* Continue Learning Section */}
      {enrollments && enrollments.length > 0 && (
        <div className="mb-8 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Continue Learning
            </h2>
            <Link 
              href="/student/courses"
              className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 font-semibold transition-colors"
            >
              <span>View All</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrollments.map((enrollment: any) => (
              <div key={enrollment.id} className="relative">
                <CourseCard 
                  course={enrollment.courses} 
                  enrolled={true}
                />
                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Progress
                    </span>
                    <span className="text-sm font-bold text-primary-600">
                      {enrollment.progress}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-primary-600 to-primary-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${enrollment.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!enrollments || enrollments.length === 0) && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl shadow-lg animate-scale-in">
          <BookOpen className="h-24 w-24 text-gray-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            No Courses Yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start your learning journey by enrolling in a course
          </p>
          <Link href="/student/courses">
            <button className="px-8 py-3 bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-lg hover:from-primary-700 hover:to-primary-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl">
              Browse Courses
            </button>
          </Link>
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-2">Keep Learning! 🎯</h3>
          <p className="text-primary-100 mb-4">
            You&apos;re doing great! Complete your courses to earn certificates.
          </p>
          <div className="flex items-center space-x-2">
            <Award className="h-6 w-6" />
            <span className="font-semibold">Certificates Earned: {stats.completedCourses}</span>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-2">Learning Streak 🔥</h3>
          <p className="text-purple-100 mb-4">
            Stay consistent with your learning to build a strong foundation.
          </p>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-6 w-6" />
            <span className="font-semibold">Keep going!</span>
          </div>
        </div>
      </div>
    </div>
  )
}
