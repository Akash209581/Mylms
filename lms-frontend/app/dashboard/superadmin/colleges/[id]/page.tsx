'use client'
import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { api } from '@/lib/api'

interface CollegeDetails {
  college: {
    id: number
    name: string
    description?: string
    type?: string
    city?: string
    state?: string
    country?: string
    logoUrl?: string
    createdAt: string
  }
  adminCount: number
  instructorCount: number
  studentCount: number
  totalUsers: number
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

interface Course {
  id: number
  title: string
  status: string
  category?: string
  instructor?: { name: string }
}

export default function CollegeDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialName = searchParams.get('name') || ''
  
  const [details, setDetails] = useState<CollegeDetails | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [courses, setCourses] = useState<CollegeCourse[]>([])
  const [allCourses, setAllCourses] = useState<Course[]>([])
  
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingCourses, setLoadingCourses] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assigning, setAssigning] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<number | ''>('')
  const [activeTab, setActiveTab] = useState<'users' | 'courses'>('courses')
  const [error, setError] = useState('')
  const [updatingLogo, setUpdatingLogo] = useState(false)

  useEffect(() => {
    fetchData()
  }, [id])

  useEffect(() => {
    const titleName = details?.college.name || initialName
    if (titleName) {
      document.title = titleName
    }
  }, [details, initialName])

  // Refresh courses when modal opens and auto-select first one
  useEffect(() => {
    if (showAssignModal) {
      fetchAllCourses();
    }
  }, [showAssignModal])

  useEffect(() => {
    if (showAssignModal && allCourses.length > 0) {
      const available = allCourses.filter(ac => !courses.some(cc => cc.id === ac.id));
      const target = available.length > 0 ? available[0] : allCourses[0];
      
      if (selectedCourseId === '' || !allCourses.some(a => a.id === selectedCourseId)) {
        setSelectedCourseId(target.id);
      }
    }
  }, [allCourses, showAssignModal, courses])

  const fetchData = async () => {
    try {
      setLoading(true)
      const detailsRes = await api.get(`/colleges/${id}/stats`)
      setDetails(detailsRes.data)
      
      fetchCollegeUsers()
      fetchCollegeCourses()
      fetchAllCourses()
      
      setError('')
    } catch (err) {
      console.error('Failed to fetch college details:', err)
      setError('Failed to load college details')
    } finally {
      setLoading(false)
    }
  }

  const fetchCollegeUsers = async () => {
    setLoadingUsers(true)
    try {
      const response = await api.get(`/superadmin/users/college/${id}`)
      setUsers(response.data)
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoadingUsers(false)
    }
  }

  const fetchCollegeCourses = async () => {
    setLoadingCourses(true)
    try {
      const response = await api.get(`/superadmin/courses/college/${id}`)
      setCourses(response.data)
    } catch (err) {
      console.error('Failed to fetch courses:', err)
    } finally {
      setLoadingCourses(false)
    }
  }

  const fetchAllCourses = async () => {
    try {
      const response = await api.get('/superadmin/courses')
      setAllCourses(response.data)
    } catch (err) {
      console.error('Failed to fetch all courses:', err)
    }
  }

  const handleUpdateLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setUpdatingLogo(true)
      const reader = new FileReader()
      reader.onloadend = async () => {
        try {
          const base64 = reader.result as string
          await api.put(`/colleges/${id}`, { logoUrl: base64 })
          
          // Refresh details
          const detailsRes = await api.get(`/colleges/${id}/stats`)
          setDetails(detailsRes.data)
          alert('College logo updated successfully!')
        } catch (err: any) {
            console.error('Failed to save logo:', err)
            const msg = err.response?.data?.message || 'Failed to save logo'
            alert(msg)
        } finally {
            setUpdatingLogo(false)
        }
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error('Failed to update logo:', err)
      alert('Failed to update logo')
      setUpdatingLogo(false)
    }
  }

  const handleAssignCourse = async () => {
    if (!selectedCourseId) return
    
    try {
      setAssigning(true)
      
      // Get current course to preserve other assignments (backend replaces, so we need to be careful)
      // Actually, let's just assign and see. The backend replaces, which might be what's intended for a simple flow.
      // But ideally it should ADD. Let's check the backend again.
      // Line 479: course.assignedColleges = dto.collegeIds.map(cid => ({ id: cid } as any));
      // This means we should probably fetch the course's CURRENT assigned colleges and add this one.
      
      const courseRes = await api.get(`/courses/${selectedCourseId}`)
      const currentCollegeIds = courseRes.data.assignedColleges?.map((c: any) => c.id) || []
      
      if (currentCollegeIds.includes(parseInt(id))) {
        alert('Course is already assigned to this college')
        setShowAssignModal(false)
        return
      }

      await api.post(`/courses/${selectedCourseId}/assign`, {
        collegeIds: [...currentCollegeIds, parseInt(id)]
      })
      
      setShowAssignModal(false)
      setSelectedCourseId('')
      fetchCollegeCourses() // Refresh list
      alert('Course assigned successfully!')
    } catch (err) {
      console.error('Failed to assign course:', err)
      alert('Failed to assign course')
    } finally {
      setAssigning(false)
    }
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
      case 'ADMIN': return 'bg-emerald-100 text-emerald-700 border-emerald-200'
      case 'INSTRUCTOR': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'STUDENT': return 'bg-purple-100 text-purple-700 border-purple-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  if (loading && !details) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        {initialName && (
          <div className="fixed top-8 left-0 right-0 max-w-7xl mx-auto px-4 pointer-events-none">
            <h1 className="text-4xl font-bold text-slate-300 opacity-50 animate-pulse">{initialName}</h1>
          </div>
        )}
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <p className="text-slate-500 font-medium italic">Fetching full details...</p>
        </div>
      </div>
    )
  }

  if (!details) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">🏛️</div>
        <h2 className="text-2xl font-bold text-slate-800">College Not Found</h2>
        <button 
          onClick={() => router.push('/dashboard/superadmin/colleges')}
          className="mt-4 text-indigo-600 font-semibold hover:underline"
        >
          ← Back to Colleges
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Back Button */}
        <button 
          onClick={() => router.push('/dashboard/superadmin/colleges')}
          className="group mb-6 flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors font-medium"
        >
          <div className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center group-hover:border-indigo-200 group-hover:bg-indigo-50 transition-all">
            ←
          </div>
          Back to Colleges
        </button>

        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-slate-500 mb-6 text-sm">
          <span className="text-slate-900 font-bold text-lg">{details?.college.name || initialName}</span>
        </div>

        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden mb-8">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                {/* Logo with Upload/Replace */}
                <div className="relative group flex-shrink-0">
                  <div className="w-32 h-32 rounded-2xl bg-white/20 backdrop-blur-md border-2 border-white/30 flex items-center justify-center overflow-hidden shadow-2xl transition-all group-hover:bg-white/30">
                    {details.college.logoUrl ? (
                      <img src={details.college.logoUrl} alt={details.college.name} className="w-full h-full object-contain p-2" />
                    ) : (
                      <span className="text-5xl opacity-50">🏛️</span>
                    )}
                    
                    {updatingLogo && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center">
                        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                  </div>
                  
                  <label className="absolute -bottom-2 -right-2 w-10 h-10 bg-white rounded-xl shadow-lg border border-slate-100 flex items-center justify-center cursor-pointer hover:bg-slate-50 hover:scale-110 transition-all text-indigo-600 z-10">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    <input type="file" className="hidden" accept="image/*" onChange={handleUpdateLogo} disabled={updatingLogo} />
                  </label>
                </div>

                <div>
                  <h1 className="text-4xl font-bold">{details.college.name}</h1>
                  <p className="mt-2 text-indigo-100 max-w-2xl">
                    {details.college.description || 'No description provided for this institution.'}
                  </p>
                  <div className="flex flex-wrap gap-4 mt-4 text-sm font-medium">
                    {details.college.city && <span className="flex items-center gap-1">📍 {details.college.city}, {details.college.state}</span>}
                    {details.college.country && <span className="flex items-center gap-1">🌍 {details.college.country}</span>}
                    <button 
                      onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                      className="text-white hover:text-indigo-200 transition-colors flex items-center gap-1 font-bold decoration-dotted underline underline-offset-4"
                    >
                      <span>📷 {details.college.logoUrl ? 'Change Logo' : 'Add Logo'}</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowAssignModal(true)}
                className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 w-fit"
              >
                <span className="text-xl">+</span> Assign Course
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100 bg-slate-50/50">
            <div className="p-6 text-center">
              <div className="text-3xl font-bold text-slate-900">{details.totalUsers}</div>
              <div className="text-xs font-bold text-slate-500 uppercase mt-1">Total Users</div>
            </div>
            <div className="p-6 text-center">
              <div className="text-3xl font-bold text-emerald-600">{details.adminCount}</div>
              <div className="text-xs font-bold text-slate-500 uppercase mt-1">Admins</div>
            </div>
            <div className="p-6 text-center">
              <div className="text-3xl font-bold text-blue-600">{details.instructorCount}</div>
              <div className="text-xs font-bold text-slate-500 uppercase mt-1">Instructors</div>
            </div>
            <div className="p-6 text-center">
              <div className="text-3xl font-bold text-purple-600">{details.studentCount}</div>
              <div className="text-xs font-bold text-slate-500 uppercase mt-1">Students</div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="flex border-b border-slate-100 p-2 gap-2 bg-slate-50/30">
            <button
              onClick={() => setActiveTab('courses')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                activeTab === 'courses' 
                  ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' 
                  : 'text-slate-500 hover:bg-white/50'
              }`}
            >
              📚 Assigned Courses ({courses.length})
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                activeTab === 'users' 
                  ? 'bg-white text-indigo-600 shadow-md border border-indigo-100' 
                  : 'text-slate-500 hover:bg-white/50'
              }`}
            >
              👥 User Registry ({users.length})
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'courses' ? (
              <div>
                {loadingCourses ? (
                  <div className="py-20 text-center text-slate-400">Loading courses...</div>
                ) : courses.length === 0 ? (
                  <div className="py-20 text-center">
                    <div className="text-6xl mb-4 opacity-20">📚</div>
                    <h3 className="text-xl font-bold text-slate-800">No Courses Assigned</h3>
                    <p className="text-slate-500 mt-2">Use the "Assign Course" button to add courses to this college.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left border-b border-slate-100">
                          <th className="pb-4 pt-2 px-4 text-xs font-bold text-slate-400 uppercase">Course</th>
                          <th className="pb-4 pt-2 px-4 text-xs font-bold text-slate-400 uppercase">Created By</th>
                          <th className="pb-4 pt-2 px-4 text-xs font-bold text-slate-400 uppercase">Assigned By</th>
                          <th className="pb-4 pt-2 px-4 text-xs font-bold text-slate-400 uppercase text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {courses.map((course) => (
                          <tr key={course.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="py-4 px-4 font-semibold text-slate-900">{course.title}</td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border mr-2 ${getRoleBadgeColor(course.createdBy.role)}`}>
                                {course.createdBy.role}
                              </span>
                              <span className="text-sm text-slate-600">{course.createdBy.name || 'SUPER ADMIN'}</span>
                            </td>
                            <td className="py-4 px-4">
                              {course.assignedBy ? (
                                <span className="text-sm text-slate-600">{course.assignedBy.name}</span>
                              ) : (
                                <span className="text-xs text-slate-400 italic">Direct Owner</span>
                              )}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <button className="text-indigo-600 hover:text-indigo-800 font-semibold text-sm">Details</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {loadingUsers ? (
                  <div className="py-20 text-center text-slate-400">Loading users...</div>
                ) : users.length === 0 ? (
                  <div className="py-20 text-center text-slate-400 font-medium italic">No users found for this college.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left border-b border-slate-100">
                          <th className="pb-4 pt-2 px-4 text-xs font-bold text-slate-400 uppercase">Name</th>
                          <th className="pb-4 pt-2 px-4 text-xs font-bold text-slate-400 uppercase">Email</th>
                          <th className="pb-4 pt-2 px-4 text-xs font-bold text-slate-400 uppercase">Role</th>
                          <th className="pb-4 pt-2 px-4 text-xs font-bold text-slate-400 uppercase">College/University</th>
                          <th className="pb-4 pt-2 px-4 text-xs font-bold text-slate-400 uppercase">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {users.map((user) => (
                          <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs">
                                  {user.name.charAt(0)}
                                </div>
                                <span className="font-semibold text-slate-900">{user.name}</span>
                              </div>
                            </td>
                            <td className="py-4 px-4 text-slate-600 text-sm">{user.email}</td>
                            <td className="py-4 px-4">
                              <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${getRoleBadgeColor(user.role)}`}>
                                {user.role}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-slate-600 text-sm italic">
                              {user.collegeName || 'N/A'}
                            </td>
                            <td className="py-4 px-4 text-slate-500 text-sm">{formatDate(user.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assign Course Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900">Assign New Course</h2>
              <button 
                onClick={() => setShowAssignModal(false)}
                className="h-8 w-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-6">
                Choose a course from the global catalog to assign to <span className="font-bold text-indigo-600">{details.college.name}</span>. 
                Users of this college will immediately gain access.
              </p>
              
              <div className="space-y-4">
                <label className="block text-sm font-bold text-slate-700">Select Available Course</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value ? parseInt(e.target.value) : '')}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  disabled={assigning}
                >
                  <option value="" disabled>-- Choose a course --</option>
                  {allCourses.map(course => {
                    const isAssigned = courses.some(cc => cc.id === course.id);
                    return (
                      <option key={course.id} value={course.id}>
                        {course.title} {isAssigned ? '(Already Assigned) ' : ''}- by {course.instructor?.name || 'Super Admin'}
                      </option>
                    );
                  })}
                </select>
                
                {allCourses.length === 0 && (
                  <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
                    No courses available in the system.
                  </p>
                )}
                
                {allCourses.length > 0 && allCourses.every(ac => courses.some(cc => cc.id === ac.id)) && (
                  <p className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    All existing courses are already available for this college.
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-100 transition-colors"
                disabled={assigning}
              >
                Cancel
              </button>
              <button
                onClick={handleAssignCourse}
                disabled={!selectedCourseId || assigning}
                className={`flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-md transition-all ${
                  !selectedCourseId || assigning 
                    ? 'bg-slate-400 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg'
                }`}
              >
                {assigning ? 'Assigning...' : 'Confirm Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
