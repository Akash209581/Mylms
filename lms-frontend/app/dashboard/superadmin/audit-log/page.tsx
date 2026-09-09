'use client'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { getAuthHeaders } from '@/lib/authHeaders'

interface AuditEntry {
    id: number
    action: string
    entityType: string
    entityId?: number
    details?: string
    performedBy: { name: string; email: string; role: string }
    createdAt: string
}

const Skeleton = ({ className = '' }: { className?: string }) => (
    <div className={`bg-[var(--bg-raised)] animate-pulse rounded-2xl ${className}`} />
)

const actionColors: Record<string, string> = {
    CREATE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    UPDATE: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    DELETE: 'bg-red-500/10 text-red-400 border-red-500/20',
    ASSIGN: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    LOGIN: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    APPROVE: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    REJECT: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
}

export default function AuditLogPage() {
    const router = useRouter()
    const [logs, setLogs] = useState<AuditEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [filterAction, setFilterAction] = useState('')
    const [filterRole, setFilterRole] = useState('')
    const [search, setSearch] = useState('')
    const [page, setPage] = useState(1)
    const PAGE_SIZE = 20

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN') { router.push('/login'); return }

        const headers = getAuthHeaders()
        const apiBase = API_URL

        apiFetch(`${apiBase}/superadmin/audit-log`, { headers })
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) setLogs(data)
            })
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])

    const filtered = logs.filter(l => {
        if (filterAction && l.action !== filterAction) return false
        if (filterRole && l.performedBy?.role !== filterRole) return false
        if (search && !l.performedBy?.name?.toLowerCase().includes(search.toLowerCase()) &&
            !l.entityType?.toLowerCase().includes(search.toLowerCase()) &&
            !l.details?.toLowerCase().includes(search.toLowerCase())) return false
        return true
    })

    const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
    const uniqueActions = Array.from(new Set(logs.map(l => l.action).filter(Boolean)))
    const uniqueRoles = Array.from(new Set(logs.map(l => l.performedBy?.role).filter(Boolean)))

    return (
        <div className="min-h-screen bg-[var(--bg-base)]">
            <Sidebar role="SUPERADMIN" />
            <Navbar title="Audit Log" />
            <main className="page-content pt-24 pb-12">

                <div className="mb-8">
                    <h1 className="text-3xl font-black text-[var(--text-primary)] mb-1">Audit Log</h1>
                    <p className="text-[var(--text-secondary)]">Complete history of all admin actions on the platform</p>
                </div>

                {/* Filters */}
                <div className="glass-card p-5 mb-6 flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[200px]">
                        <input
                            type="text"
                            placeholder="Search by user, entity, or details..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1) }}
                            className="input-field py-2.5 w-full"
                        />
                    </div>
                    <select
                        value={filterAction}
                        onChange={e => { setFilterAction(e.target.value); setPage(1) }}
                        className="input-field py-2.5 w-40"
                    >
                        <option value="">All Actions</option>
                        {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select
                        value={filterRole}
                        onChange={e => { setFilterRole(e.target.value); setPage(1) }}
                        className="input-field py-2.5 w-40"
                    >
                        <option value="">All Roles</option>
                        {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <div className="text-sm text-[var(--text-muted)] font-semibold">
                        {filtered.length} records
                    </div>
                </div>

                {/* Log Table */}
                <div className="glass-card p-6">
                    {loading ? (
                        <div className="space-y-3">
                            {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16" />)}
                        </div>
                    ) : paginated.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">📋</div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No audit logs found</h3>
                            <p className="text-[var(--text-secondary)]">Admin actions will appear here as they occur</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="role-data-table w-full">
                                    <thead>
                                        <tr className="border-b border-[var(--border)]">
                                            {['Action', 'Entity', 'Performed By', 'Role', 'Details', 'Time'].map(h => (
                                                <th key={h} className="text-left pb-3 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest pr-4">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border)]">
                                        {paginated.map(log => (
                                            <tr key={log.id} className="hover:bg-[var(--bg-raised)] transition-colors">
                                                <td className="py-3 pr-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${actionColors[log.action] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                                                        {log.action}
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-4 text-sm font-semibold text-[var(--text-primary)]">
                                                    {log.entityType}
                                                    {log.entityId && <span className="text-[var(--text-muted)] ml-1">#{log.entityId}</span>}
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <p className="text-sm font-semibold text-[var(--text-primary)]">{log.performedBy?.name || '—'}</p>
                                                    <p className="text-[10px] text-[var(--text-muted)]">{log.performedBy?.email}</p>
                                                </td>
                                                <td className="py-3 pr-4">
                                                    <span className="text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-lg border border-indigo-500/20">
                                                        {log.performedBy?.role}
                                                    </span>
                                                </td>
                                                <td className="py-3 pr-4 text-sm text-[var(--text-secondary)] max-w-[200px] truncate" title={log.details}>
                                                    {log.details || '—'}
                                                </td>
                                                <td className="py-3 text-sm text-[var(--text-muted)] whitespace-nowrap">
                                                    {new Date(log.createdAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]">
                                    <p className="text-sm text-[var(--text-muted)]">
                                        Page {page} of {totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setPage(p => Math.max(1, p - 1))}
                                            disabled={page === 1}
                                            className="px-4 py-2 rounded-xl bg-[var(--bg-raised)] text-[var(--text-primary)] text-sm font-semibold border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--bg-hover)] transition-all"
                                        >← Prev</button>
                                        <button
                                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                            disabled={page === totalPages}
                                            className="px-4 py-2 rounded-xl bg-[var(--bg-raised)] text-[var(--text-primary)] text-sm font-semibold border border-[var(--border)] disabled:opacity-40 hover:bg-[var(--bg-hover)] transition-all"
                                        >Next →</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>
        </div>
    )
}
