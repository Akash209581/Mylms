'use client'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import QuestionPreview from '@/components/question-bank/QuestionPreview'
import { getRoleBasePath, hasRole } from '@/lib/roleUtils'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

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
    const [page, setPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)

    useEffect(() => {
        setPage(1)
    }, [filterStatus, filterType, filterDiff, filterDomain, search])

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (!hasRole(u, 'SUPERADMIN') && !hasRole(u, 'ADMIN') && !hasRole(u, 'INSTRUCTOR') && !hasRole(u, 'QUESTION_CREATOR')) { router.push('/login'); return }
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
            (q.targetRoles && q.targetRoles.toLowerCase().includes(search.toLowerCase())) ||
            (q.companiesAppeared && q.companiesAppeared.toLowerCase().includes(search.toLowerCase()))
        return matchStatus && matchType && matchDiff && matchDomain && matchSearch && (q.questionText || q.problemStatement) && q.type
    })

    const totalItems = filtered.length
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
    const currentPage = Math.min(page, totalPages)
    const paginatedQuestions = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

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
                            className="ui-btn ui-btn-secondary">
                            Bulk import
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
                        <>
                            <div className="overflow-x-auto">
                            <table className="role-data-table w-full">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                        {['#', 'Q. Number', 'Domain', 'Type', 'Topic', 'Companies / Roles', 'Difficulty', 'Status', 'Question Title', 'Likes', 'Actions'].map(h => (
                                            <th key={h} className="text-left text-xs font-semibold role-text-muted pb-3 pr-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedQuestions.map((q: any, i: number) => {
                                        const qType = QUESTION_TYPES.find(t => t.key === q.type)
                                        const targetComps = q.targetCompanies || ''
                                        const targetRoles = q.targetRoles || ''
                                        const appearedComps = q.companiesAppeared || ''
                                        const status = q.status || 'APPROVED'
                                        const rowNumber = (currentPage - 1) * pageSize + i + 1
                                        return (
                                            <tr key={q.id} className="border-b hover:bg-[var(--bg-surface)]/5 transition-colors"
                                                style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                                <td className="py-4 pr-4 text-[var(--text-secondary)] text-sm">{rowNumber}</td>
                                                <td className="py-4 pr-4" title={q.questionNumber ? `Question Number: ${q.questionNumber}` : 'Unassigned Question Number'}>
                                                    {q.questionNumber ? (
                                                        <span className="text-xs font-mono font-semibold role-text-accent">{q.questionNumber}</span>
                                                    ) : (
                                                        <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 whitespace-nowrap">⏳ Unassigned</span>
                                                    )}
                                                </td>
                                                <td className="py-4 pr-4" title={`Domain: ${q.domain || 'Programming Domain'}`}>
                                                    <span className="text-xs font-semibold role-text-secondary">{q.domain || 'Programming Domain'}</span>
                                                </td>
                                                <td className="py-4 pr-4" title={`Type: ${qType?.label || q.type}`}>
                                                    <span className="px-2 py-1 rounded-lg text-xs font-semibold"
                                                        style={{ background: `${qType?.color}25`, color: qType?.color }}>
                                                        {qType?.icon} {q.type}
                                                    </span>
                                                </td>
                                                <td className="py-4 pr-4 role-text-secondary text-sm" title={`Topic: ${q.topicNames}`}>
                                                    <span className="truncate block max-w-[150px]" title={q.topicNames}>{q.topicNames}</span>
                                                </td>
                                                <td className="py-4 pr-4 min-w-[190px] max-w-[260px] relative group/comps"
                                                    title={`Companies/Roles: ${[
                                                        targetComps ? `Target: ${targetComps}` : '',
                                                        appearedComps ? `Appeared: ${appearedComps}` : '',
                                                        targetRoles ? `Roles: ${targetRoles}` : ''
                                                    ].filter(Boolean).join(' | ')}`}
                                                >
                                                    {(targetRoles || targetComps || appearedComps) ? (() => {
                                                        const targetCompsList = targetComps ? targetComps.split(',').map((c: string) => c.trim()).filter(Boolean) : []
                                                        const appearedCompsList = appearedComps ? appearedComps.split(',').map((c: string) => c.trim()).filter(Boolean) : []
                                                        const targetRolesList = targetRoles ? targetRoles.split(',').map((r: string) => r.trim()).filter(Boolean) : []

                                                        const allCompsCount = targetCompsList.length + appearedCompsList.length
                                                        const visibleTarget = targetCompsList.slice(0, 2)
                                                        const remainingTarget = targetCompsList.length - visibleTarget.length
                                                        const visibleAppeared = appearedCompsList.slice(0, 1)
                                                        const remainingAppeared = appearedCompsList.length - visibleAppeared.length
                                                        const totalRemaining = remainingTarget + remainingAppeared
                                                        const isNearTop = i < 2

                                                        return (
                                                            <div className="relative">
                                                                <div className="flex flex-col gap-1.5">
                                                                    {targetRolesList.length > 0 && (
                                                                        <div className="flex flex-wrap items-center gap-1">
                                                                            {targetRolesList.slice(0, 1).map((r: string) => (
                                                                                <span key={r} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs font-semibold shadow-xs" title={`Role: ${r}`}>
                                                                                    🎯 {r}
                                                                                </span>
                                                                            ))}
                                                                            {targetRolesList.length > 1 && (
                                                                                <span className="inline-flex items-center px-1.5 py-1 rounded-md bg-slate-800 text-purple-300 border border-purple-500/30 text-[11px] font-bold shadow-xs" title={`+${targetRolesList.length - 1} more roles`}>
                                                                                    +{targetRolesList.length - 1}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                                        {visibleTarget.map((c: string) => (
                                                                            <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 text-xs font-semibold shadow-xs" title={`Target Company: ${c}`}>
                                                                                🏢 {c}
                                                                            </span>
                                                                        ))}
                                                                        {visibleAppeared.map((c: string) => (
                                                                            <span key={c} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-semibold shadow-xs" title={`Appeared Company: ${c}`}>
                                                                                🏛️ {c}
                                                                            </span>
                                                                        ))}
                                                                        {totalRemaining > 0 && (
                                                                            <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold shadow-xs hover:bg-slate-700 transition-colors cursor-pointer" title={`Hover to see all ${allCompsCount} companies`}>
                                                                                +{totalRemaining} more
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {/* Hovered Popup Tooltip showing full company tags */}
                                                                <div className={`absolute left-0 ${isNearTop ? 'top-full mt-2' : 'bottom-full mb-2'} z-50 hidden group-hover/comps:flex flex-col gap-2 p-3 bg-slate-900/95 border border-slate-700 rounded-xl shadow-2xl backdrop-blur-md min-w-[220px] max-w-sm pointer-events-none transition-all`}>
                                                                    {targetCompsList.length > 0 && (
                                                                        <div>
                                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-1.5">Target Companies ({targetCompsList.length})</p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {targetCompsList.map((c: string, idx: number) => (
                                                                                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-200 border border-blue-500/40 text-xs font-medium">
                                                                                        🏢 {c}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {appearedCompsList.length > 0 && (
                                                                        <div>
                                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1.5">Appeared In ({appearedCompsList.length})</p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {appearedCompsList.map((c: string, idx: number) => (
                                                                                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-500/40 text-xs font-medium">
                                                                                        🏛️ {c}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {targetRolesList.length > 0 && (
                                                                        <div>
                                                                            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-400 mb-1.5">Target Roles ({targetRolesList.length})</p>
                                                                            <div className="flex flex-wrap gap-1">
                                                                                {targetRolesList.map((r: string, idx: number) => (
                                                                                    <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-200 border border-purple-500/40 text-xs font-medium">
                                                                                        🎯 {r}
                                                                                    </span>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    })() : (
                                                        <span className="text-xs text-slate-500">—</span>
                                                    )}
                                                </td>
                                                <td className="py-4 pr-4" title={`Difficulty: ${q.difficulty?.replace('_', ' ')}`}>
                                                    <span className="px-2 py-1 rounded-lg text-xs font-semibold"
                                                        style={{ background: `${diffColors[q.difficulty] || '#6366f1'}20`, color: diffColors[q.difficulty] || '#6366f1' }}>
                                                        {q.difficulty?.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-4 pr-4" title={`Status: ${status}`}>
                                                    <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                                                        status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' :
                                                        status === 'PENDING_APPROVAL' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse' :
                                                        status === 'DRAFT' ? 'bg-slate-500/15 text-slate-400 border border-slate-500/30' :
                                                        'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                                                    }`}>
                                                        {status === 'PENDING_APPROVAL' ? '⏳ PENDING' : status === 'APPROVED' ? '✅ APPROVED' : status === 'DRAFT' ? '📝 DRAFT' : '❌ REJECTED'}
                                                    </span>
                                                </td>
                                                <td className="py-4 pr-4 role-text-secondary text-sm max-w-sm" title={q.questionText || q.problemStatement}>
                                                    <p className="font-medium line-clamp-2" title={q.questionText || q.problemStatement}>{q.questionText || q.problemStatement}</p>
                                                    {status === 'REJECTED' && q.rejectionReason && (
                                                        <div className="mt-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                                                            <strong className="text-rose-400">⚠️ Super Admin Feedback: </strong>
                                                            <span>{q.rejectionReason}</span>
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 pr-4">
                                                    <button
                                                        type="button"
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                const res = await apiFetch(`${API_URL}/question-bank/${q.id}/like`, {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    credentials: 'include',
                                                                });
                                                                if (res.ok) {
                                                                    const data = await res.json();
                                                                    setQuestions(prev => prev.map(item => item.id === q.id ? { ...item, likesCount: data.likesCount } : item));
                                                                }
                                                            } catch (err) {
                                                                console.warn('Like failed:', err);
                                                            }
                                                        }}
                                                        className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all flex items-center gap-1.5"
                                                        title="Click to like this question"
                                                    >
                                                        <span>👍</span>
                                                        <span>{q.likesCount || 0}</span>
                                                    </button>
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

                        {/* Pagination Toolbar */}
                        {filtered.length > 0 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 mt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                <div className="flex items-center gap-3 text-xs role-text-secondary">
                                    <span>
                                        Showing <strong className="role-text-primary font-bold">{(currentPage - 1) * pageSize + 1}</strong> to{' '}
                                        <strong className="role-text-primary font-bold">{Math.min(currentPage * pageSize, totalItems)}</strong> of{' '}
                                        <strong className="role-text-primary font-bold">{totalItems}</strong> questions
                                    </span>
                                    <div className="flex items-center gap-1.5 ml-2">
                                        <span>Per page:</span>
                                        <select
                                            value={pageSize}
                                            onChange={(e) => {
                                                setPageSize(Number(e.target.value))
                                                setPage(1)
                                            }}
                                            className="px-2 py-1 rounded-md text-xs font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                        >
                                            <option value={10}>10</option>
                                            <option value={20}>20</option>
                                            <option value={50}>50</option>
                                            <option value={100}>100</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => setPage(1)}
                                        disabled={currentPage <= 1}
                                        className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        title="First Page"
                                    >
                                        <ChevronsLeft size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage <= 1}
                                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-xs font-medium"
                                        title="Previous Page"
                                    >
                                        <ChevronLeft size={16} />
                                        <span>Prev</span>
                                    </button>

                                    {/* Page number buttons */}
                                    <div className="flex items-center gap-1 px-1">
                                        {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                                            .filter(pNum => {
                                                if (totalPages <= 7) return true
                                                if (pNum === 1 || pNum === totalPages) return true
                                                return Math.abs(pNum - currentPage) <= 1
                                            })
                                            .reduce<(number | string)[]>((acc, pNum, idx, arr) => {
                                                if (idx > 0 && pNum - (arr[idx - 1] as number) > 1) {
                                                    acc.push('...')
                                                }
                                                acc.push(pNum)
                                                return acc
                                            }, [])
                                            .map((item, idx) => {
                                                if (item === '...') {
                                                    return (
                                                        <span key={`ellipsis-${idx}`} className="px-2 text-xs role-text-muted">
                                                            ...
                                                        </span>
                                                    )
                                                }
                                                const isCurrent = item === currentPage
                                                return (
                                                    <button
                                                        key={`page-${item}`}
                                                        type="button"
                                                        onClick={() => setPage(Number(item))}
                                                        className={`min-w-[32px] h-8 px-2 rounded-lg text-xs font-bold transition-all ${
                                                            isCurrent
                                                                ? 'bg-indigo-600 text-white shadow-sm'
                                                                : 'border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                        }`}
                                                    >
                                                        {item}
                                                    </button>
                                                )
                                            })}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage >= totalPages}
                                        className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 text-xs font-medium"
                                        title="Next Page"
                                    >
                                        <span>Next</span>
                                        <ChevronRight size={16} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPage(totalPages)}
                                        disabled={currentPage >= totalPages}
                                        className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                        title="Last Page"
                                    >
                                        <ChevronsRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                        </>
                    )}
                </div>
            </main>

            {showPreview && selectedQuestion && (
                <QuestionPreview form={selectedQuestion} onClose={() => setShowPreview(false)} />
            )}
        </div>
    )
}
