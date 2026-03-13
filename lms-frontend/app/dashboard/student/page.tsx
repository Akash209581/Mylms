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

function DailyStreakDisplay() {
    const [streak, setStreak] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10)
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/daily-streak/today?date=${today}`, { credentials: 'include' })
            .then(r => r.json())
            .then(data => {
                if (data && !data.message) setStreak(data)
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    if (loading) return <div className="h-24 bg-gray-50 animate-pulse rounded-xl" />
    if (!streak) return (
        <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
            <p className="text-amber-800 text-sm italic">No coding streak question set for today. Check back later!</p>
        </div>
    )

    return (
        <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded uppercase">Daily Challenge</span>
                <span className="text-gray-400 text-xs font-mono">Q#{streak.question?.questionNumber}</span>
            </div>
            <p className="text-gray-900 font-bold text-base mb-2 line-clamp-2">{streak.question?.questionText}</p>
            <div className="flex items-center gap-3 mt-4">
                <button
                    className="btn-primary py-2 px-6 text-sm flex-1"
                    onClick={() => window.location.href = '/dashboard/student/streak'}
                >
                    Solve Now
                </button>
            </div>
        </div>
    )
}

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

        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/enrollments/my`, { credentials: 'include' })
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
                <div className="hero-section mb-8 animate-fade-in bg-white border border-gray-100 shadow-sm">
                    <div className="relative z-10">
                        <p className="text-gray-500 text-sm font-medium mb-1">Welcome back 👋</p>
                        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-3">{user?.name || 'Student'}</h1>
                        <p className="text-gray-600 mb-6 max-w-lg">Continue your learning journey. Keep up the great work!</p>
                        <a href="/dashboard/student/courses">
                            <button className="btn-primary px-8 py-3.5 text-sm">
                                Browse Courses →
                            </button>
                        </a>
                    </div>
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 hidden lg:block opacity-20">
                        <div className="w-40 h-40 rounded-full border-4 border-indigo-100 flex items-center justify-center text-7xl animate-float">🎓</div>
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
                    {/* Daily Streak */}
                    <div className="glass-card p-6 border border-amber-500/20 shadow-amber-500/5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-2 opacity-10 text-5xl">🔥</div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-5 flex items-center gap-2">
                            <span className="w-2 h-5 rounded-full bg-amber-500" />
                            Today's Coding Streak
                        </h3>
                        <DailyStreakDisplay />
                    </div>

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
