'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { API_URL } from '@/lib/api'
import { apiFetch } from '@/lib/apiFetch'
import { getAuthHeaders } from '@/lib/authHeaders'
import QuestionPreview from '@/components/question-bank/QuestionPreview'
import { CheckCircle, XCircle, Eye, AlertCircle, Clock, BookOpen, HelpCircle, UserCheck, Search, Filter, RotateCcw, Trash2, Pencil } from 'lucide-react'

export default function ApprovalsPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'questions' | 'courses'>('questions')
    const [summary, setSummary] = useState<any>({
        pendingQuestions: 0,
        approvedQuestions: 0,
        rejectedQuestions: 0,
        pendingCourses: 0,
        approvedCourses: 0,
        rejectedCourses: 0,
        totalPending: 0,
    })
    const [questions, setQuestions] = useState<any[]>([])
    const [courses, setCourses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<number | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    // Filter states
    const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED'>('PENDING_APPROVAL')
    const [filterType, setFilterType] = useState('ALL')
    const [filterDiff, setFilterDiff] = useState('ALL')
    const [filterDomain, setFilterDomain] = useState('ALL')
    const [filterCreator, setFilterCreator] = useState('ALL')
    const [filterCategory, setFilterCategory] = useState('ALL')
    const [filterLevel, setFilterLevel] = useState('ALL')
    const [filterInstructor, setFilterInstructor] = useState('ALL')

    // Preview state
    const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null)

    // Reject Modal state
    const [rejectTarget, setRejectTarget] = useState<{ type: 'question' | 'course'; id: number; title: string } | null>(null)
    const [rejectReason, setRejectReason] = useState('')

    // Delete Modal state
    const [deleteTarget, setDeleteTarget] = useState<{ id: number; questionNumber?: string; title: string } | null>(null)
    const [expandedCompanies, setExpandedCompanies] = useState<Record<number, boolean>>({})

    const toggleCompanyExpand = (id: number) => {
        setExpandedCompanies(prev => ({ ...prev, [id]: !prev[id] }))
    }

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN' && u.role !== 'ADMIN') { router.push('/login'); return }

        loadData(true)
    }, [])

    const loadData = async (showLoading = false) => {
        if (showLoading) setLoading(true)
        try {
            const [sumRes, qRes, cRes] = await Promise.all([
                apiFetch(`${API_URL}/superadmin/approvals/summary`, { credentials: 'include', headers: getAuthHeaders() }),
                apiFetch(`${API_URL}/superadmin/approvals/questions?status=ALL`, { credentials: 'include', headers: getAuthHeaders() }),
                apiFetch(`${API_URL}/superadmin/approvals/courses?status=ALL`, { credentials: 'include', headers: getAuthHeaders() }),
            ])

            if (sumRes.ok) setSummary(await sumRes.json())
            if (qRes.ok) setQuestions(await qRes.json())
            if (cRes.ok) setCourses(await cRes.json())
        } catch (err) {
            console.error('Failed to load approvals:', err)
        } finally {
            if (showLoading) setLoading(false)
        }
    }

    const refreshSummary = async () => {
        try {
            const sumRes = await apiFetch(`${API_URL}/superadmin/approvals/summary`, { credentials: 'include', headers: getAuthHeaders() })
            if (sumRes.ok) setSummary(await sumRes.json())
        } catch (err) {
            console.error('Failed to refresh summary:', err)
        }
    }

    const handleApproveQuestion = async (id: number) => {
        setActionLoading(id)
        try {
            const res = await apiFetch(`${API_URL}/superadmin/questions/${id}/approve`, {
                method: 'PUT',
                credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            })
            if (res.ok) {
                const data = await res.json().catch(() => ({}))
                setQuestions(prev => prev.map(q => q.id === id ? {
                    ...q,
                    status: 'APPROVED',
                    questionNumber: data.questionNumber || q.questionNumber,
                    rejectionReason: undefined
                } : q))
                refreshSummary()
            }
        } catch (err) {
            console.error('Approval failed:', err)
        } finally {
            setActionLoading(null)
        }
    }

    const handleApproveCourse = async (id: number) => {
        setActionLoading(id)
        try {
            const res = await apiFetch(`${API_URL}/superadmin/courses/${id}/approve`, {
                method: 'PUT',
                credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            })
            if (res.ok) {
                setCourses(prev => prev.map(c => c.id === id ? { ...c, status: 'APPROVED', rejectionReason: null } : c))
                refreshSummary()
            }
        } catch (err) {
            console.error('Approval failed:', err)
        } finally {
            setActionLoading(null)
        }
    }

    const handleConfirmReject = async () => {
        if (!rejectTarget) return
        setActionLoading(rejectTarget.id)
        try {
            const endpoint = rejectTarget.type === 'question'
                ? `${API_URL}/superadmin/questions/${rejectTarget.id}/reject`
                : `${API_URL}/superadmin/courses/${rejectTarget.id}/reject`

            const res = await apiFetch(endpoint, {
                method: 'PUT',
                credentials: 'include',
                headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason: rejectReason }),
            })

            if (res.ok) {
                if (rejectTarget.type === 'question') {
                    setQuestions(prev => prev.map(q => q.id === rejectTarget.id ? { ...q, status: 'REJECTED', rejectionReason: rejectReason } : q))
                } else {
                    setCourses(prev => prev.map(c => c.id === rejectTarget.id ? { ...c, status: 'REJECTED', rejectionReason: rejectReason } : c))
                }
                setRejectTarget(null)
                setRejectReason('')
                refreshSummary()
            }
        } catch (err) {
            console.error('Rejection failed:', err)
        } finally {
            setActionLoading(null)
        }
    }

    const handleDeleteQuestion = async (id: number) => {
        setActionLoading(id)
        try {
            let res = await apiFetch(`${API_URL}/superadmin/questions/${id}`, {
                method: 'DELETE',
                credentials: 'include',
                headers: getAuthHeaders(),
            })

            if (!res.ok && res.status === 404) {
                res = await apiFetch(`${API_URL}/question-bank/${id}`, {
                    method: 'DELETE',
                    credentials: 'include',
                    headers: getAuthHeaders(),
                })
            }

            if (res.ok) {
                setQuestions(prev => prev.filter(q => q.id !== id))
                setDeleteTarget(null)
                refreshSummary()
            } else {
                const data = await res.json().catch(() => ({}))
                alert(data.message || 'Failed to delete question')
            }
        } catch (err: any) {
            console.error('Failed to delete question:', err)
            alert(err?.message || 'Failed to delete question')
        } finally {
            setActionLoading(null)
        }
    }

    const diffColors: Record<string, string> = {
        VERY_EASY: '#10b981', EASY: '#34d399', MEDIUM: '#f59e0b',
        HARD: '#ef4444', VERY_HARD: '#dc2626',
    }

    const QUESTION_TYPES = [
        { key: 'ALL', label: 'All Types' },
        { key: 'MCQ', label: 'MCQ' },
        { key: 'PQ', label: 'Programming' },
        { key: 'FIB', label: 'Fill Blank' },
        { key: 'MQ', label: 'Matching' },
        { key: 'JC', label: 'Jumbled Code' },
        { key: 'OP', label: 'Output Pred.' },
    ]

    // Distinct filter lists
    const uniqueDomains = Array.from(new Set(questions.map(q => q.domain || 'Programming Domain').filter(Boolean)))
    const uniqueCreators = Array.from(new Set(questions.map(q => q.creator?.name).filter(Boolean)))
    const uniqueCategories = Array.from(new Set(courses.map(c => c.category).filter(Boolean)))
    const uniqueInstructors = Array.from(new Set(courses.map(c => c.instructor?.name).filter(Boolean)))

    // Domain stats breakdown
    const domainStats = uniqueDomains.reduce((acc: Record<string, { total: number; pending: number; approved: number; rejected: number }>, d: string) => {
        const total = questions.filter(q => (q.domain || 'Programming Domain') === d).length
        const pending = questions.filter(q => (q.domain || 'Programming Domain') === d && (q.status === 'PENDING_APPROVAL' || !q.status)).length
        const approved = questions.filter(q => (q.domain || 'Programming Domain') === d && q.status === 'APPROVED').length
        const rejected = questions.filter(q => (q.domain || 'Programming Domain') === d && q.status === 'REJECTED').length
        acc[d] = { total, pending, approved, rejected }
        return acc
    }, {})

    // Active counts
    const pendingQuestionsCount = questions.filter(q => q.status === 'PENDING_APPROVAL').length
    const approvedQuestionsCount = questions.filter(q => q.status === 'APPROVED').length
    const rejectedQuestionsCount = questions.filter(q => q.status === 'REJECTED').length

    const pendingCoursesCount = courses.filter(c => c.status === 'PENDING_APPROVAL').length
    const approvedCoursesCount = courses.filter(c => c.status === 'APPROVED').length
    const rejectedCoursesCount = courses.filter(c => c.status === 'REJECTED').length

    const isFiltered = activeTab === 'questions'
        ? (filterStatus !== 'PENDING_APPROVAL' || filterType !== 'ALL' || filterDiff !== 'ALL' || filterDomain !== 'ALL' || filterCreator !== 'ALL' || !!searchQuery.trim())
        : (filterStatus !== 'PENDING_APPROVAL' || filterCategory !== 'ALL' || filterLevel !== 'ALL' || filterInstructor !== 'ALL' || !!searchQuery.trim())

    const handleResetFilters = () => {
        setFilterStatus('PENDING_APPROVAL')
        setFilterType('ALL')
        setFilterDiff('ALL')
        setFilterDomain('ALL')
        setFilterCreator('ALL')
        setFilterCategory('ALL')
        setFilterLevel('ALL')
        setFilterInstructor('ALL')
        setSearchQuery('')
    }

    const filteredQuestions = questions.filter(q => {
        const qStatus = q.status || 'PENDING_APPROVAL'
        const matchStatus = filterStatus === 'ALL' || qStatus === filterStatus
        const matchType = filterType === 'ALL' || q.type === filterType
        const matchDiff = filterDiff === 'ALL' || q.difficulty === filterDiff
        const matchDomain = filterDomain === 'ALL' || (q.domain || 'Programming Domain') === filterDomain
        const matchCreator = filterCreator === 'ALL' || (q.creator?.name === filterCreator)

        if (!matchStatus || !matchType || !matchDiff || !matchDomain || !matchCreator) return false

        if (!searchQuery.trim()) return true
        const text = `${q.questionNumber || ''} ${q.questionText || ''} ${q.topicNames || ''} ${q.domain || ''} ${q.targetCompanies || q.companiesAppeared || ''} ${q.creator?.name || ''} ${q.creator?.email || ''}`.toLowerCase()
        return text.includes(searchQuery.toLowerCase().trim())
    })

    const filteredCourses = courses.filter(c => {
        const cStatus = c.status || 'PENDING_APPROVAL'
        const matchStatus = filterStatus === 'ALL' || cStatus === filterStatus
        const matchCategory = filterCategory === 'ALL' || c.category === filterCategory
        const matchLevel = filterLevel === 'ALL' || c.level === filterLevel
        const matchInstructor = filterInstructor === 'ALL' || (c.instructor?.name === filterInstructor)

        if (!matchStatus || !matchCategory || !matchLevel || !matchInstructor) return false

        if (!searchQuery.trim()) return true
        const text = `${c.title || ''} ${c.category || ''} ${c.description || ''} ${c.instructor?.name || ''} ${c.instructor?.email || ''}`.toLowerCase()
        return text.includes(searchQuery.toLowerCase().trim())
    })

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="SUPERADMIN" />
            <Navbar title="Approvals & QA Center" />

            <main className="page-content">
                {/* Header Title & Summary Cards */}
                <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> Quality Assurance & Moderation
                            </span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Super Admin Approval Hub</h1>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                            Review, verify, approve, and track question bank submissions and curriculum courses authored by creators.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={() => loadData(true)} className="btn-secondary text-xs px-4 py-2 flex items-center gap-2">
                            <span>↻</span> Refresh List
                        </button>
                    </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div
                        onClick={() => { setActiveTab('questions'); setFilterStatus('PENDING_APPROVAL') }}
                        className={`glass-card p-5 cursor-pointer transition-all ${activeTab === 'questions' && filterStatus === 'PENDING_APPROVAL' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'hover:border-amber-500/30'}`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">⏳ Pending Review</span>
                            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400"><Clock className="w-5 h-5" /></span>
                        </div>
                        <div className="text-3xl font-black text-amber-600 dark:text-amber-400 mt-2">
                            {activeTab === 'questions' ? pendingQuestionsCount : pendingCoursesCount}
                        </div>
                        <p className="text-xs text-amber-700/80 dark:text-amber-300/80 mt-1">
                            {activeTab === 'questions' ? `${pendingQuestionsCount} questions awaiting review` : `${pendingCoursesCount} courses awaiting review`}
                        </p>
                    </div>

                    <div
                        onClick={() => setFilterStatus('APPROVED')}
                        className={`glass-card p-5 cursor-pointer transition-all ${filterStatus === 'APPROVED' ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'hover:border-emerald-500/30'}`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">✅ Approved Submissions</span>
                            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"><CheckCircle className="w-5 h-5" /></span>
                        </div>
                        <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                            {activeTab === 'questions' ? approvedQuestionsCount : approvedCoursesCount}
                        </div>
                        <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-1">
                            {activeTab === 'questions' ? `${approvedQuestionsCount} approved questions` : `${approvedCoursesCount} approved courses`}
                        </p>
                    </div>

                    <div
                        onClick={() => setFilterStatus('REJECTED')}
                        className={`glass-card p-5 cursor-pointer transition-all ${filterStatus === 'REJECTED' ? 'border-rose-500 ring-2 ring-rose-500/20' : 'hover:border-rose-500/30'}`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">❌ Rejected Submissions</span>
                            <span className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400"><XCircle className="w-5 h-5" /></span>
                        </div>
                        <div className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">
                            {activeTab === 'questions' ? rejectedQuestionsCount : rejectedCoursesCount}
                        </div>
                        <p className="text-xs text-rose-700/80 dark:text-rose-300/80 mt-1">
                            {activeTab === 'questions' ? `${rejectedQuestionsCount} rejected questions` : `${rejectedCoursesCount} rejected courses`}
                        </p>
                    </div>
                </div>

                {/* Tabs & Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-2xl border border-slate-200 dark:border-white/10 w-full sm:w-auto">
                        <button
                            onClick={() => { setActiveTab('questions'); handleResetFilters() }}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'questions' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            <HelpCircle className="w-4 h-4" />
                            <span>Questions Queue</span>
                            <span className="px-2 py-0.5 rounded-full text-xs bg-white/20">{pendingQuestionsCount}</span>
                        </button>
                        <button
                            onClick={() => { setActiveTab('courses'); handleResetFilters() }}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'courses' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                        >
                            <BookOpen className="w-4 h-4" />
                            <span>Courses Queue</span>
                            <span className="px-2 py-0.5 rounded-full text-xs bg-white/20">{pendingCoursesCount}</span>
                        </button>
                    </div>

                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder={activeTab === 'questions' ? "Search title, topic, company, creator..." : "Search title, category, instructor..."}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="input-field pl-10 text-xs h-10 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10"
                        />
                    </div>
                </div>

                {/* Filter Controls */}
                <div className="glass-card p-4 mb-6 space-y-4">
                    {/* PRIMARY STATUS FILTER ROW */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-white/10">
                        <div className="flex gap-2 flex-wrap items-center">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mr-1 flex items-center gap-1.5">
                                <Filter className="w-4 h-4 text-primary-500" /> Status:
                            </span>
                            {[
                                { key: 'ALL', label: 'All Statuses', count: activeTab === 'questions' ? questions.length : courses.length, color: 'bg-slate-800' },
                                { key: 'PENDING_APPROVAL', label: '⏳ Pending Review', count: activeTab === 'questions' ? pendingQuestionsCount : pendingCoursesCount, color: 'bg-amber-500 text-white' },
                                { key: 'APPROVED', label: '✅ Approved', count: activeTab === 'questions' ? approvedQuestionsCount : approvedCoursesCount, color: 'bg-emerald-600 text-white' },
                                { key: 'REJECTED', label: '❌ Rejected', count: activeTab === 'questions' ? rejectedQuestionsCount : rejectedCoursesCount, color: 'bg-rose-600 text-white' },
                            ].map(st => (
                                <button
                                    key={st.key}
                                    onClick={() => setFilterStatus(st.key as any)}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${filterStatus === st.key
                                            ? `${st.color} shadow-md scale-105`
                                            : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10'
                                        }`}
                                >
                                    <span>{st.label}</span>
                                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${filterStatus === st.key ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-white/10 text-slate-700 dark:text-slate-300'}`}>
                                        {st.count}
                                    </span>
                                </button>
                            ))}
                        </div>

                        {isFiltered && (
                            <button
                                onClick={handleResetFilters}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-500 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition-all flex items-center gap-1.5"
                            >
                                <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
                            </button>
                        )}
                    </div>

                    {activeTab === 'questions' ? (
                        <>
                            {/* Question Type and Difficulty Filters */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex gap-1.5 flex-wrap items-center">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">Type:</span>
                                    {QUESTION_TYPES.map(t => (
                                        <button
                                            key={t.key}
                                            onClick={() => setFilterType(t.key)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filterType === t.key
                                                    ? 'bg-purple-600 text-white shadow-sm scale-105'
                                                    : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10'
                                                }`}
                                        >
                                            {t.label}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex gap-1.5 flex-wrap items-center">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">Difficulty:</span>
                                    {['ALL', 'VERY_EASY', 'EASY', 'MEDIUM', 'HARD', 'VERY_HARD'].map(d => (
                                        <button
                                            key={d}
                                            onClick={() => setFilterDiff(d)}
                                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${filterDiff === d
                                                    ? 'text-white shadow-sm scale-105'
                                                    : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10'
                                                }`}
                                            style={{
                                                background: filterDiff === d ? (diffColors[d] || '#6366f1') : undefined,
                                                borderColor: filterDiff === d ? (diffColors[d] || '#6366f1') : undefined,
                                            }}
                                        >
                                            {d === 'ALL' ? 'All Diff.' : d.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Dropdown Filters */}
                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-white/10">
                                <div className="flex flex-wrap gap-2.5 items-center">
                                    {uniqueDomains.length > 0 && (
                                        <select
                                            value={filterDomain}
                                            onChange={e => setFilterDomain(e.target.value)}
                                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none shadow-sm"
                                        >
                                            <option value="ALL">All Domains ({uniqueDomains.length})</option>
                                            {uniqueDomains.map((d: any) => {
                                                const st = domainStats[d] || { total: 0, pending: 0 }
                                                return (
                                                    <option key={d} value={d}>
                                                        {d} ({st.pending} pending / {st.total} total)
                                                    </option>
                                                )
                                            })}
                                        </select>
                                    )}

                                    {uniqueCreators.length > 0 && (
                                        <select
                                            value={filterCreator}
                                            onChange={e => setFilterCreator(e.target.value)}
                                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none shadow-sm"
                                        >
                                            <option value="ALL">All Authors ({uniqueCreators.length})</option>
                                            {uniqueCreators.map((c: any) => (
                                                <option key={c} value={c}>👤 {c}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    Showing <strong className="text-slate-900 dark:text-white font-bold">{filteredQuestions.length}</strong> of {questions.length} questions
                                </p>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Course Filters */}
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex flex-wrap gap-2.5 items-center">
                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1">Level:</span>
                                    {['ALL', 'Beginner', 'Intermediate', 'Advanced', 'All Levels'].map(lvl => (
                                        <button
                                            key={lvl}
                                            onClick={() => setFilterLevel(lvl)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterLevel === lvl
                                                    ? 'bg-indigo-600 text-white shadow-sm scale-105'
                                                    : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10'
                                                }`}
                                        >
                                            {lvl === 'ALL' ? 'All Levels' : lvl}
                                        </button>
                                    ))}

                                    {uniqueCategories.length > 0 && (
                                        <select
                                            value={filterCategory}
                                            onChange={e => setFilterCategory(e.target.value)}
                                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none ml-2 shadow-sm"
                                        >
                                            <option value="ALL">All Categories ({uniqueCategories.length})</option>
                                            {uniqueCategories.map((cat: any) => (
                                                <option key={cat} value={cat}>{cat}</option>
                                            ))}
                                        </select>
                                    )}

                                    {uniqueInstructors.length > 0 && (
                                        <select
                                            value={filterInstructor}
                                            onChange={e => setFilterInstructor(e.target.value)}
                                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 outline-none shadow-sm"
                                        >
                                            <option value="ALL">All Instructors ({uniqueInstructors.length})</option>
                                            {uniqueInstructors.map((inst: any) => (
                                                <option key={inst} value={inst}>👤 {inst}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>

                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    Showing <strong className="text-slate-900 dark:text-white font-bold">{filteredCourses.length}</strong> of {courses.length} courses
                                </p>
                            </div>
                        </>
                    )}
                </div>

                {/* Domain status banner helper */}
                {activeTab === 'questions' && filterDomain !== 'ALL' && domainStats[filterDomain] && filterStatus === 'PENDING_APPROVAL' && domainStats[filterDomain].pending === 0 && domainStats[filterDomain].total > 0 && (
                    <div className="mb-4 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                        <div className="flex items-center gap-2.5 text-xs text-indigo-800 dark:text-indigo-200">
                            <AlertCircle className="w-5 h-5 shrink-0 text-indigo-500" />
                            <div>
                                <p className="font-bold">No pending questions waiting for review in "{filterDomain}"</p>
                                <p className="text-slate-600 dark:text-slate-400 text-[11px] mt-0.5">
                                    All <strong>{domainStats[filterDomain].total}</strong> questions are already evaluated ({domainStats[filterDomain].approved} Approved, {domainStats[filterDomain].rejected} Rejected).
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setFilterStatus('ALL')}
                            className="px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all whitespace-nowrap self-start sm:self-auto flex items-center gap-1.5"
                        >
                            <Eye className="w-3.5 h-3.5" /> View All {domainStats[filterDomain].total} Questions in Domain
                        </button>
                    </div>
                )}

                {/* Content Table */}
                <div className="glass-card p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
                            <p className="text-slate-500 dark:text-slate-400 text-sm">Loading submissions queue...</p>
                        </div>
                    ) : activeTab === 'questions' ? (
                        filteredQuestions.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto mb-4 border border-amber-500/20 text-2xl">
                                    🔍
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No Questions Found</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto mb-4">
                                    {filterDomain !== 'ALL' && domainStats[filterDomain]?.total > 0
                                        ? `All ${domainStats[filterDomain].total} questions in "${filterDomain}" have already been evaluated (${domainStats[filterDomain].approved} Approved, ${domainStats[filterDomain].rejected} Rejected). There are no pending questions in this domain.`
                                        : filterStatus === 'PENDING_APPROVAL'
                                            ? 'There are no questions currently waiting for review matching the selected filter.'
                                            : `No questions found matching the selected status (${filterStatus}) and filters.`}
                                </p>
                                <div className="flex items-center justify-center gap-2">
                                    {filterDomain !== 'ALL' && domainStats[filterDomain]?.total > 0 && filterStatus !== 'ALL' && (
                                        <button
                                            onClick={() => setFilterStatus('ALL')}
                                            className="btn-primary text-xs px-4 py-2"
                                        >
                                            View All {domainStats[filterDomain].total} Questions in {filterDomain}
                                        </button>
                                    )}
                                    <button
                                        onClick={handleResetFilters}
                                        className="btn-secondary text-xs px-4 py-2"
                                    >
                                        Reset Filters
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="role-data-table w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-white/10 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            <th className="pb-3 pr-4">Code</th>
                                            <th className="pb-3 pr-4">Status</th>
                                            <th className="pb-3 pr-4">Type</th>
                                            <th className="pb-3 pr-4">Question Details</th>
                                            <th className="pb-3 pr-4">Companies</th>
                                            <th className="pb-3 pr-4">Creator / Author</th>
                                            <th className="pb-3 text-right">Moderation Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {filteredQuestions.map((q) => {
                                            const targetComps = q.targetCompanies || ''
                                            const appearedComps = q.companiesAppeared || ''
                                            const hasComps = !!(targetComps || appearedComps)
                                            const status = q.status || 'PENDING_APPROVAL'
                                            return (
                                                <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                                    <td className="py-4 pr-4">
                                                        {q.questionNumber ? (
                                                            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                                                                {q.questionNumber}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 whitespace-nowrap">
                                                                ⏳ Unassigned
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-4 pr-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                                                                status === 'PENDING_APPROVAL' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse' :
                                                                    'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                                            }`}>
                                                            {status === 'APPROVED' ? '✅ Approved' : status === 'PENDING_APPROVAL' ? '⏳ Pending' : '❌ Rejected'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 pr-4">
                                                        <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                                                            {q.type}
                                                        </span>
                                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{q.difficulty?.replace('_', ' ')}</div>
                                                    </td>
                                                    <td className="py-4 pr-4 max-w-sm">
                                                        <p className="text-sm font-semibold text-slate-900 dark:text-white line-clamp-2">{q.questionText}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Topic: <span className="text-slate-700 dark:text-slate-300 font-medium">{q.topicNames}</span> ({q.domain})</p>
                                                        {q.rejectionReason && (
                                                            <div className="mt-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-1.5">
                                                                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                                                <span><strong>Rejection Reason:</strong> {q.rejectionReason}</span>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="py-4 pr-4 min-w-[180px] max-w-xs">
                                                        {hasComps ? (
                                                            <div className="flex flex-col gap-1.5">
                                                                {targetComps && (
                                                                    <div className="flex flex-wrap items-center gap-1">
                                                                        {targetComps.split(',').slice(0, 2).map((c: string, idx: number) => (
                                                                            <span key={idx} className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-medium truncate" title={`Target: ${c.trim()}`}>
                                                                                🏢 {c.trim()}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {appearedComps && (
                                                                    <div className="flex flex-wrap items-center gap-1">
                                                                        {appearedComps.split(',').slice(0, 2).map((c: string, idx: number) => (
                                                                            <span key={idx} className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-medium truncate" title={`Appeared: ${c.trim()}`}>
                                                                                🏛️ {c.trim()}
                                                                        </span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-slate-500">General Practice</span>
                                                        )}
                                                    </td>
                                                    <td className="py-4 pr-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white font-bold">
                                                                {q.creator?.name?.[0] || 'C'}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold text-slate-900 dark:text-white">{q.creator?.name || 'Question Creator'}</p>
                                                                <p className="text-[10px] text-slate-500 dark:text-slate-400">{q.creator?.email || 'creator@appliedstemlabs.com'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => setSelectedQuestion(q)}
                                                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all flex items-center gap-1.5"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" /> Preview
                                                            </button>

                                                            <button
                                                                onClick={() => router.push(`/dashboard/superadmin/question-bank/${q.id}/edit?returnTo=${encodeURIComponent('/dashboard/superadmin/approvals')}`)}
                                                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 transition-all flex items-center gap-1.5"
                                                                title="Edit Question"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" /> Edit
                                                            </button>

                                                            {status !== 'APPROVED' && (
                                                                <button
                                                                    disabled={actionLoading === q.id}
                                                                    onClick={() => handleApproveQuestion(q.id)}
                                                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50"
                                                                >
                                                                    <CheckCircle className="w-3.5 h-3.5" /> {status === 'REJECTED' ? 'Reinstate' : 'Approve'}
                                                                </button>
                                                            )}

                                                            {status !== 'REJECTED' && (
                                                                <button
                                                                    disabled={actionLoading === q.id}
                                                                    onClick={() => setRejectTarget({ type: 'question', id: q.id, title: q.questionText })}
                                                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5" /> {status === 'APPROVED' ? 'Revoke' : 'Reject'}
                                                                </button>
                                                            )}

                                                            {status === 'REJECTED' && (
                                                                <button
                                                                    disabled={actionLoading === q.id}
                                                                    onClick={() => setDeleteTarget({ id: q.id, questionNumber: q.questionNumber, title: q.questionText })}
                                                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-600/10 text-rose-600 dark:text-rose-400 hover:bg-rose-600 hover:text-white border border-rose-500/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                                                    title="Permanently delete rejected question"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" /> Delete
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
                        )
                    ) : (
                        filteredCourses.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 text-2xl">
                                    ✓
                                </div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">No Courses Found</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
                                    {filterStatus === 'PENDING_APPROVAL'
                                        ? 'There are no courses currently waiting for review. All curriculum proposals have been evaluated.'
                                        : `No courses found matching the selected status (${filterStatus}) and filters.`}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="role-data-table w-full">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-white/10 text-left text-xs font-semibold text-slate-500 dark:text-slate-400">
                                            <th className="pb-3 pr-4">Course Title</th>
                                            <th className="pb-3 pr-4">Status</th>
                                            <th className="pb-3 pr-4">Category & Level</th>
                                            <th className="pb-3 pr-4">Instructor / Author</th>
                                            <th className="pb-3 pr-4">Submitted Date</th>
                                            <th className="pb-3 text-right">Moderation Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                        {filteredCourses.map((c) => {
                                            const status = c.status || 'PENDING_APPROVAL'
                                            return (
                                                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                                    <td className="py-4 pr-4 max-w-md">
                                                        <div className="flex items-center gap-3">
                                                            {c.thumbnail ? (
                                                                <img src={c.thumbnail} alt="" className="w-12 h-8 rounded-lg object-cover border border-slate-200 dark:border-white/10" />
                                                            ) : (
                                                                <div className="w-12 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs">📚</div>
                                                            )}
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-900 dark:text-white">{c.title}</p>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">{c.description || 'No description provided'}</p>
                                                                {c.rejectionReason && (
                                                                    <div className="mt-1.5 p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-1.5">
                                                                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                                                        <span><strong>Rejection Reason:</strong> {c.rejectionReason}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 pr-4">
                                                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${status === 'APPROVED' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' :
                                                                status === 'PENDING_APPROVAL' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse' :
                                                                    'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                                            }`}>
                                                            {status === 'APPROVED' ? '✅ Approved' : status === 'PENDING_APPROVAL' ? '⏳ Pending' : '❌ Rejected'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 pr-4">
                                                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                                                            {c.category || 'General'}
                                                        </span>
                                                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">{c.level || 'All Levels'}</div>
                                                    </td>
                                                    <td className="py-4 pr-4">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white font-bold">
                                                                {c.instructor?.name?.[0] || 'I'}
                                                            </div>
                                                            <div>
                                                                <p className="text-xs font-semibold text-slate-900 dark:text-white">{c.instructor?.name || 'Content Creator'}</p>
                                                                <p className="text-[10px] text-slate-500 dark:text-slate-400">{c.instructor?.email || 'instructor@appliedstemlabs.com'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 pr-4 text-xs text-slate-500 dark:text-slate-400">
                                                        {new Date(c.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => router.push(`/dashboard/superadmin/courses/${c.id}`)}
                                                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 transition-all flex items-center gap-1.5"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" /> Inspect
                                                            </button>

                                                            {status !== 'APPROVED' && (
                                                                <button
                                                                    disabled={actionLoading === c.id}
                                                                    onClick={() => handleApproveCourse(c.id)}
                                                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50"
                                                                >
                                                                    <CheckCircle className="w-3.5 h-3.5" /> {status === 'REJECTED' ? 'Reinstate' : 'Approve'}
                                                                </button>
                                                            )}

                                                            {status !== 'REJECTED' && (
                                                                <button
                                                                    disabled={actionLoading === c.id}
                                                                    onClick={() => setRejectTarget({ type: 'course', id: c.id, title: c.title })}
                                                                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                                                >
                                                                    <XCircle className="w-3.5 h-3.5" /> {status === 'APPROVED' ? 'Revoke' : 'Reject'}
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
                        )
                    )}
                </div>
            </main>

            {/* Question Preview Modal */}
            {selectedQuestion && (
                <QuestionPreview form={selectedQuestion} onClose={() => setSelectedQuestion(null)} />
            )}

            {/* Rejection Reason Modal */}
            {rejectTarget && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-fade-in">
                        <div className="flex items-center gap-3 mb-4 text-rose-400">
                            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                                <XCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Reject {rejectTarget.type === 'question' ? 'Question' : 'Course'}</h3>
                                <p className="text-xs text-slate-400">Provide feedback to the author</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-300 mb-3 bg-white/5 p-3 rounded-xl border border-white/10 font-medium line-clamp-2">
                            "{rejectTarget.title}"
                        </p>

                        <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                            Rejection Reason / Improvement Notes *
                        </label>
                        <textarea
                            rows={3}
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="e.g. Please add 2 more hidden edge-case test cases or clarify problem constraints..."
                            className="input-field text-xs mb-4"
                            required
                        />

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => { setRejectTarget(null); setRejectReason('') }}
                                className="btn-secondary text-xs px-4 py-2"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmReject}
                                disabled={actionLoading === rejectTarget.id}
                                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition-all"
                            >
                                Confirm Rejection
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Question Modal */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/15 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-fade-in">
                        <div className="flex items-center gap-3 mb-4 text-rose-400">
                            <div className="p-2.5 rounded-2xl bg-rose-500/10 border border-rose-500/20">
                                <Trash2 className="w-6 h-6 text-rose-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-white">Delete Rejected Question</h3>
                                <p className="text-xs text-slate-400">Permanent removal from Question Bank</p>
                            </div>
                        </div>

                        <div className="mb-4 bg-white/5 p-3.5 rounded-xl border border-white/10 space-y-1.5">
                            {deleteTarget.questionNumber && (
                                <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 inline-block">
                                    {deleteTarget.questionNumber}
                                </span>
                            )}
                            <p className="text-xs text-slate-300 font-medium line-clamp-3">
                                "{deleteTarget.title}"
                            </p>
                        </div>

                        <p className="text-xs text-rose-400/90 mb-5 bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            This action cannot be undone. The question will be permanently removed.
                        </p>

                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setDeleteTarget(null)}
                                className="btn-secondary text-xs px-4 py-2"
                                disabled={actionLoading === deleteTarget.id}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteQuestion(deleteTarget.id)}
                                disabled={actionLoading === deleteTarget.id}
                                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 transition-all flex items-center gap-1.5 disabled:opacity-50"
                            >
                                {actionLoading === deleteTarget.id ? (
                                    <>
                                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Deleting...</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete Question</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
