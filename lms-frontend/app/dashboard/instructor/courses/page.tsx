'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

interface Course {
    id: number
    title: string
    description: string
    category?: string
    level?: string
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
    rejectionReason?: string
    createdAt: string
    updatedAt: string
    approver?: {
        name: string
        email: string
    }
}

export default function InstructorCoursesPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [courses, setCourses] = useState<Course[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'INSTRUCTOR') { router.push(`/dashboard/${u.role.toLowerCase()}`); return }
        setUser(u)

        fetchCourses()
    }, [filter])

    const fetchCourses = async () => {
        setLoading(true)
        try {
            const endpoint = filter === 'all' 
                ? '/instructor/courses'
                : `/instructor/courses/${filter}`
            
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}${endpoint}`, {
                credentials: 'include'
            })
            const data = await res.json()
            setCourses(data)
        } catch (error) {
            console.error('Failed to fetch courses:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusBadge = (status: string) => {
        const badges = {
            PENDING_APPROVAL: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-800', icon: '⏳' },
            APPROVED: { label: 'Approved', color: 'bg-green-100 text-green-800', icon: '✅' },
            REJECTED: { label: 'Rejected', color: 'bg-red-100 text-red-800', icon: '❌' }
        }
        const badge = badges[status as keyof typeof badges]
        return (
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                <span>{badge.icon}</span>
                {badge.label}
            </span>
        )
    }

    const filterButtons = [
        { value: 'all', label: 'All Courses', icon: '📚' },
        { value: 'pending', label: 'Pending', icon: '⏳' },
        { value: 'approved', label: 'Approved', icon: '✅' },
        { value: 'rejected', label: 'Rejected', icon: '❌' }
    ]

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="INSTRUCTOR" />
            <Navbar title="My Courses" />
            <main className="page-content">
                {/* Hero */}
                <div className="hero-section hero-dark mb-8" style={{ background: 'linear-gradient(135deg,#4338ca,#6d28d9)' }}>
                    <div className="relative z-10">
                        <p className="text-white/60 text-sm mb-1">Course Management 📚</p>
                        <h1 className="text-3xl font-bold text-white mb-2">My Courses</h1>
                        <p className="text-white/70 mb-4">Manage and track your course approval status</p>
                    </div>
                </div>

                {/* Filter Tabs */}
                <div className="flex flex-wrap gap-2 mb-6">
                    {filterButtons.map((btn) => (
                        <button
                            key={btn.value}
                            onClick={() => setFilter(btn.value as any)}
                            className={`px-4 py-2 rounded-lg font-medium transition-all ${
                                filter === btn.value
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'bg-white text-gray-700 hover:bg-gray-50'
                            }`}
                        >
                            <span className="mr-2">{btn.icon}</span>
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                )}

                {/* Empty State */}
                {!loading && courses.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">📚</div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">No courses found</h3>
                        <p className="text-gray-600 mb-6">
                            {filter === 'all' ? 'Create your first course to get started!' : `No ${filter} courses yet.`}
                        </p>
                        <button
                            onClick={() => router.push('/dashboard/instructor')}
                            className="btn-primary"
                        >
                            Back to Dashboard
                        </button>
                    </div>
                )}

                {/* Courses Grid */}
                {!loading && courses.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {courses.map((course) => (
                            <div key={course.id} className="card group hover:shadow-xl transition-all duration-300">
                                <div className="p-6">
                                    {/* Status Badge */}
                                    <div className="mb-4">
                                        {getStatusBadge(course.status)}
                                    </div>

                                    {/* Course Title */}
                                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-indigo-600 transition-colors">
                                        {course.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                        {course.description || 'No description available'}
                                    </p>

                                    {/* Course Meta Info */}
                                    <div className="flex flex-wrap gap-2 mb-4">
                                        {course.category && (
                                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs">
                                                <span>📂</span>
                                                {course.category}
                                            </span>
                                        )}
                                        {course.level && (
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                                                course.level === 'Beginner' ? 'bg-green-50 text-green-700' :
                                                course.level === 'Intermediate' ? 'bg-yellow-50 text-yellow-700' :
                                                'bg-red-50 text-red-700'
                                            }`}>
                                                <span>
                                                    {course.level === 'Beginner' ? '🟢' : 
                                                     course.level === 'Intermediate' ? '🟡' : '🔴'}
                                                </span>
                                                {course.level}
                                            </span>
                                        )}
                                    </div>

                                    {/* Rejection Reason */}
                                    {course.status === 'REJECTED' && course.rejectionReason && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                                            <p className="text-xs font-semibold text-red-800 mb-1">Rejection Reason:</p>
                                            <p className="text-sm text-red-700">{course.rejectionReason}</p>
                                        </div>
                                    )}

                                    {/* Approved By */}
                                    {course.status === 'APPROVED' && course.approver && (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                                            <p className="text-xs font-semibold text-green-800 mb-1">Approved By:</p>
                                            <p className="text-sm text-green-700">{course.approver.name}</p>
                                        </div>
                                    )}

                                    {/* Dates */}
                                    <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                                        <span>Created: {new Date(course.createdAt).toLocaleDateString()}</span>
                                        {course.status !== 'PENDING_APPROVAL' && (
                                            <span>Updated: {new Date(course.updatedAt).toLocaleDateString()}</span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => router.push(`/courses/${course.id}`)}
                                            className="flex-1 btn-secondary text-sm"
                                        >
                                            View Details
                                        </button>
                                        {course.status === 'APPROVED' && (
                                            <button
                                                onClick={() => router.push(`/dashboard/instructor/courses/${course.id}/builder`)}
                                                className="flex-1 btn-primary text-sm"
                                            >
                                                🏗️ Build Course
                                            </button>
                                        )}
                                        {course.status === 'REJECTED' && (
                                            <button
                                                className="flex-1 btn-primary text-sm"
                                                onClick={() => alert('Edit functionality coming soon!')}
                                            >
                                                Edit & Resubmit
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
