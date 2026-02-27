'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

export default function InstructorDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'INSTRUCTOR') { router.push(`/dashboard/${u.role.toLowerCase()}`); return }
        setUser(u)

        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/instructor/dashboard`, { credentials: 'include' })
            .then(r => r.json())
            .then(data => setStats(data))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const statItems = [
        { label: 'My Courses', value: stats?.totalCourses ?? 0, icon: '📚', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
        { label: 'Total Students', value: stats?.totalStudents ?? 0, icon: '👥', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
    ]

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="INSTRUCTOR" />
            <Navbar title="Instructor Dashboard" />
            <main className="page-content">
                {/* Hero */}
                <div className="hero-section mb-8" style={{ background: 'linear-gradient(135deg,#4338ca,#6d28d9)' }}>
                    <div className="relative z-10">
                        <p className="text-white/60 text-sm mb-1">Instructor Portal 🎓</p>
                        <h1 className="text-3xl font-bold text-white mb-2">Welcome, {user?.name}</h1>
                        <p className="text-white/70 mb-4">Manage your courses and track student progress</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
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
                                                <span className={`badge ${c.published ? 'badge-student' : 'badge-instructor'}`}>
                                                    {c.published ? 'Published' : 'Draft'}
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
