'use client'

import { useState, useEffect } from 'react'
import LoadingSpinner from '@/components/LoadingSpinner'
import StatCard from '@/components/StatCard'
import { 
  Users, 
  BookOpen, 
  GraduationCap, 
  UserCheck,
  TrendingUp,
  Shield,
  Clock
} from 'lucide-react'

interface DashboardData {
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  stats: {
    totalUsers: number
    totalStudents: number
    totalInstructors: number
    totalAdmins: number
    totalCourses: number
    totalPublished: number
    totalEnrollments: number
    totalActive: number
  }
  recentUsers: any[]
  recentCourses: any[]
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard')
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

  const { user, stats, recentUsers, recentCourses } = data

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
        <div className="flex items-center space-x-3 mb-2">
          <Shield className="h-10 w-10 text-purple-600" />
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
            {user.role === 'SUPERADMIN' ? 'Super Admin' : 'Admin'} Dashboard
          </h1>
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-lg">
          Welcome back, {user.name}! Manage your LMS platform
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={Users}
          color="blue"
          subtitle="All registered users"
        />
        <StatCard
          title="Total Courses"
          value={stats.totalCourses}
          icon={BookOpen}
          color="green"
          subtitle={`${stats.totalPublished} published`}
        />
        <StatCard
          title="Students"
          value={stats.totalStudents}
          icon={GraduationCap}
          color="purple"
          subtitle="Active learners"
        />
        <StatCard
          title="Enrollments"
          value={stats.totalEnrollments}
          icon={UserCheck}
          color="orange"
          subtitle={`${stats.totalActive} active`}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Instructors</h3>
            <GraduationCap className="h-6 w-6 text-blue-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalInstructors}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Course creators</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Admins</h3>
            <Shield className="h-6 w-6 text-purple-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalAdmins}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Platform managers</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Published</h3>
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalPublished}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Live courses</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Recent Users */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-slide-up">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <Users className="h-6 w-6 mr-2 text-blue-600" />
            Recent Users
          </h2>
          <div className="space-y-4">
            {recentUsers.length > 0 ? (
              recentUsers.map((recentUser: any) => (
                <div key={recentUser.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{recentUser.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{recentUser.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      recentUser.role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-800' :
                      recentUser.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                      recentUser.role === 'INSTRUCTOR' ? 'bg-blue-100 text-blue-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {recentUser.role}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(recentUser.created_at)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No users yet</p>
            )}
          </div>
        </div>

        {/* Recent Courses */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center">
            <BookOpen className="h-6 w-6 mr-2 text-green-600" />
            Recent Courses
          </h2>
          <div className="space-y-4">
            {recentCourses.length > 0 ? (
              recentCourses.map((course: any) => (
                <div key={course.id} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{course.title}</h3>
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      course.is_published 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {course.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="space-y-1">
                      {course.instructor_name && (
                        <p className="text-gray-600 dark:text-gray-400">
                          By: {course.instructor_name}
                        </p>
                      )}
                      {course.category && (
                        <p className="text-gray-500 dark:text-gray-500">
                          {course.category} • {course.level}
                        </p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(course.created_at)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">No courses yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-xl p-8 text-white animate-fade-in">
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 text-left transition-all duration-200 hover:scale-105">
            <Users className="h-6 w-6 mb-2" />
            <h3 className="font-semibold mb-1">Manage Users</h3>
            <p className="text-sm text-white/80">View and manage all users</p>
          </button>
          <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 text-left transition-all duration-200 hover:scale-105">
            <BookOpen className="h-6 w-6 mb-2" />
            <h3 className="font-semibold mb-1">Manage Courses</h3>
            <p className="text-sm text-white/80">Review and approve courses</p>
          </button>
          <button className="bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-lg p-4 text-left transition-all duration-200 hover:scale-105">
            <TrendingUp className="h-6 w-6 mb-2" />
            <h3 className="font-semibold mb-1">View Analytics</h3>
            <p className="text-sm text-white/80">Platform performance metrics</p>
          </button>
        </div>
      </div>
    </div>
  )
}
