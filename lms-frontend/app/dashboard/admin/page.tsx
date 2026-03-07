'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { getAuthHeaders } from '@/lib/authHeaders'

export default function AdminDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'ADMIN') { router.push(`/dashboard/${u.role.toLowerCase()}`); return }
        setUser(u)

        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/admin/dashboard`, {
            credentials: 'include',
            headers: getAuthHeaders(),
        })
            .then(r => r.json())
            .then(data => setStats(data))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const statItems = [
        { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: '👥', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
        { label: 'Total Courses', value: stats?.totalCourses ?? 0, icon: '📚', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
        { label: 'Enrollments', value: stats?.totalEnrollments ?? 0, icon: '📋', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
        { label: 'Pending Approvals', value: stats?.pendingApprovals ?? 0, icon: '⏳', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
    ]

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="ADMIN" />
            <Navbar title="Admin Dashboard" />
            <main className="page-content">
                {/* Hero */}
                <div className="hero-section mb-8" style={{ background: 'linear-gradient(135deg,#c2410c,#ea580c)' }}>
                    <div className="relative z-10">
                        <p className="text-white/60 text-sm mb-1">Admin Control Panel 🛡️</p>
                        <h1 className="text-3xl font-bold text-white mb-2">Hello, {user?.name}</h1>
                        <p className="text-white/70">Manage users, courses, and platform activity</p>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-3 mb-6">
                    <button
                        onClick={() => router.push('/dashboard/admin/users')}
                        className="btn-primary"
                    >
                        👥 Manage Users
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/admin/courses')}
                        className="btn-secondary"
                    >
                        📚 View Courses
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/admin/approvals')}
                        className="btn-secondary relative"
                    >
                        ⏳ Course Approvals
                        {stats?.pendingApprovals > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                {stats.pendingApprovals}
                            </span>
                        )}
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {statItems.map((s, i) => (
                        <div key={i} className="stat-card">
                            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                                style={{ background: s.gradient }}>{s.icon}</div>
                            <p className="text-3xl font-bold text-white mb-1">{loading ? '—' : s.value}</p>
                            <p className="text-gray-400 text-sm">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Activity Notice */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                            style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}>
                            ℹ️
                        </div>
                        <h3 className="text-lg font-semibold text-white">Organization Overview</h3>
                    </div>
                    <p className="text-gray-400 leading-relaxed">
                        You are managing users and content within your organization. Use the navigation above to access user management, courses, and approval workflows.
                    </p>
                </div>
            </main>
        </div>
    )
}
