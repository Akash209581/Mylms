'use client'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import QuestionPreview from '@/components/question-bank/QuestionPreview'
import { getRoleBasePath } from '@/lib/roleUtils'

const QUESTION_TYPES = [
    { key: 'MCQ', label: 'MCQ', icon: '🔘', desc: 'Multiple Choice', color: '#6366f1' },
    { key: 'FIB', label: 'Fill In Blank', icon: '✏️', desc: 'Fill in the Blanks', color: '#10b981' },
    { key: 'MQ', label: 'Matching', icon: '🔗', desc: 'Match the Pairs', color: '#f59e0b' },
    { key: 'JC', label: 'Jumbled Code', icon: '🔀', desc: 'Re-arrange Statements', color: '#ef4444' },
    { key: 'PQ', label: 'Programming', icon: '💻', desc: 'Code a Solution', color: '#a855f7' },
    { key: 'OP', label: 'Output Prediction', icon: '🎯', desc: 'Predict the Output', color: '#06b6d4' },
]

export default function QuestionBankPage() {
    const router = useRouter()
    const [userRole, setUserRole] = useState<'SUPERADMIN' | 'ADMIN' | 'INSTRUCTOR' | 'QUESTION_CREATOR'>('SUPERADMIN')
    const [questions, setQuestions] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [filterType, setFilterType] = useState('ALL')
    const [filterDiff, setFilterDiff] = useState('ALL')
    const [filterStatus, setFilterStatus] = useState('ALL')
    const [filterDomain, setFilterDomain] = useState('ALL')
    const [domains, setDomains] = useState<any[]>([])
    const [search, setSearch] = useState('')
    const [selectedQuestion, setSelectedQuestion] = useState<any>(null)
    const [showPreview, setShowPreview] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN' && u.role !== 'ADMIN' && u.role !== 'INSTRUCTOR' && u.role !== 'QUESTION_CREATOR') { router.push('/login'); return }
        setUserRole(u.role)

        Promise.all([
            apiFetch(`${API_URL}/question-bank`, { credentials: 'include' }).then(r => r.json()),
            apiFetch(`${API_URL}/question-bank/stats`, { credentials: 'include' }).then(r => r.json()),
            apiFetch(`${API_URL}/domains`, { credentials: 'include' }).then(r => r.json()),
        ]).then(([qs, s, d]) => {
            if (Array.isArray(qs)) setQuestions(qs)
            setStats(s)
            if (Array.isArray(d)) setDomains(d)
        }).catch(() => { }).finally(() => setLoading(false))
    }, [])

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this question?')) return
        try {
            const res = await apiFetch(`${API_URL}/question-bank/${id}`, { method: 'DELETE', credentials: 'include' })
            if (res.ok) {
                setQuestions(prev => prev.filter(q => q.id !== id))
            } else {
                const data = await res.json().catch(() => ({}))
                alert(data.message || 'Failed to delete question')
            }
        } catch (e: any) {
            alert(e.message || 'Failed to delete question')
        }
    }

    const diffColors: Record<string, string> = {
        VERY_EASY: '#10b981', EASY: '#34d399', MEDIUM: '#f59e0b',
        HARD: '#ef4444', VERY_HARD: '#dc2626',
    }

    const filtered = questions.filter(q => {
        const qStatus = q.status || 'APPROVED'
        const matchStatus = userRole === 'QUESTION_CREATOR'
            ? (filterStatus === 'ALL' || qStatus === filterStatus)
            : (qStatus === 'APPROVED')
        const matchType = filterType === 'ALL' || q.type === filterType
        const matchDiff = filterDiff === 'ALL' || q.difficulty === filterDiff
        const matchDomain = filterDomain === 'ALL' || (q.domain || 'Programming Domain') === filterDomain
        const qText = (q.questionText || q.problemStatement || '').toLowerCase()
        const matchSearch = !search || qText.includes(search.toLowerCase()) ||
            (q.topicNames && q.topicNames.toLowerCase().includes(search.toLowerCase())) ||
            (q.targetCompanies && q.targetCompanies.toLowerCase().includes(search.toLowerCase())) ||
            (q.companiesAppeared && q.companiesAppeared.toLowerCase().includes(search.toLowerCase()))
        return matchStatus && matchType && matchDiff && matchDomain && matchSearch && (q.questionText || q.problemStatement) && q.type
    })

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role={userRole} />
            <Navbar title="Question Bank" />
            <main className="page-content">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold role-text-primary mb-1">Question Bank</h1>
                        <p className="role-text-muted">Create and manage all question types for assessments</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => router.push(`${getRoleBasePath(userRole)}/question-bank/bulk-import`)}
                            className="px-5 py-2.5 text-sm flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                            <span>📊</span> Bulk Import
                        </button>
                        <button onClick={() => router.push(`${getRoleBasePath(userRole)}/question-bank/create`)}
                            className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
                            <span>+</span> Add Question
                        </button>
                    </div>
                </div>

                {/* Type Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    {QUESTION_TYPES.map(t => {
                        const count = stats?.byType?.find((b: any) => b.type === t.key)?.count ?? 0
                        const isSelected = filterType === t.key
                        return (
                            <div key={t.key} onClick={() => setFilterType(isSelected ? 'ALL' : t.key)}
                                className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-105 border ${
                                    isSelected ? 'scale-105 shadow-md' : 'shadow-sm hover:border-slate-300'
                                }`}
                                style={{
                                    background: isSelected ? `${t.color}15` : '#ffffff',
                                    borderColor: isSelected ? t.color : '#e2e8f0'
                                }}>
                                <div className="text-2xl mb-2">{t.icon}</div>
                                <p className="text-slate-900 font-semibold text-sm">{t.label}</p>
                                <p className="text-slate-500 text-xs mb-2 font-medium">{t.desc}</p>
                                <p className="text-2xl font-bold" style={{ color: t.color }}>{count}</p>
                            </div>
                        )
                    })}
                </div>

                {/* Filters */}
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* Difficulty filters */}
                        <div className="flex gap-2 flex-wrap items-center">
                            <span className="text-xs font-semibold text-slate-500 mr-1">Difficulty:</span>
                            {['ALL', 'VERY_EASY', 'EASY', 'MEDIUM', 'HARD', 'VERY_HARD'].map(d => (
                                <button key={d} onClick={() => setFilterDiff(d)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        filterDiff === d ? 'text-white shadow-sm scale-105' : 'text-slate-700 bg-white hover:text-slate-900 border border-slate-200'
                                    }`}
                                    style={{
                                        background: filterDiff === d ? (diffColors[d] || '#6366f1') : '#ffffff',
                                        borderColor: filterDiff === d ? (diffColors[d] || '#6366f1') : '#e2e8f0'
                                    }}>
                                    {d.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        {/* Status filters - Only for Question Creator */}
                        {userRole === 'QUESTION_CREATOR' && (
                            <div className="flex gap-2 flex-wrap items-center">
                                <span className="text-xs font-semibold text-slate-500 mr-1">Status:</span>
                                {[
                                    { key: 'ALL', label: 'All Statuses' },
                                    { key: 'DRAFT', label: '📝 Draft' },
                                    { key: 'PENDING_APPROVAL', label: '⏳ Pending' },
                                    { key: 'APPROVED', label: '✅ Approved' },
                                    { key: 'REJECTED', label: '❌ Rejected' },
                                ].map(st => (
                                    <button key={st.key} onClick={() => setFilterStatus(st.key)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                            filterStatus === st.key ? 'text-white shadow-sm scale-105' : 'text-slate-700 bg-white hover:text-slate-900 border border-slate-200'
                                        }`}
                                        style={{
                                            background: filterStatus === st.key ? '#6366f1' : '#ffffff',
                                            borderColor: filterStatus === st.key ? '#6366f1' : '#e2e8f0'
                                        }}>
                                        {st.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <select value={filterDomain} onChange={e => setFilterDomain(e.target.value)}
                            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all min-w-[160px] shadow-sm">
                            <option value="ALL" className="bg-white text-slate-900">All Domains</option>
                            <option value="Programming Domain" className="bg-white text-slate-900">Programming Domain</option>
                            {domains.filter(d => d.name !== 'Programming Domain').map(d => (
                                <option key={d.id} value={d.name} className="bg-white text-slate-900">{d.name}</option>
                            ))}
                        </select>
                        <div className="flex-1 relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input type="text" placeholder="Search by topic or question title..." value={search}
                                onChange={e => setSearch(e.target.value)} className="input-field pl-10 h-full bg-white text-slate-900 placeholder:text-slate-400 border border-slate-200" />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="glass-card p-6">
                    <p className="role-text-muted text-sm mb-5">{filtered.length} question{filtered.length !== 1 ? 's' : ''} found</p>
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-5xl mb-3">📋</div>
                            <p className="role-text-muted">No questions yet. Click "Add Question" to create your first one.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="role-data-table w-full">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                        {['#', 'Q. Number', 'Domain', 'Type', 'Topic', 'Companies', 'Difficulty', 'Status', 'Question Title', 'Actions'].map(h => (
                                            <th key={h} className="text-left text-xs font-semibold role-text-muted pb-3 pr-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((q: any, i: number) => {
                                        const qType = QUESTION_TYPES.find(t => t.key === q.type)
                                        const targetComps = q.targetCompanies || ''
                                        const appearedComps = q.companiesAppeared || ''
                                        const status = q.status || 'APPROVED'
                                        return (
                                            <tr key={q.id} className="border-b hover:bg-[var(--bg-surface)]/5 transition-colors"
                                                style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                                <td className="py-4 pr-4 text-[var(--text-secondary)] text-sm">{i + 1}</td>
                                                <td className="py-4 pr-4">
                                                    <span className="text-xs font-mono font-semibold role-text-accent">{q.questionNumber}</span>
                                                </td>
                                                <td className="py-4 pr-4">
                                                    <span className="text-xs font-semibold role-text-secondary">{q.domain || 'Programming Domain'}</span>
                                                </td>
                                                <td className="py-4 pr-4">
                                                    <span className="px-2 py-1 rounded-lg text-xs font-semibold"
                                                        style={{ background: `${qType?.color}25`, color: qType?.color }}>
                                                        {qType?.icon} {q.type}
                                                    </span>
                                                </td>
                                                <td className="py-4 pr-4 role-text-secondary text-sm">{q.topicNames}</td>
                                                <td className="py-4 pr-4 max-w-[180px]">
                                                    {(targetComps || appearedComps) ? (
                                                        <div className="flex flex-col gap-1">
                                                            {targetComps && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {targetComps.split(',').slice(0, 2).map((c: string) => (
                                                                        <span key={c} className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-medium truncate" title={`Target: ${c.trim()}`}>
                                                                            🏢 {c.trim()}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {appearedComps && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {appearedComps.split(',').slice(0, 2).map((c: string) => (
                                                                        <span key={c} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-medium truncate" title={`Appeared: ${c.trim()}`}>
                                                                            🏛️ {c.trim()}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-500">—</span>
                                                    )}
                                                </td>
                                                <td className="py-4 pr-4">
                                                    <span className="px-2 py-1 rounded-lg text-xs font-semibold"
                                                        style={{ background: `${diffColors[q.difficulty] || '#6366f1'}20`, color: diffColors[q.difficulty] || '#6366f1' }}>
                                                        {q.difficulty?.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-4 pr-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                                                        status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                                                        status === 'PENDING_APPROVAL' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse' :
                                                        status === 'DRAFT' ? 'bg-slate-500/15 text-slate-400 border border-slate-500/30' :
                                                        'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                                    }`}>
                                                        {status === 'PENDING_APPROVAL' ? '⏳ PENDING' : status === 'APPROVED' ? '✅ APPROVED' : status === 'DRAFT' ? '📝 DRAFT' : '❌ REJECTED'}
                                                    </span>
                                                </td>
                                                <td className="py-4 pr-4 role-text-secondary text-sm max-w-sm">
                                                    <p className="font-medium line-clamp-2">{q.questionText || q.problemStatement}</p>
                                                    {status === 'REJECTED' && q.rejectionReason && (
                                                        <div className="mt-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                                                            <strong className="text-rose-400">⚠️ Super Admin Feedback: </strong>
                                                            <span>{q.rejectionReason}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => { setSelectedQuestion(q); setShowPreview(true) }}
                                                            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all">
                                                            Preview
                                                        </button>
                                                        {/* Creator can only edit before approval */}
                                                        {userRole === 'QUESTION_CREATOR' ? (
                                                            status !== 'APPROVED' && (
                                                                <button onClick={() => router.push(`${getRoleBasePath(userRole)}/question-bank/${q.id}/edit`)}
                                                                    className="px-2.5 py-1 rounded-lg text-xs font-medium"
                                                                    style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                                                                    Edit
                                                                </button>
                                                            )
                                                        ) : (
                                                            <button onClick={() => router.push(`${getRoleBasePath(userRole)}/question-bank/${q.id}/edit`)}
                                                                className="px-2.5 py-1 rounded-lg text-xs font-medium"
                                                                style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                                                                Edit
                                                            </button>
                                                        )}
                                                        {/* Creator can only delete unapproved questions */}
                                                        {userRole === 'QUESTION_CREATOR' ? (
                                                            status !== 'APPROVED' && (
                                                                <button onClick={() => handleDelete(q.id)}
                                                                    className="px-2.5 py-1 rounded-lg text-xs font-medium"
                                                                    style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                                                                    Del
                                                                </button>
                                                            )
                                                        ) : (
                                                            <button onClick={() => handleDelete(q.id)}
                                                                className="px-2.5 py-1 rounded-lg text-xs font-medium"
                                                                style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                                                                Del
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {showPreview && selectedQuestion && (
                <QuestionPreview form={selectedQuestion} onClose={() => setShowPreview(false)} />
            )}
        </div>
    )
}
