'use client'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { getAuthHeaders } from '@/lib/authHeaders'

const Skeleton = ({ className = '' }: { className?: string }) => (
    <div className={`bg-[var(--bg-raised)] animate-pulse rounded-2xl ${className}`} />
)

// Pure-CSS bar chart (no external lib)
function BarChart({ data, height = 160 }: { data: { label: string; value: number; color?: string }[]; height?: number }) {
    const max = Math.max(...data.map(d => d.value), 1)
    return (
        <div className="flex items-end gap-3" style={{ height }}>
            {data.map((d, i) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-2">
                    <span className="text-[10px] font-black text-[var(--text-muted)]">{d.value}</span>
                    <div
                        className="w-full rounded-t-lg transition-all duration-700"
                        style={{
                            height: `${(d.value / max) * (height - 32)}px`,
                            background: d.color || 'linear-gradient(180deg, #6366f1, #a855f7)',
                            minHeight: d.value > 0 ? '4px' : '2px',
                        }}
                    />
                    <span className="text-[10px] text-[var(--text-muted)] text-center leading-tight">{d.label}</span>
                </div>
            ))}
        </div>
    )
}

export default function AdminReportsPage() {
    const router = useRouter()
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'ADMIN' && u.role !== 'SUPERADMIN') { router.push('/login'); return }

        const headers = getAuthHeaders()
        const apiBase = API_URL

        Promise.all([
            apiFetch(`${apiBase}/admin/dashboard`, { headers }).then(r => r.json()),
            apiFetch(`${apiBase}/superadmin/reports/overview`, { headers }).then(r => r.json()).catch(() => ({})),
        ]).then(([dashData, reportsData]) => {
            setData({ dash: dashData, reports: reportsData })
        }).catch(() => {}).finally(() => setLoading(false))
    }, [])

    const dash = data?.dash || {}
    const reports = data?.reports || {}

    const enrollmentByMonth = reports?.enrollmentsByMonth || []
    const roleDistribution = reports?.roles || []

    return (
        <div className="min-h-screen bg-[var(--bg-base)]">
            <Sidebar role="ADMIN" />
            <Navbar title="Reports & Analytics" />
            <main className="page-content pt-24 pb-12">

                <div className="mb-8">
                    <h1 className="text-3xl font-black text-[var(--text-primary)] mb-1">Reports & Analytics</h1>
                    <p className="text-[var(--text-secondary)]">Real-time insights into your college's learning activity</p>
                </div>

                {/* KPI Cards */}
                {loading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Total Users', value: dash?.totalUsers ?? reports?.stats?.totalUsers ?? 0, icon: '👥', color: 'from-indigo-500 to-purple-500', trend: '+12%' },
                            { label: 'Total Courses', value: dash?.totalCourses ?? reports?.stats?.totalCourses ?? 0, icon: '📚', color: 'from-emerald-500 to-teal-500', trend: '+5%' },
                            { label: 'Enrollments', value: dash?.totalEnrollments ?? reports?.stats?.totalEnrollments ?? 0, icon: '📝', color: 'from-amber-500 to-orange-500', trend: '+28%' },
                            { label: 'Pending Approvals', value: dash?.pendingApprovals ?? 0, icon: '⏳', color: 'from-red-500 to-pink-500', trend: null },
                        ].map((s, i) => (
                            <div key={i} className="glass-card p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-lg shadow-lg`}>{s.icon}</div>
                                    {s.trend && <span className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">{s.trend} ↑</span>}
                                </div>
                                <p className="text-2xl font-black text-[var(--text-primary)]">{s.value}</p>
                                <p className="text-xs text-[var(--text-secondary)] font-semibold">{s.label}</p>
                            </div>
                        ))}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Enrollment Trend */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-black text-[var(--text-primary)] mb-6 flex items-center gap-3">
                            <span className="w-2 h-5 bg-indigo-500 rounded-full" />
                            Enrollment Trend (Last 6 Months)
                        </h3>
                        {loading ? <Skeleton className="h-40" /> : enrollmentByMonth.length > 0 ? (
                            <BarChart
                                data={enrollmentByMonth.map((m: any) => ({ label: m.month, value: m.count, color: 'linear-gradient(180deg, #6366f1, #a855f7)' }))}
                            />
                        ) : (
                            <div className="h-40 flex items-center justify-center">
                                <p className="text-[var(--text-muted)] italic text-sm">No enrollment trend data available yet</p>
                            </div>
                        )}
                    </div>

                    {/* User Role Distribution */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-black text-[var(--text-primary)] mb-6 flex items-center gap-3">
                            <span className="w-2 h-5 bg-purple-500 rounded-full" />
                            User Distribution by Role
                        </h3>
                        {loading ? <Skeleton className="h-40" /> : (
                            <div className="space-y-4">
                                {roleDistribution.length > 0 ? roleDistribution.map((r: any, i: number) => {
                                    const total = roleDistribution.reduce((s: number, x: any) => s + (x.count || 0), 0)
                                    const pct = total ? Math.round((r.count / total) * 100) : 0
                                    const colors = ['bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-red-500']
                                    return (
                                        <div key={r.role}>
                                            <div className="flex justify-between text-sm font-semibold mb-1.5">
                                                <span className="text-[var(--text-primary)]">{r.role}</span>
                                                <span className="text-[var(--text-muted)]">{r.count} ({pct}%)</span>
                                            </div>
                                            <div className="h-2.5 bg-[var(--border)] rounded-full overflow-hidden">
                                                <div className={`h-full ${colors[i % colors.length]} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    )
                                }) : (
                                    <div className="py-8 text-center text-[var(--text-muted)] text-sm italic">No user data available</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Enrollments */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-5">
                        <h3 className="text-lg font-black text-[var(--text-primary)] flex items-center gap-3">
                            <span className="w-2 h-5 bg-emerald-500 rounded-full" />
                            Recent Enrollments
                        </h3>
                        <button onClick={() => router.push('/dashboard/admin/users')} className="text-sm text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                            Manage Users →
                        </button>
                    </div>
                    {loading ? (
                        <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-14" />)}</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="role-data-table w-full">
                                <thead>
                                    <tr className="border-b border-[var(--border)]">
                                        {['Student', 'Course', 'Enrolled On', 'Status'].map(h => (
                                            <th key={h} className="text-left pb-3 text-xs font-black text-[var(--text-muted)] uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border)]">
                                    {(reports?.recentEnrollments || []).slice(0, 10).map((e: any) => (
                                        <tr key={e.id} className="hover:bg-[var(--bg-raised)] transition-colors">
                                            <td className="py-3 text-sm font-semibold text-[var(--text-primary)]">{e.user?.name || '—'}</td>
                                            <td className="py-3 text-sm text-[var(--text-secondary)] truncate max-w-[200px]">{e.course?.title || '—'}</td>
                                            <td className="py-3 text-sm text-[var(--text-muted)]">{e.enrolledAt ? new Date(e.enrolledAt).toLocaleDateString('en-IN') : '—'}</td>
                                            <td className="py-3">
                                                <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Active</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!reports?.recentEnrollments || reports.recentEnrollments.length === 0) && (
                                        <tr><td colSpan={4} className="py-8 text-center text-[var(--text-muted)] text-sm italic">No enrollment records found</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
