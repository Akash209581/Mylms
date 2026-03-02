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
    price?: number
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'
    rejectionReason?: string
    createdAt: string
    updatedAt: string
    instructor: {
        id: number
        name: string
        email: string
    }
    approver?: {
        id: number
        name: string
        email: string
    }
}

type TabType = 'pending' | 'approved' | 'rejected'

export default function AdminApprovalsPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [activeTab, setActiveTab] = useState<TabType>('pending')
    const [courses, setCourses] = useState<Course[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<number | null>(null)
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
    const [showRejectModal, setShowRejectModal] = useState(false)
    const [rejectionReason, setRejectionReason] = useState('')
    const [showApproveModal, setShowApproveModal] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) {
            router.push('/login')
            return
        }
        const u = JSON.parse(stored)
        // ONLY ADMIN can access course approvals (NOT SUPERADMIN)
        if (u.role !== 'ADMIN') {
            router.push(`/dashboard/${u.role.toLowerCase()}`)
            return
        }
        setUser(u)
    }, [router])

    useEffect(() => {
        if (user) {
            fetchCourses()
        }
    }, [activeTab, user])

    const fetchCourses = async () => {
        setLoading(true)
        console.log('📋 Fetching courses for ADMIN...')
        console.log('Active tab:', activeTab)
        console.log('User role:', user?.role)
        try {
            const endpoint = activeTab === 'pending' 
                ? '/admin/courses/pending'
                : activeTab === 'approved'
                ? '/admin/courses/approved'
                : '/admin/courses/rejected'

            console.log('Endpoint:', endpoint)
            const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${endpoint}`
            console.log('Full URL:', apiUrl)

            const res = await fetch(apiUrl, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                }
            })

            console.log('Response status:', res.status)
            
            if (!res.ok) {
                const errorText = await res.text()
                console.error('❌ Error response:', errorText)
                throw new Error(`HTTP ${res.status}: ${errorText}`)
            }

            const data = await res.json()
            console.log('✅ Courses fetched:', data?.length || 0, 'courses')
            console.log('Courses:', data)
            setCourses(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error('❌ Failed to fetch courses:', error)
            setCourses([])
        } finally {
            setLoading(false)
        }
    }

    const handleApproveCourse = async (course: Course) => {
        setActionLoading(course.id)
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/admin/courses/${course.id}/approve`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({})
                }
            )

            const data = await res.json()

            if (res.ok && data.success) {
                setShowApproveModal(false)
                setSelectedCourse(null)
                await fetchCourses()
            } else {
                alert(data.message || 'Failed to approve course')
            }
        } catch (error) {
            alert('Network error. Please try again.')
        } finally {
            setActionLoading(null)
        }
    }

    const handleRejectCourse = async () => {
        if (!selectedCourse || !rejectionReason.trim()) {
            alert('Please provide a rejection reason')
            return
        }

        setActionLoading(selectedCourse.id)
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/admin/courses/${selectedCourse.id}/reject`,
                {
                    method: 'PUT',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ reason: rejectionReason })
                }
            )

            const data = await res.json()

            if (res.ok && data.success) {
                setShowRejectModal(false)
                setSelectedCourse(null)
                setRejectionReason('')
                await fetchCourses()
            } else {
                alert(data.message || 'Failed to reject course')
            }
        } catch (error) {
            alert('Network error. Please try again.')
        } finally {
            setActionLoading(null)
        }
    }

    const openApproveModal = (course: Course) => {
        setSelectedCourse(course)
        setShowApproveModal(true)
    }

    const openRejectModal = (course: Course) => {
        setSelectedCourse(course)
        setShowRejectModal(true)
    }

    const tabs = [
        { id: 'pending', label: 'Pending Approval', icon: '⏳', count: activeTab === 'pending' ? courses.length : 0 },
        { id: 'approved', label: 'Approved', icon: '✅', count: activeTab === 'approved' ? courses.length : 0 },
        { id: 'rejected', label: 'Rejected', icon: '❌', count: activeTab === 'rejected' ? courses.length : 0 }
    ]

    const getStatusBadge = (status: string) => {
        const badges = {
            PENDING_APPROVAL: { label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: '⏳' },
            APPROVED: { label: 'Approved', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: '✅' },
            REJECTED: { label: 'Rejected', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '❌' }
        }
        const badge = badges[status as keyof typeof badges]
        return (
            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
                <span>{badge.icon}</span>
                {badge.label}
            </span>
        )
    }

    if (!user) {
        return null
    }

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role={user.role} />
            <Navbar title="Course Approvals" />
            <main className="page-content">
                {/* Hero */}
                <div className="hero-section hero-dark mb-8" style={{ background: 'linear-gradient(135deg,#dc2626,#ea580c)' }}>
                    <div className="relative z-10">
                        <p className="text-white/60 text-sm mb-1">Course Management 🎓</p>
                        <h1 className="text-3xl font-bold text-white mb-2">Course Approvals</h1>
                        <p className="text-white/70 mb-4">Review and approve courses submitted by instructors</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`px-6 py-3 rounded-lg font-medium transition-all whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'bg-white/10 text-white border-2 border-primary-500'
                                    : 'bg-white/5 text-gray-400 border-2 border-transparent hover:bg-white/10 hover:text-white'
                            }`}
                        >
                            <span className="flex items-center gap-2">
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                                {activeTab === tab.id && (
                                    <span className="bg-primary-500 text-white text-xs rounded-full px-2 py-0.5">
                                        {courses.length}
                                    </span>
                                )}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : courses.length === 0 ? (
                    <div className="glass-card text-center py-20">
                        <div className="text-6xl mb-4">
                            {activeTab === 'pending' ? '📭' : activeTab === 'approved' ? '✅' : '❌'}
                        </div>
                        <p className="text-white font-semibold text-lg mb-1">
                            No {activeTab} courses
                        </p>
                        <p className="text-gray-400 text-sm">
                            {activeTab === 'pending' 
                                ? 'All caught up! No courses awaiting approval.'
                                : activeTab === 'approved'
                                ? 'No approved courses yet.'
                                : 'No rejected courses.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {courses.map(course => (
                            <div key={course.id} className="glass-card p-6 hover:bg-white/10 transition-colors">
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                                    {/* Course Info */}
                                    <div className="flex-1">
                                        <div className="flex items-start gap-3 mb-3">
                                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-2xl flex-shrink-0">
                                                📚
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 flex-wrap mb-2">
                                                    <h3 className="text-white font-semibold text-lg">{course.title}</h3>
                                                    {getStatusBadge(course.status)}
                                                </div>
                                                <p className="text-gray-400 text-sm line-clamp-2 mb-2">
                                                    {course.description}
                                                </p>
                                                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <span>👤</span>
                                                        <span className="text-primary-400">{course.instructor.name}</span>
                                                    </span>
                                                    {course.category && (
                                                        <span className="flex items-center gap-1">
                                                            <span>📂</span>
                                                            {course.category}
                                                        </span>
                                                    )}
                                                    {course.level && (
                                                        <span className="flex items-center gap-1">
                                                            <span>
                                                                {course.level === 'Beginner' ? '🟢' : 
                                                                 course.level === 'Intermediate' ? '🟡' : '🔴'}
                                                            </span>
                                                            {course.level}
                                                        </span>
                                                    )}
                                                    {course.price !== undefined && (
                                                        <span className="flex items-center gap-1">
                                                            <span>💰</span>
                                                            {course.price > 0 ? `$${course.price}` : 'Free'}
                                                        </span>
                                                    )}
                                                    <span className="flex items-center gap-1">
                                                        <span>📅</span>
                                                        {new Date(course.createdAt).toLocaleDateString()}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Rejection Reason */}
                                        {course.status === 'REJECTED' && course.rejectionReason && (
                                            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                                                <p className="text-red-400 text-sm font-medium mb-1">Rejection Reason:</p>
                                                <p className="text-red-400/80 text-sm">{course.rejectionReason}</p>
                                            </div>
                                        )}

                                        {/* Approver Info */}
                                        {(course.status === 'APPROVED' || course.status === 'REJECTED') && course.approver && (
                                            <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                                                <span>
                                                    {course.status === 'APPROVED' ? 'Approved' : 'Rejected'} by
                                                </span>
                                                <span className="text-primary-400">{course.approver.name}</span>
                                                <span>on</span>
                                                <span>{new Date(course.updatedAt).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    {activeTab === 'pending' && (
                                        <div className="flex gap-3 lg:flex-col">
                                            <button
                                                onClick={() => openApproveModal(course)}
                                                disabled={actionLoading === course.id}
                                                className="btn-success flex-1 lg:flex-none"
                                            >
                                                {actionLoading === course.id ? (
                                                    <span className="flex items-center justify-center gap-2">
                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    </span>
                                                ) : (
                                                    '✅ Approve'
                                                )}
                                            </button>
                                            <button
                                                onClick={() => openRejectModal(course)}
                                                disabled={actionLoading === course.id}
                                                className="btn-danger flex-1 lg:flex-none"
                                            >
                                                ❌ Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Approve Modal */}
            {showApproveModal && selectedCourse && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-white mb-4">Approve Course</h3>
                        <p className="text-gray-400 mb-6">
                            Are you sure you want to approve <span className="text-white font-semibold">"{selectedCourse.title}"</span>? 
                            This will make it visible to all students.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowApproveModal(false)
                                    setSelectedCourse(null)
                                }}
                                className="btn-secondary flex-1"
                                disabled={actionLoading !== null}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleApproveCourse(selectedCourse)}
                                className="btn-success flex-1"
                                disabled={actionLoading !== null}
                            >
                                {actionLoading === selectedCourse.id ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Approving...
                                    </span>
                                ) : (
                                    '✅ Yes, Approve'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && selectedCourse && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card p-6 max-w-md w-full">
                        <h3 className="text-xl font-bold text-white mb-4">Reject Course</h3>
                        <p className="text-gray-400 mb-4">
                            You are about to reject <span className="text-white font-semibold">"{selectedCourse.title}"</span>. 
                            Please provide a reason for rejection:
                        </p>
                        <textarea
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="e.g., Content quality needs improvement, missing course objectives..."
                            rows={4}
                            className="input-field w-full resize-none mb-6"
                            autoFocus
                        />
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowRejectModal(false)
                                    setSelectedCourse(null)
                                    setRejectionReason('')
                                }}
                                className="btn-secondary flex-1"
                                disabled={actionLoading !== null}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRejectCourse}
                                className="btn-danger flex-1"
                                disabled={actionLoading !== null || !rejectionReason.trim()}
                            >
                                {actionLoading === selectedCourse.id ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Rejecting...
                                    </span>
                                ) : (
                                    '❌ Reject Course'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
