'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

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

        fetch('http://localhost:3001/superadmin/dashboard', { credentials: 'include' })
            .then(r => r.json())
            .then(data => setStats(data))
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const statItems = [
        { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: '👥', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
        { label: 'Total Courses', value: stats?.totalCourses ?? 0, icon: '📚', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
        { label: 'Enrollments', value: stats?.totalEnrollments ?? 0, icon: '📋', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
        { label: 'Students', value: stats?.studentCount ?? 0, icon: '🎓', gradient: 'linear-gradient(135deg,#a855f7,#ec4899)' },
        { label: 'Instructors', value: stats?.instructorCount ?? 0, icon: '👨‍🏫', gradient: 'linear-gradient(135deg,#3b82f6,#06b6d4)' },
        { label: 'Admins', value: stats?.adminCount ?? 0, icon: '🛡️', gradient: 'linear-gradient(135deg,#ef4444,#dc2626)' },
    ]

    const handleRoleChange = async (userId: number, newRole: string) => {
        await fetch(`http://localhost:3001/superadmin/users/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
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
                <div className="hero-section mb-8" style={{ background: 'linear-gradient(135deg,#7f1d1d,#991b1b,#b91c1c)' }}>
                    <div className="relative z-10">
                        <p className="text-white/60 text-sm mb-1">Super Admin Control Center 🔑</p>
                        <h1 className="text-3xl font-bold text-white mb-2">Welcome, {user?.name}</h1>
                        <p className="text-white/70 mb-4">Full platform access — manage everything</p>
                        <div className="flex gap-3">
                            <span className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-200"
                                style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                🔑 SUPERADMIN
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    {statItems.map((s, i) => (
                        <div key={i} className="stat-card">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
                                style={{ background: s.gradient }}>{s.icon}</div>
                            <p className="text-2xl font-bold text-white mb-0.5">{loading ? '—' : s.value}</p>
                            <p className="text-gray-400 text-xs">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Recent Users */}
                <div className="glass-card p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-white">Recent Users</h3>
                        <a href="/dashboard/superadmin/users">
                            <button className="btn-secondary px-4 py-2 text-sm">View All →</button>
                        </a>
                    </div>
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : !stats?.recentUsers || stats.recentUsers.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-5xl mb-3">👥</div>
                            <p className="text-gray-400">No users yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                        {['User', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                                            <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.recentUsers.map((u: any) => (
                                        <tr key={u.id} className="border-b hover:bg-white/5 transition-colors"
                                            style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                            <td className="py-4 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                                                        style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
                                                        {u.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-white text-sm font-medium">{u.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 pr-4 text-gray-400 text-sm">{u.email}</td>
                                            <td className="py-4 pr-4">
                                                <select defaultValue={u.role}
                                                    onChange={e => handleRoleChange(u.id, e.target.value)}
                                                    className="text-xs font-semibold rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                                                    style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                                                    {['STUDENT', 'INSTRUCTOR', 'ADMIN', 'SUPERADMIN'].map(r => (
                                                        <option key={r} value={r} style={{ background: '#1a1a2e' }}>{r}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-4 pr-4 text-gray-400 text-sm">
                                                {new Date(u.createdAt).toISOString().slice(0, 10)}
                                            </td>
                                            <td className="py-4">
                                                <a href="/dashboard/superadmin/users">
                                                    <button className="px-3 py-1 rounded-lg text-xs font-medium"
                                                        style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                                                        Manage
                                                    </button>
                                                </a>
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
