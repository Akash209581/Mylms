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

function BarChart({ data, height = 160 }: {
    data: { label: string; value: number; color?: string }[]; height?: number
}) {
    const max = Math.max(...data.map(d => d.value), 1)
    return (
        <div className="flex items-end gap-2" style={{ height }}>
            {data.map((d, i) => (
                <div key={i} className="flex flex-col items-center flex-1 gap-1.5">
                    <span className="text-[9px] font-black text-[var(--text-muted)]">{d.value}</span>
                    <div
                        className="w-full rounded-t-lg transition-all duration-700"
                        style={{
                            height: `${Math.max((d.value / max) * (height - 36), d.value > 0 ? 6 : 2)}px`,
                            background: d.color || 'linear-gradient(180deg, #6366f1, #a855f7)',
                        }}
                    />
                    <span className="text-[9px] text-[var(--text-muted)] text-center leading-tight w-full truncate px-0.5">{d.label}</span>
                </div>
            ))}
        </div>
    )
}

function exportCSV(data: any[], filename: string) {
    if (!data.length) return
    const headers = Object.keys(data[0]).join(',')
    const rows = data.map((row: any) => Object.values(row).map(v => `"${v}"`).join(','))
    const csv = [headers, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
}

export default function ReportsPage() {
    const router = useRouter()
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN') { router.push('/login'); return }

        const headers = getAuthHeaders()
        apiFetch(`${API_URL}/superadmin/reports/overview`, { headers })
            .then(r => r.json())
            .then(res => setData(res))
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    const stats = data?.stats || {}
    const roles = data?.roles || []
    const enrollmentsByMonth = data?.enrollmentsByMonth || []
    const topCourses = data?.topCourses || []
    const recentEnrollments = data?.recentEnrollments || []

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="SUPERADMIN" />
            <Navbar title="Platform Reports" />
            <main className="page-content">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold role-text-primary mb-2">Platform Analytics</h1>
                        <p className="role-text-muted">Comprehensive overview of platform activity and growth.</p>
                    </div>
                    <button
                        onClick={() => exportCSV(recentEnrollments, 'enrollments.csv')}
                        className="btn-secondary px-5 py-2.5 flex items-center gap-2 text-sm"
                    >
                        ⬇ Export CSV
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {loading ? [1,2,3,4].map(i => <Skeleton key={i} className="h-32" />) :
                    [
                        { label: 'Total Users', value: stats?.totalUsers || 0, icon: '👥', color: 'from-indigo-500 to-purple-500', sub: 'Across all colleges' },
                        { label: 'Total Courses', value: stats?.totalCourses || 0, icon: '📚', color: 'from-emerald-500 to-teal-500', sub: 'All published courses' },
                        { label: 'Total Enrollments', value: stats?.totalEnrollments || 0, icon: '📝', color: 'from-amber-500 to-orange-500', sub: 'Lifetime enrollments' },
                        { label: 'Questions in Bank', value: stats?.totalQuestions || 0, icon: '❓', color: 'from-pink-500 to-rose-500', sub: 'Across all domains' },
                    ].map((s, i) => (
                        <div key={i} className="glass-card p-6">
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-2xl mb-4 shadow-lg`}>{s.icon}</div>
                            <p className="text-3xl font-black role-text-primary mb-0.5">{Number(s.value).toLocaleString()}</p>
                            <p className="role-text-muted text-sm font-semibold">{s.label}</p>
                            <p className="text-[10px] role-text-muted mt-1">{s.sub}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    {/* Enrollment Trend Chart */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-black role-text-primary mb-6 flex items-center gap-3">
                            <span className="w-2 h-5 bg-indigo-500 rounded-full" />
                            Monthly Enrollment Trend
                        </h3>
                        {loading ? <Skeleton className="h-44" /> : enrollmentsByMonth.length > 0 ? (
                            <BarChart
                                data={enrollmentsByMonth.map((m: any) => ({
                                    label: m.month,
                                    value: m.count,
                                    color: 'linear-gradient(180deg, #6366f1, #a855f7)',
                                }))}
                                height={160}
                            />
                        ) : (
                            <div className="h-40 flex items-center justify-center">
                                <p className="role-text-muted italic text-sm">No monthly data yet</p>
                            </div>
                        )}
                    </div>

                    {/* User Distribution */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-black role-text-primary mb-6 flex items-center gap-3">
                            <span className="w-2 h-5 bg-purple-500 rounded-full" />
                            User Distribution by Role
                        </h3>
                        {loading ? <Skeleton className="h-44" /> : (
                            <div className="space-y-5">
                                {roles.length > 0 ? roles.map((r: any, i: number) => {
                                    const total = roles.reduce((s: number, x: any) => s + (x.count || 0), 0)
                                    const pct = total ? Math.round((r.count / total) * 100) : 0
                                    const barColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444']
                                    return (
                                        <div key={r.role}>
                                            <div className="flex justify-between text-sm font-semibold mb-2">
                                                <span className="text-gray-300">{r.role}</span>
                                                <span className="text-gray-400">{r.count} ({pct}%)</span>
                                            </div>
                                            <div className="h-3 bg-[var(--border)] rounded-full overflow-hidden">
                                                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: barColors[i % barColors.length] }} />
                                            </div>
                                        </div>
                                    )
                                }) : <p className="role-text-muted text-sm italic mt-8 text-center">No role data available</p>}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Top Courses */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-black role-text-primary mb-5 flex items-center gap-3">
                            <span className="w-2 h-5 bg-emerald-500 rounded-full" />
                            Most Enrolled Courses
                        </h3>
                        {loading ? (
                            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
                        ) : topCourses.length === 0 ? (
                            <p className="role-text-muted text-sm italic text-center py-8">No course data yet</p>
                        ) : (
                            <div className="space-y-3">
                                {topCourses.slice(0, 6).map((c: any, i: number) => (
                                    <div key={c.id} className="flex items-center gap-3">
                                        <span className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 text-xs font-black flex items-center justify-center flex-shrink-0">{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm role-text-primary font-semibold truncate">{c.title}</p>
                                            <p className="text-[10px] role-text-muted">{c.category}</p>
                                        </div>
                                        <span className="text-sm font-black text-indigo-400 flex-shrink-0">{c.enrollmentCount || 0} enrolled</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Enrollments */}
                    <div className="glass-card p-6">
                        <h3 className="text-lg font-black role-text-primary mb-5 flex items-center gap-3">
                            <span className="w-2 h-5 bg-amber-500 rounded-full" />
                            Recent Enrollments
                        </h3>
                        {loading ? (
                            <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-12" />)}</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="role-data-table w-full">
                                    <thead>
                                        <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                            {['User', 'Course', 'Date'].map(h => (
                                                <th key={h} className="pb-3 text-left text-[10px] font-black role-text-muted uppercase tracking-wider">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {recentEnrollments.slice(0, 8).map((e: any) => (
                                            <tr key={e.id} className="border-b hover:bg-white/5 transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                                <td className="py-2.5 text-sm role-text-primary font-medium">{e.user?.name || '—'}</td>
                                                <td className="py-2.5 text-sm role-text-muted max-w-[120px] truncate">{e.course?.title || '—'}</td>
                                                <td className="py-2.5 text-xs role-text-muted">{e.enrolledAt ? new Date(e.enrolledAt).toLocaleDateString('en-IN') : '—'}</td>
                                            </tr>
                                        ))}
                                        {recentEnrollments.length === 0 && (
                                            <tr><td colSpan={3} className="py-8 text-center role-text-muted text-sm italic">No enrollment records found</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
