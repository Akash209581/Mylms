'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

interface CollegeStats {
  id: number
  name: string
  type?: string
  city?: string
  state?: string
  country?: string
  adminCount: number
  instructorCount: number
  studentCount: number
  totalUsers: number
  createdAt: string
}

interface User {
  id: number
  name: string
  email: string
  role: string
  collegeName: string
  createdAt: string
  isActive: boolean
}

interface CourseCreatedBy {
  id: number | null
  name: string
  role: string
}

interface CollegeCourse {
  id: number
  title: string
  status: string
  createdBy: CourseCreatedBy
  assignedBy: CourseCreatedBy | null
  createdAt: string
}

type ModalTab = 'users' | 'courses'

export default function CollegesPage() {
  const router = useRouter()
  const [colleges, setColleges] = useState<CollegeStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedCollege, setSelectedCollege] = useState<CollegeStats | null>(null)
  const [activeTab, setActiveTab] = useState<ModalTab>('users')

  // Users state
  const [collegeUsers, setCollegeUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  // Courses state
  const [collegeCourses, setCollegeCourses] = useState<CollegeCourse[]>([])
  const [loadingCourses, setLoadingCourses] = useState(false)

  useEffect(() => {
    fetchColleges()
  }, [])

  const fetchColleges = async () => {
    try {
      setLoading(true)
      const response = await api.get('/superadmin/colleges-stats')
      setColleges(response.data)
      setError('')
    } catch (err) {
      console.error('Failed to fetch colleges:', err)
      const error = err as { response?: { data?: { message?: string } } }
      setError(error.response?.data?.message || 'Failed to load colleges')
    } finally {
      setLoading(false)
    }
  }

  const viewCollegeDetails = async (college: CollegeStats) => {
    setSelectedCollege(college)
    setShowModal(true)
    setActiveTab('users')
    fetchCollegeUsers(college.id)
    fetchCollegeCourses(college.id)
  }

  const fetchCollegeUsers = async (collegeId: number) => {
    setLoadingUsers(true)
    try {
      const response = await api.get(`/superadmin/users/college/${collegeId}`)
      setCollegeUsers(response.data)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchCollegeCourses = async (collegeId: number) => {
    setLoadingCourses(true)
    try {
      const response = await api.get(`/superadmin/courses/college/${collegeId}`)
      setCollegeCourses(response.data)
    } catch (err) {
      console.error('Failed to fetch courses:', err)
    } finally {
      setLoadingCourses(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedCollege(null)
    setCollegeUsers([])
    setCollegeCourses([])
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-emerald-500/20 text-emerald-600 border border-emerald-500/30'
      case 'INSTRUCTOR':
        return 'bg-blue-500/20 text-blue-600 border border-blue-500/30'
      case 'STUDENT':
        return 'bg-purple-500/20 text-purple-600 border border-purple-500/30'
      case 'SUPERADMIN':
        return 'bg-amber-500/20 text-amber-600 border border-amber-500/30'
      default:
        return 'bg-gray-500/20 text-gray-600 border border-gray-500/30'
    }
  }

  const getCreatedByLabel = (createdBy: CourseCreatedBy): string => {
    if (createdBy.role === 'SUPERADMIN') return 'SUPER ADMIN'
    return createdBy.name || 'Unknown'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
          <div className="text-slate-700 text-lg font-medium">Loading colleges...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 border border-slate-200">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl shadow-lg">
              🏛️
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Colleges &amp; Universities
              </h1>
              <p className="text-slate-600 mt-1">
                Manage educational institutions and view user &amp; course statistics
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl mb-6 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-slate-500 text-sm font-semibold uppercase tracking-wide">Total Colleges</div>
              <div className="text-3xl">🏛️</div>
            </div>
            <div className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {colleges.length}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-slate-500 text-sm font-semibold uppercase tracking-wide">Total Admins</div>
              <div className="text-3xl">👨‍💼</div>
            </div>
            <div className="text-4xl font-bold text-emerald-600">
              {colleges.reduce((sum, c) => sum + c.adminCount, 0)}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-slate-500 text-sm font-semibold uppercase tracking-wide">Total Instructors</div>
              <div className="text-3xl">👨‍🏫</div>
            </div>
            <div className="text-4xl font-bold text-blue-600">
              {colleges.reduce((sum, c) => sum + c.instructorCount, 0)}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <div className="text-slate-500 text-sm font-semibold uppercase tracking-wide">Total Students</div>
              <div className="text-3xl">👨‍🎓</div>
            </div>
            <div className="text-4xl font-bold text-purple-600">
              {colleges.reduce((sum, c) => sum + c.studentCount, 0)}
            </div>
          </div>
        </div>

        {/* Colleges Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {colleges.map((college) => (
            <div
              key={college.id}
              className="bg-white rounded-xl shadow-md border border-slate-200 hover:shadow-xl hover:border-indigo-300 transition-all duration-300 overflow-hidden group"
            >
              {/* College Header */}
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                <h3 className="text-xl font-bold mb-2 line-clamp-2">{college.name}</h3>
                <div className="flex items-center gap-2 text-sm text-indigo-100">
                  {college.type && (
                    <span className="px-3 py-1 bg-white/20 backdrop-blur-sm rounded-lg font-medium">
                      {college.type}
                    </span>
                  )}
                </div>
                {(college.city || college.state) && (
                  <div className="mt-2 text-sm text-indigo-100">
                    📍 {[college.city, college.state].filter(Boolean).join(', ')}
                  </div>
                )}
              </div>

              {/* User Statistics */}
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="bg-emerald-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-emerald-600">{college.adminCount}</div>
                    <div className="text-xs text-emerald-700 font-medium mt-1">Admins</div>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-blue-600">{college.instructorCount}</div>
                    <div className="text-xs text-blue-700 font-medium mt-1">Instructors</div>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-3">
                    <div className="text-2xl font-bold text-purple-600">{college.studentCount}</div>
                    <div className="text-xs text-purple-700 font-medium mt-1">Students</div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-slate-600 font-semibold">Total Users</span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {college.totalUsers}
                  </span>
                </div>

                {/* View Button */}
                <button
                  onClick={() => viewCollegeDetails(college)}
                  className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <span>View Details</span>
                  <span className="text-xl">→</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {colleges.length === 0 && !loading && (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center border border-slate-200">
            <div className="text-8xl mb-6">🏛️</div>
            <h3 className="text-3xl font-bold text-slate-800 mb-3">No Colleges Yet</h3>
            <p className="text-slate-600 mb-8 max-w-2xl mx-auto">
              Colleges are automatically created when you create the first user for that college.
              Create a new user (ADMIN, INSTRUCTOR, or STUDENT) to get started.
            </p>
            <button
              onClick={() => router.push('/dashboard/superadmin/users/create')}
              className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-200"
            >
              + Create First User
            </button>
          </div>
        )}
      </div>

      {/* College Details Modal */}
      {showModal && selectedCollege && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">

            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-1">{selectedCollege.name}</h2>
                  <div className="flex items-center gap-4 text-indigo-100 text-sm">
                    <span>👥 {selectedCollege.totalUsers} users</span>
                    {selectedCollege.type && <span>🎓 {selectedCollege.type}</span>}
                    {(selectedCollege.city || selectedCollege.state) && (
                      <span>📍 {[selectedCollege.city, selectedCollege.state].filter(Boolean).join(', ')}</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={closeModal}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors text-xl font-bold"
                >
                  ×
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setActiveTab('users')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    activeTab === 'users'
                      ? 'bg-white text-indigo-700 shadow-md'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  👥 Users
                  {!loadingUsers && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      activeTab === 'users' ? 'bg-indigo-100 text-indigo-700' : 'bg-white/30 text-white'
                    }`}>
                      {collegeUsers.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('courses')}
                  className={`flex items-center gap-2 px-5 py-2 rounded-lg font-semibold text-sm transition-all duration-200 ${
                    activeTab === 'courses'
                      ? 'bg-white text-indigo-700 shadow-md'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                >
                  📚 College Courses
                  {!loadingCourses && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      activeTab === 'courses' ? 'bg-indigo-100 text-indigo-700' : 'bg-white/30 text-white'
                    }`}>
                      {collegeCourses.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6">

              {/* ── USERS TAB ── */}
              {activeTab === 'users' && (
                <>
                  {loadingUsers ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <div className="text-slate-600">Loading users...</div>
                      </div>
                    </div>
                  ) : collegeUsers.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="text-6xl mb-4">👥</div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-2">No Users Found</h3>
                      <p className="text-slate-600">There are no users in this college yet.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-slate-200 bg-slate-50">
                            <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">#</th>
                            <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Name</th>
                            <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Email</th>
                            <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Role</th>
                            <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Joined</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {collegeUsers.map((user, index) => (
                            <tr
                              key={user.id}
                              className="hover:bg-indigo-50/40 transition-colors duration-150"
                            >
                              <td className="p-4 text-slate-400 text-sm">{index + 1}</td>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                                    {user.name?.charAt(0)?.toUpperCase() ?? '?'}
                                  </div>
                                  <span className="font-semibold text-slate-800">{user.name}</span>
                                </div>
                              </td>
                              <td className="p-4 text-slate-600 text-sm">{user.email}</td>
                              <td className="p-4">
                                <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getRoleBadgeColor(user.role)}`}>
                                  {user.role}
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                                  user.isActive
                                    ? 'bg-green-100 text-green-700 border border-green-200'
                                    : 'bg-red-100 text-red-700 border border-red-200'
                                }`}>
                                  {user.isActive ? '✓ Active' : '✗ Inactive'}
                                </span>
                              </td>
                              <td className="p-4 text-slate-500 text-sm">{formatDate(user.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* ── COURSES TAB ── */}
              {activeTab === 'courses' && (
                <>
                  {loadingCourses ? (
                    <div className="flex items-center justify-center py-20">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                        <div className="text-slate-600">Loading courses...</div>
                      </div>
                    </div>
                  ) : collegeCourses.length === 0 ? (
                    <div className="text-center py-20">
                      <div className="text-6xl mb-4">📚</div>
                      <h3 className="text-2xl font-bold text-slate-800 mb-2">No Courses Found</h3>
                      <p className="text-slate-600">
                        No approved courses were found for this college.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b-2 border-slate-200 bg-slate-50">
                            <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Course ID</th>
                            <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Course Name</th>
                            <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Created By</th>
                            <th className="text-left p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {collegeCourses.map((course) => (
                            <tr
                              key={course.id}
                              className="hover:bg-indigo-50/40 transition-colors duration-150"
                            >
                              <td className="p-4">
                                <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-sm">
                                  #{course.id}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-lg flex-shrink-0">
                                    📖
                                  </div>
                                  <span className="font-semibold text-slate-800">{course.title}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2">
                                  <span className={`px-3 py-1 rounded-lg text-xs font-bold ${getRoleBadgeColor(course.createdBy.role)}`}>
                                    {course.createdBy.role === 'SUPERADMIN' ? 'SUPER ADMIN' : course.createdBy.role}
                                  </span>
                                  <span className="text-slate-600 text-sm">{getCreatedByLabel(course.createdBy)}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700 border border-green-200 flex items-center gap-1 w-fit">
                                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block"></span>
                                  {course.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-slate-500">
                {activeTab === 'users'
                  ? `${collegeUsers.length} user${collegeUsers.length !== 1 ? 's' : ''} found`
                  : `${collegeCourses.length} course${collegeCourses.length !== 1 ? 's' : ''} found`
                }
              </div>
              <button
                onClick={closeModal}
                className="px-6 py-2 bg-slate-200 text-slate-700 font-semibold rounded-lg hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
