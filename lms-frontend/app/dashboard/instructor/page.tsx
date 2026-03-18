'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { getAuthHeaders } from '@/lib/authHeaders'

export default function InstructorDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Initial state from localStorage
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'INSTRUCTOR') { router.push(`/dashboard/${u.role.toLowerCase()}`); return }
        setUser(u)

        // Refresh user profile to get latest college logo
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/auth/me`, {
            headers: getAuthHeaders(),
        })
            .then(r => r.json())
            .then(updatedUser => {
                if (updatedUser && !updatedUser.message) {
                    setUser(updatedUser)
                    localStorage.setItem('user', JSON.stringify(updatedUser))
                }
            })
            .catch(() => { })

        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/instructor/dashboard`, {
            credentials: 'include',
            headers: getAuthHeaders(),
        })
            .then(r => r.json())
            .then(data => setStats(data))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const statItems = [
        { label: 'Total Courses', value: stats?.totalCourses ?? 0, icon: '📚', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'text-indigo-600' },
        { label: 'Pending Approval', value: stats?.pendingCourses ?? 0, icon: '⏳', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', color: 'text-yellow-600' },
        { label: 'Approved Courses', value: stats?.approvedCourses ?? 0, icon: '✅', gradient: 'linear-gradient(135deg,#10b981,#059669)', color: 'text-green-600' },
        { label: 'Total Students', value: stats?.totalStudents ?? 0, icon: '👥', gradient: 'linear-gradient(135deg,#3b82f6,#2563eb)', color: 'text-blue-600' },
    ]

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="INSTRUCTOR" />
            <Navbar title="Instructor Dashboard" />
            <main className="page-content">
                {/* Hero */}
                <div className="hero-section hero-dark mb-8 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#4338ca,#6d28d9)' }}>
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <p className="text-white/60 text-sm mb-1">Instructor Portal 🎓</p>
                            <h1 className="text-3xl font-bold text-white mb-2">Welcome, {user?.name}</h1>
                            {user?.collegeName && (
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-white/90 font-semibold">🎓 {user.collegeName}</span>
                                </div>
                            )}
                            <p className="text-white/70 mb-0 text-sm md:text-base">Manage your courses and track student progress</p>
                        </div>

                        {/* College Logo */}
                        <div className="flex-shrink-0 bg-white/10 p-3 rounded-2xl border border-white/20 backdrop-blur-sm shadow-inner group transition-all hover:bg-white/20">
                            {user?.collegeLogo ? (
                                <div className="relative w-24 h-24 flex items-center justify-center overflow-hidden rounded-xl bg-white/5">
                                    <img
                                        src={user.collegeLogo}
                                        alt={user.collegeName || 'College Logo'}
                                        className="max-w-full max-h-full object-contain p-1"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/5322/5322033.png';
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="w-24 h-24 flex items-center justify-center text-5xl bg-white/5 rounded-xl">
                                    🏫
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <button
                        onClick={() => router.push('/dashboard/instructor/courses')}
                        className="btn-primary"
                    >
                        📚 View All Courses
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/instructor/create-course')}
                        className="btn-secondary"
                    >
                        ➕ Create New Course
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/instructor/students/create')}
                        className="btn-secondary"
                    >
                        👤 Create New Student
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {statItems.map((s, i) => (
                        <div key={i} className="stat-card">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                                style={{ background: s.gradient }}>{s.icon}</div>
                            <p className="text-3xl font-bold text-white mb-1">
                                {loading ? '—' : s.value}
                            </p>
                            <p className="text-gray-400 text-sm">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Course Table */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-6">My Courses</h3>
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : !stats?.courses || stats.courses.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-5xl mb-3">📚</div>
                            <p className="text-gray-400">You haven't created any courses yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                        {['Course', 'Status', 'Created'].map(h => (
                                            <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.courses.map((c: any) => (
                                        <tr key={c.id} className="border-b hover:bg-white/5 transition-colors"
                                            style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                            <td className="py-4 pr-4 text-white font-medium text-sm">{c.title}</td>
                                            <td className="py-4 pr-4">
                                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${c.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                        c.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-800' :
                                                            c.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                                c.status === 'DRAFT' ? 'bg-slate-100 text-slate-800' :
                                                                    'bg-gray-100 text-gray-800'
                                                    }`}>
                                                    {c.status === 'APPROVED' ? '✅ Approved' :
                                                        c.status === 'PENDING_APPROVAL' ? '⏳ Pending' :
                                                            c.status === 'REJECTED' ? '❌ Rejected' :
                                                                c.status === 'DRAFT' ? '📝 Draft' :
                                                                    c.published ? '✓ Published' : '○ Unknown'}
                                                </span>
                                            </td>
                                            <td className="py-4 text-gray-400 text-sm">
                                                {new Date(c.createdAt).toISOString().slice(0, 10)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
