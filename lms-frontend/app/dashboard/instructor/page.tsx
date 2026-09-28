'use client'
import { hasRole } from '@/lib/roleUtils'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'
import { useEffect, useState } from 'react'
import { getCurrentUser } from '@/lib/session'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { getAuthHeaders } from '@/lib/authHeaders'
import { BadgeCheck, BookOpen, Hourglass, Landmark, Plus, UserPlus, Users } from 'lucide-react'

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
        if (!hasRole(u, 'INSTRUCTOR')) { router.push(`/dashboard/${u.role.toLowerCase()}`); return }
        setUser(u)

        // Refresh user profile to get latest college logo
        getCurrentUser()
            .then(updatedUser => { if (updatedUser) setUser(updatedUser) })
            .catch(() => { })

        apiFetch(`${API_URL}/instructor/dashboard`, {
            credentials: 'include',
            headers: getAuthHeaders(),
        })
            .then(r => r.json())
            .then(data => setStats(data))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const statItems = [
        { label: 'Courses', value: stats?.totalCourses ?? 0, icon: BookOpen },
        { label: 'Pending approval', value: stats?.pendingCourses ?? 0, icon: Hourglass },
        { label: 'Approved', value: stats?.approvedCourses ?? 0, icon: BadgeCheck },
        { label: 'Students', value: stats?.totalStudents ?? 0, icon: Users },
    ]

    const statusBadge: Record<string, { label: string; cls: string }> = {
        APPROVED: { label: 'Approved', cls: 'role-badge role-badge-success' },
        PENDING_APPROVAL: { label: 'Pending', cls: 'role-badge bg-[var(--warning-soft)] text-[var(--warning)]' },
        REJECTED: { label: 'Rejected', cls: 'role-badge role-badge-error' },
        DRAFT: { label: 'Draft', cls: 'role-badge bg-[var(--bg-raised)] text-[var(--text-secondary)]' },
    }

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="INSTRUCTOR" />
            <Navbar title="Instructor Dashboard" />
            <main className="page-content">
                {/* Hero */}
                <div className="role-page-header">
                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <p className="role-eyebrow">Instructor workspace</p>
                            <h1>Welcome, {user?.name}</h1>
                            {user?.collegeName && (
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="role-text-secondary text-sm font-semibold">{user.collegeName}</span>
                                </div>
                            )}
                            <p className="mb-0 text-sm md:text-base">Manage your courses and track student progress.</p>
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
                        onClick={() => router.push('/dashboard/instructor/courses')}
                        className="btn-primary"
                    >
                        <BookOpen className="w-4 h-4 mr-2" aria-hidden="true" /> View all courses
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/instructor/create-course')}
                        className="btn-secondary"
                    >
                        <Plus className="w-4 h-4 mr-2" aria-hidden="true" /> Create course
                    </button>
                    <button
                        onClick={() => router.push('/dashboard/instructor/students/create')}
                        className="btn-secondary"
                    >
                        <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" /> Add student
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

                {/* Course Table */}
                <div className="glass-card p-6">
                    <h2 className="text-xl role-text-primary mb-5">My courses</h2>
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : !stats?.courses || stats.courses.length === 0 ? (
                        <div className="text-center py-16">
                            <BookOpen className="w-10 h-10 mx-auto mb-3 role-text-muted" aria-hidden="true" />
                            <p className="role-text-muted">You haven't created any courses yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="role-data-table w-full">
                                <thead>
                                    <tr>
                                        {['Course', 'Status', 'Created'].map(h => (
                                            <th key={h} className="text-left text-xs font-semibold role-text-muted pb-3 pr-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.courses.map((c: any) => (
                                        <tr key={c.id}>
                                            <td className="py-4 pr-4 role-text-primary font-medium text-sm">{c.title}</td>
                                            <td className="py-4 pr-4">
                                                <span className={statusBadge[c.status]?.cls || 'role-badge'}>
                                                    {statusBadge[c.status]?.label || (c.published ? 'Published' : 'Unknown')}
                                                </span>
                                            </td>
                                            <td className="py-4 role-text-muted text-sm">
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
