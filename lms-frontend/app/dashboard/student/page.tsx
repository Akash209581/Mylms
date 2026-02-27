'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

const STAT_CONFIG = [
    { label: 'Enrolled Courses', icon: '📚', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)', key: 'enrollments' },
    { label: 'Completed Lessons', icon: '✅', gradient: 'linear-gradient(135deg, #10b981, #059669)', key: 'completed' },
    { label: 'In Progress', icon: '⏱️', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', key: 'inProgress' },
    { label: 'Certificates', icon: '🏆', gradient: 'linear-gradient(135deg, #ef4444, #dc2626)', key: 'certs' },
]

export default function StudentDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [enrollments, setEnrollments] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'STUDENT') { router.push(`/dashboard/${u.role.toLowerCase()}`); return }
        setUser(u)

        fetch('http://localhost:3001/enrollments/my', { credentials: 'include' })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setEnrollments(data) })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const stats = [
        enrollments.length,
        0,
        enrollments.length,
        0,
    ]

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="STUDENT" />
            <Navbar title="Student Dashboard" />
            <main className="page-content">
                {/* Hero */}
                <div className="hero-section mb-8 animate-fade-in">
                    <div className="relative z-10">
                        <p className="text-white/60 text-sm font-medium mb-1">Welcome back 👋</p>
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">{user?.name || 'Student'}</h1>
                        <p className="text-white/70 mb-6 max-w-lg">Continue your learning journey. Keep up the great work!</p>
                        <a href="/dashboard/student/courses">
                            <button className="px-6 py-3 rounded-xl text-indigo-900 font-bold text-sm bg-white hover:scale-105 transition-transform duration-300"
                                style={{ boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}>
                                Browse Courses →
                            </button>
                        </a>
                    </div>
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:block opacity-30">
                        <div className="w-40 h-40 rounded-full border-4 border-white/30 flex items-center justify-center text-7xl animate-float">🎓</div>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {STAT_CONFIG.map((card, i) => (
                        <div key={card.key} className="stat-card animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                            <div className="flex items-start justify-between mb-4">
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: card.gradient }}>
                                    {card.icon}
                                </div>
                            </div>
                            <p className="text-3xl font-bold text-white mb-1">{loading ? '—' : stats[i]}</p>
                            <p className="text-gray-400 text-sm">{card.label}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Enrolled Courses */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                            <span className="w-2 h-5 rounded-full" style={{ background: 'linear-gradient(#6366f1,#a855f7)' }} />
                            My Enrolled Courses
                        </h3>
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : enrollments.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-3">📚</div>
                                <p className="text-gray-400 text-sm">You haven't enrolled in any courses yet.</p>
                                <a href="/dashboard/student/courses">
                                    <button className="btn-primary mt-4 px-5 py-2 text-sm">Browse Courses</button>
                                </a>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {enrollments.map((e: any) => (
                                    <div key={e.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 transition-colors">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                                            style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>📚</div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium truncate">{e.course?.title || 'Course'}</p>
                                            <p className="text-gray-500 text-xs mt-0.5">
                                                Enrolled {new Date(e.enrolledAt).toISOString().slice(0, 10)}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Profile Summary */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-semibold text-white mb-5 flex items-center gap-2">
                            <span className="w-2 h-5 rounded-full" style={{ background: 'linear-gradient(#10b981,#059669)' }} />
                            Profile Summary
                        </h3>
                        <div className="flex flex-col items-center py-4">
                            <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white mb-4"
                                style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
                                {user?.name?.charAt(0).toUpperCase() || 'S'}
                            </div>
                            <p className="text-white font-semibold text-lg">{user?.name}</p>
                            <p className="text-gray-400 text-sm">{user?.email}</p>
                            <span className="badge badge-student mt-3">Student</span>
                            <a href="/dashboard/student/profile" className="mt-5">
                                <button className="btn-secondary px-5 py-2 text-sm">Edit Profile</button>
                            </a>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
