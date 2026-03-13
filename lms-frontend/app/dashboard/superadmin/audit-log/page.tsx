'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

const ACTION_COLORS: Record<string, { bg: string; color: string; icon: string }> = {
    USER_SUSPENDED: { bg: 'rgba(239,68,68,0.15)', color: '#fca5a5', icon: '🔒' },
    USER_ACTIVATED: { bg: 'rgba(16,185,129,0.15)', color: '#6ee7b7', icon: '✅' },
    USER_DELETED: { bg: 'rgba(239,68,68,0.2)', color: '#f87171', icon: '🗑️' },
    ROLE_CHANGED: { bg: 'rgba(99,102,241,0.15)', color: '#a5b4fc', icon: '🔄' },
    COURSE_DELETED: { bg: 'rgba(239,68,68,0.15)', color: '#fca5a5', icon: '🗑️' },
    COURSE_STATUS_FORCED: { bg: 'rgba(245,158,11,0.15)', color: '#fcd34d', icon: '⚡' },
}

export default function AuditLogPage() {
    const router = useRouter()
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [totalPages, setTotalPages] = useState(1)
    const [actionFilter, setActionFilter] = useState('')
    const LIMIT = 20

    const fetchLogs = useCallback(async (p = page, action = actionFilter) => {
        setLoading(true)
        const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) })
        if (action) params.set('action', action)
        const res = await fetch(`${API}/superadmin/audit-log?${params}`, { credentials: 'include' })
        const data = await res.json()
        setLogs(Array.isArray(data.data) ? data.data : [])
        setTotal(data.total ?? 0)
        setTotalPages(data.totalPages ?? 1)
        setLoading(false)
    }, [page, actionFilter])

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN') { router.push('/login'); return }
        fetchLogs(1, '')
    }, [])

    useEffect(() => { fetchLogs(page, actionFilter) }, [page])
    useEffect(() => { setPage(1); fetchLogs(1, actionFilter) }, [actionFilter])

    const actions = ['', 'USER_SUSPENDED', 'USER_ACTIVATED', 'USER_DELETED', 'ROLE_CHANGED', 'COURSE_DELETED', 'COURSE_STATUS_FORCED']

    const getDetails = (log: any) => {
        try {
            if (!log.details) return null
            return JSON.parse(log.details)
        } catch { return null }
    }

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="SUPERADMIN" />
            <Navbar title="Audit Log" />
            <main className="page-content">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-1">Audit Trail</h1>
                    <p className="text-gray-400">Complete history of all admin and super admin actions — {total} total events</p>
                </div>

                {/* Filter */}
                <div className="flex gap-3 flex-wrap mb-6">
                    <button onClick={() => setActionFilter('')}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${actionFilter === '' ? 'btn-primary' : 'btn-secondary'}`}>
                        All Actions
                    </button>
                    {actions.slice(1).map(a => {
                        const cfg = ACTION_COLORS[a]
                        return (
                            <button key={a} onClick={() => setActionFilter(a)}
                                className="px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105"
                                style={actionFilter === a
                                    ? { background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}50` }
                                    : { background: 'rgba(255,255,255,0.05)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.1)' }}>
                                {cfg?.icon} {a.replace(/_/g, ' ')}
                            </button>
                        )
                    })}
                </div>

                {/* Log Table */}
                <div className="glass-card p-6">
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="text-6xl mb-4">📋</div>
                            <p className="text-white font-semibold text-lg mb-1">No audit events yet</p>
                            <p className="text-gray-400 text-sm">Actions taken by admins will appear here</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                            {['Time', 'Actor', 'Action', 'Target', 'Details'].map(h => (
                                                <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map(log => {
                                            const cfg = ACTION_COLORS[log.action] || { bg: 'rgba(99,102,241,0.1)', color: '#a5b4fc', icon: '•' }
                                            const details = getDetails(log)
                                            return (
                                                <tr key={log.id} className="border-b transition-colors hover:bg-[var(--bg-surface)]/5"
                                                    style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                                    <td className="py-4 pr-4 text-[var(--text-secondary)] text-xs whitespace-nowrap">
                                                        {new Date(log.createdAt).toLocaleString()}
                                                    </td>
                                                    <td className="py-4 pr-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs text-white font-bold flex-shrink-0"
                                                                style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
                                                                {log.actorName?.charAt(0)?.toUpperCase() || '?'}
                                                            </div>
                                                            <div>
                                                                <p className="text-white text-sm font-medium">{log.actorName || 'Unknown'}</p>
                                                                <p className="text-[var(--text-secondary)] text-xs">{log.actorRole}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 pr-4">
                                                        <span className="px-2 py-1 rounded-lg text-xs font-semibold"
                                                            style={{ background: cfg.bg, color: cfg.color }}>
                                                            {cfg.icon} {log.action.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 pr-4">
                                                        <p className="text-white text-sm">{log.targetName || '—'}</p>
                                                        <p className="text-[var(--text-secondary)] text-xs">{log.targetType} #{log.targetId}</p>
                                                    </td>
                                                    <td className="py-4 text-gray-400 text-xs max-w-[200px]">
                                                        {details ? (
                                                            <div className="space-y-0.5">
                                                                {Object.entries(details).map(([k, v]) => (
                                                                    <div key={k}><span className="text-[var(--text-secondary)]">{k}:</span> {String(v)}</div>
                                                                ))}
                                                            </div>
                                                        ) : '—'}
                                                    </td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-3 mt-6 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                    <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                                        className="px-4 py-2 rounded-lg text-sm font-medium btn-secondary disabled:opacity-40">← Prev</button>
                                    <span className="text-gray-400 text-sm">Page {page} of {totalPages}</span>
                                    <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                                        className="px-4 py-2 rounded-lg text-sm font-medium btn-secondary disabled:opacity-40">Next →</button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    )
}
