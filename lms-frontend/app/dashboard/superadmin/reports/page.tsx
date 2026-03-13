'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

export default function ReportsPage() {
    const router = useRouter()
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN') { router.push('/login'); return }

        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/superadmin/reports/overview`, { credentials: 'include' })
            .then(r => r.json())
            .then(res => setData(res))
            .catch(err => console.error(err))
            .finally(() => setLoading(false))
    }, [])

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    )

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="SUPERADMIN" />
            <Navbar title="Platform Reports" />
            <main className="page-content">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Platform Analytics</h1>
                    <p className="text-gray-600">Comprehensive overview of platform activity and growth.</p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {[
                        { label: 'Total Users', value: data?.stats?.totalUsers || 0, icon: '👥', badgeClass: 'bg-indigo-100 text-indigo-700' },
                        { label: 'Total Courses', value: data?.stats?.totalCourses || 0, icon: '📚', badgeClass: 'bg-emerald-100 text-emerald-700' },
                        { label: 'Total Enrollments', value: data?.stats?.totalEnrollments || 0, icon: '📝', badgeClass: 'bg-orange-100 text-orange-700' },
                        { label: 'Questions in Bank', value: data?.stats?.totalQuestions || 0, icon: '❓', badgeClass: 'bg-pink-100 text-pink-700' },
                    ].map((s, i) => (
                        <div key={i} className="stat-card">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-2xl">{s.icon}</span>
                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${s.badgeClass}`}>
                                    Live
                                </span>
                            </div>
                            <p className="text-gray-500 text-sm font-medium">{s.label}</p>
                            <p className="text-3xl font-bold text-gray-900">{s.value}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* User Distribution */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">User Distribution by Role</h3>
                        <div className="space-y-4">
                            {data?.roles?.map((r: any) => (
                                <div key={r.role} className="flex items-center gap-4">
                                    <div className="w-24 text-sm font-medium text-gray-600">{r.role}</div>
                                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500"
                                            style={{ width: `${data?.stats?.totalUsers ? (r.count / data.stats.totalUsers) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                    <div className="w-12 text-right text-sm font-bold text-gray-900">{r.count}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Recent Enrollments */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-bold text-gray-900 mb-6">Recent Platform Activity</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left border-b border-gray-100">
                                        <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">User</th>
                                        <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Course</th>
                                        <th className="pb-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Date</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {data?.recentEnrollments?.map((e: any) => (
                                        <tr key={e.id}>
                                            <td className="py-3 text-sm font-medium text-gray-900">{e.user?.name}</td>
                                            <td className="py-3 text-sm text-gray-600">{e.course?.title}</td>
                                            <td className="py-3 text-sm text-gray-400">{new Date(e.enrolledAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                    {(!data?.recentEnrollments || data.recentEnrollments.length === 0) && (
                                        <tr>
                                            <td colSpan={3} className="py-8 text-center text-gray-400 text-sm italic">No recent activity found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
