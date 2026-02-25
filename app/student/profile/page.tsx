import { requireAuth } from '@/lib/auth'
import { User, Mail, Calendar, Award, BookOpen } from 'lucide-react'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function StudentProfilePage() {
  const user = await requireAuth(['STUDENT'])

  // Fetch student's enrollment statistics
  const enrollments = await query(
    'SELECT * FROM enrollments WHERE student_id = $1',
    [user.id]
  )

  const totalCourses = enrollments?.length || 0
  const completedCourses = enrollments?.filter((e: any) => e.status === 'COMPLETED').length || 0
  const activeCourses = enrollments?.filter((e: any) => e.status === 'ACTIVE').length || 0

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-400 rounded-2xl shadow-xl p-8 mb-8 text-white animate-fade-in">
        <div className="flex items-start space-x-6">
          <div className="bg-white rounded-full p-6">
            <User className="h-16 w-16 text-primary-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{user.name}</h1>
            <p className="text-primary-100 mb-4 flex items-center space-x-2">
              <Mail className="h-5 w-5" />
              <span>{user.email}</span>
            </p>
            <div className="flex items-center space-x-2 text-primary-100">
              <Calendar className="h-5 w-5" />
              <span>Member since {formatDate(user.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-slide-up">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 dark:bg-blue-900/30 rounded-full p-3">
              <BookOpen className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Total Courses</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{totalCourses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <div className="flex items-center space-x-4">
            <div className="bg-green-100 dark:bg-green-900/30 rounded-full p-3">
              <Award className="h-8 w-8 text-green-600" />
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">Completed</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{completedCourses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="flex items-center space-x-4">
            <div className="bg-purple-100 dark:bg-purple-900/30 rounded-full p-3">
              <BookOpen className="h-8 w-8 text-purple-600" />
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm">In Progress</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{activeCourses}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 animate-slide-up">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Profile Information
        </h2>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Full Name
            </label>
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
              {user.name}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
              {user.email}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <div className="px-4 py-3 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
              <span className="text-primary-700 dark:text-primary-400 font-semibold">
                {user.role}
              </span>
            </div>
          </div>

          {user.bio && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Bio
              </label>
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                {user.bio}
              </div>
            </div>
          )}
        </div>

        {/* Note: Edit functionality can be added in future phases */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            <strong>Note:</strong> Profile editing will be available in the next update.
          </p>
        </div>
      </div>
    </div>
  )
}
