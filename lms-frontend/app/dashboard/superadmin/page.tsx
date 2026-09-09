'use client'

import { apiFetch } from '@/lib/apiFetch'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api, API_URL } from '@/lib/api'
import { getAuthHeaders } from '@/lib/authHeaders'

export default function SuperAdminDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN') { router.push(`/dashboard/${u.role.toLowerCase()}`); return }
        setUser(u)

        api.get('/superadmin/dashboard')
            .then(res => setStats(res.data))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const statItems = [
        { label: 'Colleges', value: stats?.totalColleges ?? 0, icon: '🏛️', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)', link: '/dashboard/superadmin/colleges' },
        { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: '👥', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
        { label: 'Total Courses', value: stats?.totalCourses ?? 0, icon: '📚', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
        { label: 'Enrollments', value: stats?.totalEnrollments ?? 0, icon: '📋', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
        { label: 'Students', value: stats?.studentCount ?? 0, icon: '🎓', gradient: 'linear-gradient(135deg,#a855f7,#ec4899)' },
        { label: 'Instructors', value: stats?.instructorCount ?? 0, icon: '👨‍🏫', gradient: 'linear-gradient(135deg,#3b82f6,#06b6d4)' },
        { label: 'Admins', value: stats?.adminCount ?? 0, icon: '🛡️', gradient: 'linear-gradient(135deg,#ef4444,#dc2626)' },
    ]

    const handleRoleChange = async (userId: number, newRole: string) => {
        await apiFetch(`${API_URL}/superadmin/users/${userId}/role`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            credentials: 'include',
            body: JSON.stringify({ role: newRole }),
        })
    }

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="SUPERADMIN" />
            <Navbar title="SuperAdmin Panel" />
            <main className="page-content">
                {/* Hero */}
                <div className="role-page-header">
                    <div className="relative z-10">
                        <p className="role-eyebrow">Platform administration</p>
                        <h1>Welcome, {user?.name}</h1>
                        <p className="text-sm md:text-base">Oversee colleges, users, courses, and platform activity.</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 mb-8">
                    {statItems.map((s, i) => (
                        s.link ? (
                            <Link key={i} className="stat-card role-stat-link" href={s.link}>
                                <div className="role-stat-icon w-10 h-10 flex items-center justify-center text-xl mb-3" aria-hidden="true">{s.icon}</div>
                                <p className="text-2xl font-bold role-text-primary mb-0.5">{loading ? '—' : s.value}</p>
                                <p className="role-text-muted text-xs">{s.label}</p>
                            </Link>
                        ) : (
                            <div key={i} className="stat-card">
                                <div className="role-stat-icon w-10 h-10 flex items-center justify-center text-xl mb-3" aria-hidden="true">{s.icon}</div>
                                <p className="text-2xl font-bold role-text-primary mb-0.5">{loading ? '—' : s.value}</p>
                                <p className="role-text-muted text-xs">{s.label}</p>
                            </div>
                        )
                    ))}
                </div>

                {/* Recent Users */}
                <div className="glass-card p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-lg font-semibold role-text-primary">Recent Users</h2>
                        <Link href="/dashboard/superadmin/users" className="role-table-action">View all users →</Link>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : !stats?.recentUsers || stats.recentUsers.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-5xl mb-3">👥</div>
                            <p className="role-text-muted">No users yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="role-data-table w-full">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                        {['User', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                                             <th key={h} className="text-left text-xs font-semibold role-text-muted pb-3 pr-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recentUsers.map((u: any) => (
                                        <tr key={u.id} className="border-b hover:bg-[var(--bg-surface)]/5 transition-colors"
                                            style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                            <td className="py-4 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                                                        style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
                                                        {u.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="role-text-primary text-sm font-medium">{u.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 pr-4 role-text-muted text-sm">{u.email}</td>
                                            <td className="py-4 pr-4">
                                                <select defaultValue={u.role}
                                                    onChange={e => handleRoleChange(u.id, e.target.value)}
                                                    aria-label="Change user role"
                                                    className="role-table-select">
                                                    {['STUDENT', 'INSTRUCTOR', 'ADMIN', 'SUPERADMIN'].map(r => (
                                                        <option key={r} value={r}>{r}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-4 pr-4 role-text-muted text-sm">
                                                {new Date(u.createdAt).toISOString().slice(0, 10)}
                                            </td>
                                            <td className="py-4">
                                                <Link href="/dashboard/superadmin/users" className="role-table-action">Manage</Link>
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
