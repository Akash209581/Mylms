'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import CoursePreviewModal from '@/components/course/CoursePreviewModal'

const gradients = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
]

export default function SuperAdminCoursesPage() {
    const router = useRouter()
    const [courses, setCourses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [previewCourseId, setPreviewCourseId] = useState<number | null>(null)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN') { router.push('/login'); return }

        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/courses`, { credentials: 'include' })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setCourses(data) })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const handleDelete = async (courseId: number) => {
        if (!confirm('Delete this course permanently?')) return
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/superadmin/courses/${courseId}`, {
            method: 'DELETE', credentials: 'include'
        })
        setCourses(prev => prev.filter(c => c.id !== courseId))
    }

    const filtered = courses.filter(c =>
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.instructor?.name?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="SUPERADMIN" />
            <Navbar title="All Courses" />
            <main className="page-content">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Course Management</h1>
                        <p className="text-gray-400">View and manage all courses on the platform</p>
                    </div>
                    <button
                        onClick={() => router.push('/dashboard/superadmin/courses/create')}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
                    >
                        ➕ Create New Course
                    </button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Courses', value: courses.length, icon: '📚', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
                        { label: 'Approved', value: courses.filter(c => c.status === 'APPROVED').length, icon: '✅', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
                        { label: 'Pending Approval', value: courses.filter(c => c.status === 'PENDING_APPROVAL').length, icon: '⏳', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
                        { label: 'Instructors', value: new Set(courses.map(c => c.instructorId)).size, icon: '👨‍🏫', gradient: 'linear-gradient(135deg,#a855f7,#ec4899)' },
                    ].map((s, i) => (
                        <div key={i} className="stat-card">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
                                style={{ background: s.gradient }}>{s.icon}</div>
                            <p className="text-2xl font-bold text-white mb-0.5">{s.value}</p>
                            <p className="text-gray-400 text-xs">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by title or instructor..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input-field pl-10 max-w-md"
                    />
                </div>

                {/* Course Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filtered.map((course, i) => (
                            <div key={course.id} className="course-card group">
                                {/* Thumbnail */}
                                <div className="h-40 relative overflow-hidden"
                                    style={{ background: gradients[i % gradients.length] }}>
                                    <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-40 group-hover:scale-110 transition-transform duration-300">
                                        📚
                                    </div>
                                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                                        {/* Status Badge */}
                                        <span className={`badge ${course.status === 'APPROVED' ? 'badge-student' :
                                                course.status === 'PENDING_APPROVAL' ? 'badge-instructor' :
                                                    'badge-admin'
                                            }`}>
                                            {course.status === 'APPROVED' ? '✅ Approved' :
                                                course.status === 'PENDING_APPROVAL' ? '⏳ Pending' :
                                                    '❌ Rejected'}
                                        </span>
                                        {/* Published Badge */}
                                        {course.status === 'APPROVED' && (
                                            <span className={`badge ${course.published ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                                                {course.published ? '🌐 Published' : '📝 Draft'}
                                            </span>
                                        )}
                                    </div>
                                    <div className="absolute bottom-3 left-3 text-white/60 text-xs font-medium">
                                        ID: #{course.id}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    <h3 className="text-white font-semibold mb-1 line-clamp-1">{course.title}</h3>
                                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{course.description || 'No description'}</p>
                                    <p className="text-gray-500 text-xs mb-4">
                                        by <span className="text-primary-400">{course.instructor?.name || 'Unknown Instructor'}</span>
                                    </p>
                                    <div className="flex gap-2">
                                        <button onClick={() => setPreviewCourseId(course.id)}
                                            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                                            style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                                            View Preview
                                        </button>
                                        <button
                                            onClick={() => handleDelete(course.id)}
                                            className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                                            style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 glass-card">
                        <div className="text-6xl mb-4">📚</div>
                        <p className="text-white font-semibold text-lg mb-1">No courses yet</p>
                        <p className="text-gray-400 text-sm">Courses created by instructors will appear here</p>
                    </div>
                )}
            </main>

            <CoursePreviewModal
                isOpen={previewCourseId !== null}
                courseId={previewCourseId}
                onClose={() => setPreviewCourseId(null)}
            />
        </div>
    )
}
