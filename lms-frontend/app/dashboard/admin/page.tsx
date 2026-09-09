'use client'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'
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
        // Initial state from localStorage
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'ADMIN') { router.push(`/dashboard/${u.role.toLowerCase()}`); return }
        setUser(u)

        // Refresh user profile to get latest college logo
        apiFetch(`${API_URL}/auth/me`, {
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

        apiFetch(`${API_URL}/admin/dashboard`, {
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
                <div className="role-page-header">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <p className="role-eyebrow">Administration</p>
                            <h1>Hello, {user?.name}</h1>
                            {user?.collegeName && (
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="role-text-secondary text-sm font-semibold">{user.collegeName}</span>
                                </div>
                            )}
                            <p className="text-sm md:text-base">Manage users, courses, and college activity.</p>
                        </div>

                        {/* College Logo */}
                        <div className="role-college-logo">
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
                            <div className="role-stat-icon w-10 h-10 flex items-center justify-center text-xl mb-4" aria-hidden="true">{s.icon}</div>
                            <p className="text-3xl font-bold role-text-primary mb-1">{loading ? '—' : s.value}</p>
                            <p className="role-text-muted text-sm">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Activity Notice */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="role-stat-icon w-10 h-10 flex items-center justify-center text-xl" aria-hidden="true">
                            ℹ️
                        </div>
                        <h3 className="text-lg font-semibold role-text-primary">College Overview</h3>
                    </div>
                    <p className="role-text-muted leading-relaxed">
                        You are managing users and content within your college. Use the navigation above to access user management, courses, and approval workflows.
                    </p>
                </div>
            </main>
        </div>
    )
}
