'use client'
import { hasRole } from '@/lib/roleUtils'

import { apiFetch } from '@/lib/apiFetch'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api, API_URL } from '@/lib/api'
import { getAuthHeaders } from '@/lib/authHeaders'
import { toast } from '@/lib/toast'
import { BookOpen, ClipboardList, GraduationCap, Landmark, Presentation, ShieldCheck, Users } from 'lucide-react'

export default function SuperAdminDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (!hasRole(u, 'SUPERADMIN')) { router.push(`/dashboard/${u.role.toLowerCase()}`); return }
        setUser(u)

        api.get('/superadmin/dashboard')
            .then(res => setStats(res.data))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const statItems = [
        { label: 'Colleges', value: stats?.totalColleges ?? 0, icon: Landmark, link: '/dashboard/superadmin/colleges' },
        { label: 'Total users', value: stats?.totalUsers ?? 0, icon: Users, link: '/dashboard/superadmin/users' },
        { label: 'Courses', value: stats?.totalCourses ?? 0, icon: BookOpen, link: '/dashboard/superadmin/courses' },
        { label: 'Enrollments', value: stats?.totalEnrollments ?? 0, icon: ClipboardList },
        { label: 'Students', value: stats?.studentCount ?? 0, icon: GraduationCap },
        { label: 'Instructors', value: stats?.instructorCount ?? 0, icon: Presentation },
        { label: 'Admins', value: stats?.adminCount ?? 0, icon: ShieldCheck },
    ]

    const handleRoleChange = async (userId: number, newRole: string) => {
        try {
            const res = await apiFetch(`${API_URL}/superadmin/users/${userId}/role`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                credentials: 'include',
                body: JSON.stringify({ role: newRole }),
            })
            if (!res.ok) throw new Error()
            toast.success('Role updated')
        } catch {
            toast.error('Could not update the role. Please try again.')
        }
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
                    {statItems.map(({ label, value, icon: Icon, link }) => {
                        const body = <>
                            <div className="role-stat-icon w-9 h-9 flex items-center justify-center mb-4" aria-hidden="true"><Icon className="w-[18px] h-[18px]" /></div>
                            <p className="text-3xl role-text-primary mb-1">{loading ? '—' : Number(value).toLocaleString()}</p>
                            <p className="role-text-muted text-[13px]">{label}</p>
                        </>
                        return link
                            ? <Link key={label} className="stat-card role-stat-link" href={link}>{body}</Link>
                            : <div key={label} className="stat-card">{body}</div>
                    })}
                </div>

                {/* Recent Users */}
                <div className="glass-card p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl role-text-primary">Recent users</h2>
                        <Link href="/dashboard/superadmin/users" className="role-table-action">View all users →</Link>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : !stats?.recentUsers || stats.recentUsers.length === 0 ? (
                        <div className="text-center py-16">
                            <Users className="w-10 h-10 mx-auto mb-3 role-text-muted" aria-hidden="true" />
                            <p className="role-text-muted">No users yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="role-data-table w-full">
                                <thead>
                                    <tr>
                                        {['User', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                                             <th key={h} className="text-left text-xs font-semibold role-text-muted pb-3 pr-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recentUsers.map((u: any) => (
                                        <tr key={u.id}>
                                            <td className="py-4 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="shell-avatar" aria-hidden="true">
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
                                                    {[
                                                        { value: 'STUDENT', label: 'Student' },
                                                        { value: 'INSTRUCTOR', label: 'Instructor' },
                                                        { value: 'ADMIN', label: 'College Admin' },
                                                        { value: 'SUPERADMIN', label: 'Super Admin' },
                                                        { value: 'QUESTION_CREATOR', label: 'Question Creator' },
                                                        { value: 'CONTENT_CREATOR', label: 'Content Creator' },
                                                    ].map(r => (
                                                        <option key={r.value} value={r.value}>{r.label}</option>
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
