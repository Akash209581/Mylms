'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
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

const SkeletonCard = () => (
  <div className="glass-card animate-pulse border border-white/5 overflow-hidden p-0">
    <div className="h-32 bg-white/5 relative flex flex-col justify-end p-6">
      <div className="absolute top-4 right-4 w-16 h-16 bg-white/10 rounded-xl"></div>
      <div className="h-6 bg-white/10 rounded-lg w-1/2 mb-2"></div>
      <div className="h-4 bg-white/5 rounded-lg w-1/3"></div>
    </div>
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="h-16 bg-white/5 rounded-xl"></div>
        <div className="h-16 bg-white/5 rounded-xl"></div>
        <div className="h-16 bg-white/5 rounded-xl"></div>
      </div>
      <div className="pt-4 border-t border-white/5 flex justify-between items-center">
        <div className="h-4 bg-white/5 rounded w-1/4"></div>
        <div className="h-6 bg-white/10 rounded w-1/6"></div>
      </div>
      <div className="h-12 bg-white/10 rounded-xl w-full"></div>
    </div>
  </div>
)

const SkeletonStats = () => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
    {[1, 2, 3, 4].map((i) => (
      <div key={i} className="stat-card animate-pulse">
        <div className="w-10 h-10 rounded-xl bg-white/10 mb-3"></div>
        <div className="h-6 bg-white/10 rounded-lg w-1/2 mb-2"></div>
        <div className="h-4 bg-white/5 rounded-lg w-3/4"></div>
      </div>
    ))}
  </div>
)

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

  return (
    <div className="min-h-screen bg-mesh">
      <Sidebar role="SUPERADMIN" />
      <Navbar title="Colleges &amp; Universities" />
      <main className="page-content">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">Colleges &amp; Universities</h1>
          <p className="text-gray-400">
            Manage educational institutions and view user &amp; course statistics
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-xl mb-6 flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <>
            <SkeletonStats />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          </>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <div className="stat-card">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 bg-gradient-to-br from-amber-500 to-orange-600">🏛️</div>
                <p className="text-2xl font-bold text-white mb-0.5">{colleges.length}</p>
                <p className="text-gray-400 text-xs">Total Colleges</p>
              </div>

              <div className="stat-card">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 bg-gradient-to-br from-emerald-500 to-teal-600">👨‍💼</div>
                <p className="text-2xl font-bold text-white mb-0.5">
                  {colleges.reduce((sum, c) => sum + c.adminCount, 0)}
                </p>
                <p className="text-gray-400 text-xs">Total Admins</p>
              </div>

              <div className="stat-card">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 bg-gradient-to-br from-blue-500 to-cyan-600">👨‍🏫</div>
                <p className="text-2xl font-bold text-white mb-0.5">
                  {colleges.reduce((sum, c) => sum + c.instructorCount, 0)}
                </p>
                <p className="text-gray-400 text-xs">Total Instructors</p>
              </div>

              <div className="stat-card">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3 bg-gradient-to-br from-purple-500 to-pink-600">👨‍🎓</div>
                <p className="text-2xl font-bold text-white mb-0.5">
                  {colleges.reduce((sum, c) => sum + c.studentCount, 0)}
                </p>
                <p className="text-gray-400 text-xs">Total Students</p>
              </div>
            </div>

            {/* Colleges Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {colleges.map((college) => (
                <div
                  key={college.id}
                  className="glass-card hover:shadow-xl hover:border-indigo-500/40 transition-all duration-300 overflow-hidden group border border-white/5"
                >
                  {/* College Header */}
                  <div className="bg-gradient-to-r from-indigo-600/90 to-purple-600/90 p-6 text-white relative h-32 flex flex-col justify-end">
                    {college.logoUrl && (
                      <div className="absolute top-4 right-4 w-16 h-16 bg-white rounded-xl shadow-lg p-2 overflow-hidden flex items-center justify-center">
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
                    <div className="flex items-center gap-2 text-sm text-indigo-200">
                      {college.type && (
                        <span className="px-3 py-1 bg-white/10 backdrop-blur-sm rounded-lg font-medium text-xs">
                          {college.type}
                        </span>
                      )}
                    </div>
                    {(college.city || college.state) && (
                      <div className="mt-2 text-xs text-indigo-200">
                        📍 {[college.city, college.state].filter(Boolean).join(', ')}
                      </div>
                    )}
                  </div>

                  {/* User Statistics */}
                  <div className="p-6 space-y-4">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
                        <div className="text-2xl font-bold text-emerald-400">{college.adminCount}</div>
                        <div className="text-[10px] text-emerald-300 font-semibold uppercase tracking-wider mt-1">Admins</div>
                      </div>
                      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3">
                        <div className="text-2xl font-bold text-blue-400">{college.instructorCount}</div>
                        <div className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider mt-1">Instructors</div>
                      </div>
                      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
                        <div className="text-2xl font-bold text-purple-400">{college.studentCount}</div>
                        <div className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider mt-1">Students</div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                      <span className="text-gray-400 font-semibold">Total Users</span>
                      <span className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                        {college.totalUsers}
                      </span>
                    </div>

                    {/* View Button */}
                    <button
                      onClick={() => router.push(`/dashboard/superadmin/colleges/${college.id}?name=${encodeURIComponent(college.name)}`)}
                      className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                    >
                      <span>View Details</span>
                      <span className="text-xl">→</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {colleges.length === 0 && (
              <div className="glass-card p-12 text-center border border-white/5">
                <div className="text-8xl mb-6">🏛️</div>
                <h3 className="text-3xl font-bold text-white mb-3">No Colleges Yet</h3>
                <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
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
          </>
        )}
      </main>
    </div>
  )
}
