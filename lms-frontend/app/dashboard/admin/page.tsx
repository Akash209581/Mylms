'use client'
import { hasRole } from '@/lib/roleUtils'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { getAuthHeaders } from '@/lib/authHeaders'
import { BookOpen, ClipboardList, Hourglass, Info, Landmark, Users } from 'lucide-react'

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
        if (!hasRole(u, 'ADMIN')) { router.push(`/dashboard/${u.role.toLowerCase()}`); return }
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
        { label: 'Total users', value: stats?.totalUsers ?? 0, icon: Users },
        { label: 'Courses', value: stats?.totalCourses ?? 0, icon: BookOpen },
        { label: 'Enrollments', value: stats?.totalEnrollments ?? 0, icon: ClipboardList },
        { label: 'Pending approvals', value: stats?.pendingApprovals ?? 0, icon: Hourglass },
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
                                        onError={(e) => { (e.target as HTMLImageElement).style.visibility = 'hidden' }}
                                    />
                                </div>
                            ) : (
                                <div className="w-24 h-24 flex items-center justify-center rounded-xl role-text-accent">
                                    <Landmark className="w-10 h-10" aria-hidden="true" />
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
                        <Users className="w-4 h-4 mr-2" aria-hidden="true" /> Manage users
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/admin/courses')}
                        className="btn-secondary"
                    >
                        <BookOpen className="w-4 h-4 mr-2" aria-hidden="true" /> View courses
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/admin/approvals')}
                        className="btn-secondary relative"
                    >
                        <Hourglass className="w-4 h-4 mr-2" aria-hidden="true" /> Course approvals
                        {stats?.pendingApprovals > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                                {stats.pendingApprovals}
                            </span>
                        )}
                    </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {statItems.map(({ label, value, icon: Icon }) => (
                        <div key={label} className="stat-card">
                            <div className="role-stat-icon w-9 h-9 flex items-center justify-center mb-4" aria-hidden="true"><Icon className="w-[18px] h-[18px]" /></div>
                            <p className="text-3xl role-text-primary mb-1">{loading ? '—' : Number(value).toLocaleString()}</p>
                            <p className="role-text-muted text-[13px]">{label}</p>
                        </div>
                    ))}
                </div>

                {/* Activity Notice */}
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="role-stat-icon w-9 h-9 flex items-center justify-center" aria-hidden="true">
                            <Info className="w-[18px] h-[18px]" />
                        </div>
                        <h2 className="text-xl role-text-primary">College overview</h2>
                    </div>
                    <p className="role-text-muted leading-relaxed">
                        You are managing users and content within your college. Use the navigation on the left to access user management, courses, and approval workflows.
                    </p>
                </div>
            </main>
        </div>
    )
}
