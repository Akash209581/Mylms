'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { getAuthHeaders } from '@/lib/authHeaders'

const gradients = [
    'linear-gradient(135deg,#667eea,#764ba2)',
    'linear-gradient(135deg,#f093fb,#f5576c)',
    'linear-gradient(135deg,#4facfe,#00f2fe)',
    'linear-gradient(135deg,#43e97b,#38f9d7)',
    'linear-gradient(135deg,#fa709a,#fee140)',
    'linear-gradient(135deg,#a18cd1,#fbc2eb)',
]

export default function AdminCoursesPage() {
    const router = useRouter()
    const [courses, setCourses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'ADMIN' && u.role !== 'SUPERADMIN') { router.push('/login'); return }

        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/admin/courses`, {
            credentials: 'include',
            headers: getAuthHeaders(),
        })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setCourses(data) })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const filtered = courses.filter(c =>
        c.title?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="ADMIN" />
            <Navbar title="Courses" />
            <main className="page-content">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-1">All Courses</h1>
                    <p className="text-gray-400">Browse and manage all courses on the platform</p>
                </div>

                <div className="relative mb-6">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" placeholder="Search courses..." value={search}
                        onChange={e => setSearch(e.target.value)} className="input-field pl-10 max-w-md" />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filtered.map((course, i) => (
                            <div key={course.id} className="course-card group">
                                <div className="h-40 relative overflow-hidden"
                                    style={{ background: gradients[i % gradients.length] }}>
                                    <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-40">📚</div>
                                    <div className="absolute top-3 right-3">
                                        <span className={`badge ${course.published ? 'badge-student' : 'badge-instructor'}`}>
                                            {course.published ? 'Published' : 'Draft'}
                                        </span>
                                    </div>
                                </div>
                                <div className="p-5">
                                    <h3 className="text-white font-semibold mb-1 line-clamp-1">{course.title}</h3>
                                    <p className="text-gray-400 text-sm mb-3 line-clamp-2">{course.description || 'No description'}</p>
                                    <p className="text-[var(--text-secondary)] text-xs">
                                        by <span className="text-primary-400">{course.instructor?.name || 'Unknown'}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="glass-card text-center py-20">
                        <div className="text-6xl mb-4">📚</div>
                        <p className="text-white font-semibold text-lg mb-1">No courses yet</p>
                        <p className="text-gray-400 text-sm">Courses will appear here once instructors create them</p>
                    </div>
                )}
            </main>
        </div>
    )
}
