'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

const TYPE_CONFIG: Record<string, { icon: string; color: string; label: string }> = {
    CONTEST: { icon: '🏆', color: '#f59e0b', label: 'Contest' },
    ASSESSMENT: { icon: '📋', color: '#6366f1', label: 'Assessment' },
    TEST: { icon: '📝', color: '#10b981', label: 'Test' },
}
const STATUS_CONFIG: Record<string, { color: string; badge: string }> = {
    DRAFT: { color: '#6b7280', badge: 'badge-instructor' },
    PUBLISHED: { color: '#10b981', badge: 'badge-student' },
    ONGOING: { color: '#f59e0b', badge: 'badge-admin' },
    COMPLETED: { color: '#6366f1', badge: 'badge-superadmin' },
}

export default function ContestManagementPage() {
    const router = useRouter()
    const [contests, setContests] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filterType, setFilterType] = useState('ALL')
    const [showCreate, setShowCreate] = useState(false)
    const [form, setForm] = useState({ title: '', description: '', type: 'TEST', durationMinutes: 60, totalMarks: 100, passingMarks: 40 })
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN') { router.push('/login'); return }
        loadContests()
    }, [])

    const loadContests = () => {
        setLoading(true)
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/contests`, { credentials: 'include' })
            .then(r => r.json()).then(data => { if (Array.isArray(data)) setContests(data) })
            .catch(() => { }).finally(() => setLoading(false))
    }

    const handleCreate = async () => {
        setSaving(true)
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/contests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(form),
        })
        if (res.ok) { setShowCreate(false); loadContests() }
        setSaving(false)
    }

    const handlePublish = async (id: number) => {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/contests/${id}/publish`, { method: 'PUT', credentials: 'include' })
        loadContests()
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this contest?')) return
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/contests/${id}`, { method: 'DELETE', credentials: 'include' })
        setContests(prev => prev.filter(c => c.id !== id))
    }

    const filtered = contests.filter(c => filterType === 'ALL' || c.type === filterType)
    const counts = {
        ALL: contests.length, CONTEST: contests.filter(c => c.type === 'CONTEST').length,
        ASSESSMENT: contests.filter(c => c.type === 'ASSESSMENT').length, TEST: contests.filter(c => c.type === 'TEST').length
    }

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="SUPERADMIN" />
            <Navbar title="Contests & Assessments" />
            <main className="page-content">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Contest / Assessment / Test</h1>
                        <p className="text-gray-400">Create and manage platform-wide assessments</p>
                    </div>
                    <button onClick={() => setShowCreate(true)} className="btn-primary px-5 py-2.5 text-sm">+ Create New</button>
                </div>

                {/* Type Filter */}
                <div className="flex gap-3 mb-6">
                    {Object.entries(counts).map(([type, count]) => (
                        <button key={type} onClick={() => setFilterType(type)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${filterType === type ? 'btn-primary' : 'btn-secondary'}`}>
                            {type !== 'ALL' && TYPE_CONFIG[type]?.icon} {type}
                            <span className="px-2 py-0.5 rounded-full text-xs" style={{ background: 'rgba(255,255,255,0.15)' }}>{count}</span>
                        </button>
                    ))}
                </div>

                {/* Create Modal */}
                {showCreate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
                        <div className="glass-card p-8 w-full max-w-lg">
                            <h2 className="text-xl font-bold text-white mb-6">Create New</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Title *</label>
                                    <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className="input-field" placeholder="e.g. Arrays Challenge 2024" />
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Type</label>
                                    <div className="flex gap-3">
                                        {['CONTEST', 'ASSESSMENT', 'TEST'].map(t => (
                                            <button key={t} onClick={() => setForm(p => ({ ...p, type: t }))}
                                                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${form.type === t ? 'btn-primary' : 'btn-secondary'}`}>
                                                {TYPE_CONFIG[t].icon} {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Description</label>
                                    <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                        rows={2} className="input-field resize-none" placeholder="Brief description..." />
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="text-gray-400 text-sm mb-2 block">Duration (min)</label>
                                        <input type="number" value={form.durationMinutes} onChange={e => setForm(p => ({ ...p, durationMinutes: +e.target.value }))} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-sm mb-2 block">Total Marks</label>
                                        <input type="number" value={form.totalMarks} onChange={e => setForm(p => ({ ...p, totalMarks: +e.target.value }))} className="input-field" />
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-sm mb-2 block">Passing Marks</label>
                                        <input type="number" value={form.passingMarks} onChange={e => setForm(p => ({ ...p, passingMarks: +e.target.value }))} className="input-field" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 mt-6">
                                <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1 py-2.5">Cancel</button>
                                <button onClick={handleCreate} disabled={saving || !form.title} className="btn-primary flex-1 py-2.5 disabled:opacity-50">
                                    {saving ? 'Creating...' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* List */}
                <div className="glass-card p-6">
                    {loading ? (
                        <div className="flex justify-center py-16"><div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-5xl mb-3">🏆</div>
                            <p className="text-gray-400">No contests yet. Create your first one!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filtered.map((c: any) => {
                                const tc = TYPE_CONFIG[c.type] || TYPE_CONFIG.TEST
                                const sc = STATUS_CONFIG[c.status] || STATUS_CONFIG.DRAFT
                                return (
                                    <div key={c.id} className="flex items-center gap-4 p-4 rounded-2xl transition-colors hover:bg-white/5"
                                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                                            style={{ background: `${tc.color}20` }}>{tc.icon}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-white font-semibold truncate">{c.title}</p>
                                                <span className={`badge ${sc.badge}`}>{c.status}</span>
                                            </div>
                                            <p className="text-gray-400 text-xs">{tc.label} · {c.durationMinutes} min · {c.totalMarks} marks (pass: {c.passingMarks})</p>
                                        </div>
                                        <div className="flex gap-2 flex-shrink-0">
                                            {c.status === 'DRAFT' && (
                                                <button onClick={() => handlePublish(c.id)}
                                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                                    style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' }}>
                                                    Publish
                                                </button>
                                            )}
                                            <button onClick={() => handleDelete(c.id)}
                                                className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                                                style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
