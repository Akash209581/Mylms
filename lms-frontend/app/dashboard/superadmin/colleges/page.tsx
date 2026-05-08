'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
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
  logoUrl?: string
  createdAt: string
}

export default function CollegesPage() {
  const router = useRouter()
  const [colleges, setColleges] = useState<CollegeStats[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white relative h-32 flex flex-col justify-end">
                {college.logoUrl && (
                  <div className="absolute top-4 right-4 w-16 h-16 bg-white rounded-xl shadow-lg border border-white/20 p-2 overflow-hidden flex items-center justify-center">
                    <Image 
                      src={college.logoUrl} 
                      alt={college.name} 
                      width={64} 
                      height={64} 
                      className="object-contain" 
                      loading="lazy"
                    />
                  </div>
                )}
                <h3 className="text-xl font-bold mb-2 line-clamp-2 pr-20">{college.name}</h3>
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
                  onClick={() => router.push(`/dashboard/superadmin/colleges/${college.id}?name=${encodeURIComponent(college.name)}`)}
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
    </div>
  )
}
