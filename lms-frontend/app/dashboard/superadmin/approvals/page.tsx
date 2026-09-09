'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { API_URL } from '@/lib/api'
import { apiFetch } from '@/lib/apiFetch'
import { getAuthHeaders } from '@/lib/authHeaders'
import QuestionPreview from '@/components/question-bank/QuestionPreview'
import { CheckCircle, XCircle, Eye, AlertCircle, Clock, BookOpen, HelpCircle, UserCheck, Search, Filter } from 'lucide-react'

export default function ApprovalsPage() {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<'questions' | 'courses'>('questions')
    const [summary, setSummary] = useState<{ pendingQuestions: number; pendingCourses: number; totalPending: number }>({
        pendingQuestions: 0,
        pendingCourses: 0,
        totalPending: 0,
    })
    const [pendingQuestions, setPendingQuestions] = useState<any[]>([])
    const [pendingCourses, setPendingCourses] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<number | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    // Preview state
    const [selectedQuestion, setSelectedQuestion] = useState<any | null>(null)
    
    // Reject Modal state
    const [rejectTarget, setRejectTarget] = useState<{ type: 'question' | 'course'; id: number; title: string } | null>(null)
    const [rejectReason, setRejectReason] = useState('')

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN' && u.role !== 'ADMIN') { router.push('/login'); return }

        loadData()
    }, [])

    const loadData = async () => {
        setLoading(true)
        try {
            const [sumRes, qRes, cRes] = await Promise.all([
                apiFetch(`${API_URL}/superadmin/approvals/summary`, { credentials: 'include', headers: getAuthHeaders() }),
                apiFetch(`${API_URL}/superadmin/approvals/questions`, { credentials: 'include', headers: getAuthHeaders() }),
                apiFetch(`${API_URL}/superadmin/approvals/courses`, { credentials: 'include', headers: getAuthHeaders() }),
            ])

            if (sumRes.ok) setSummary(await sumRes.json())
            if (qRes.ok) setPendingQuestions(await qRes.json())
            if (cRes.ok) setPendingCourses(await cRes.json())
        } catch (err) {
            console.error('Failed to load approvals:', err)
        } finally {
            setLoading(false)
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
                setPendingQuestions(prev => prev.filter(q => q.id !== id))
                setSummary(prev => ({
                    ...prev,
                    pendingQuestions: Math.max(0, prev.pendingQuestions - 1),
                    totalPending: Math.max(0, prev.totalPending - 1),
                }))
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
                setPendingCourses(prev => prev.filter(c => c.id !== id))
                setSummary(prev => ({
                    ...prev,
                    pendingCourses: Math.max(0, prev.pendingCourses - 1),
                    totalPending: Math.max(0, prev.totalPending - 1),
                }))
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
                    setPendingQuestions(prev => prev.filter(q => q.id !== rejectTarget.id))
                    setSummary(prev => ({
                        ...prev,
                        pendingQuestions: Math.max(0, prev.pendingQuestions - 1),
                        totalPending: Math.max(0, prev.totalPending - 1),
                    }))
                } else {
                    setPendingCourses(prev => prev.filter(c => c.id !== rejectTarget.id))
                    setSummary(prev => ({
                        ...prev,
                        pendingCourses: Math.max(0, prev.pendingCourses - 1),
                        totalPending: Math.max(0, prev.totalPending - 1),
                    }))
                }
                setRejectTarget(null)
                setRejectReason('')
            }
        } catch (err) {
            console.error('Rejection failed:', err)
        } finally {
            setActionLoading(null)
        }
    }

    const filteredQuestions = pendingQuestions.filter(q => {
        if (!searchQuery) return true
        const text = `${q.questionNumber} ${q.questionText} ${q.topicNames} ${q.domain} ${q.targetCompanies} ${q.creator?.name || ''}`.toLowerCase()
        return text.includes(searchQuery.toLowerCase())
    })

    const filteredCourses = pendingCourses.filter(c => {
        if (!searchQuery) return true
        const text = `${c.title} ${c.category} ${c.instructor?.name || ''}`.toLowerCase()
        return text.includes(searchQuery.toLowerCase())
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
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" /> Quality Assurance & Moderation
                            </span>
                        </div>
                        <h1 className="text-3xl font-extrabold text-white tracking-tight">Super Admin Approval Hub</h1>
                        <p className="text-slate-400 text-sm mt-1">
                            Review, verify, and approve question bank submissions and curriculum courses authored by creators.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button onClick={loadData} className="btn-secondary text-xs px-4 py-2 flex items-center gap-2">
                            <span>↻</span> Refresh List
                        </button>
                    </div>
                </div>

                {/* Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div 
                        onClick={() => setActiveTab('questions')} 
                        className={`glass-card p-5 cursor-pointer transition-all ${activeTab === 'questions' ? 'border-primary-500 ring-2 ring-primary-500/20' : 'hover:border-white/20'}`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Questions</span>
                            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-400"><HelpCircle className="w-5 h-5" /></span>
                        </div>
                        <div className="text-3xl font-black text-white mt-2">{summary.pendingQuestions}</div>
                        <p className="text-xs text-purple-300/80 mt-1">MCQs, Coding, FIBs awaiting review</p>
                    </div>

                    <div 
                        onClick={() => setActiveTab('courses')} 
                        className={`glass-card p-5 cursor-pointer transition-all ${activeTab === 'courses' ? 'border-primary-500 ring-2 ring-primary-500/20' : 'hover:border-white/20'}`}
                    >
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Courses</span>
                            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400"><BookOpen className="w-5 h-5" /></span>
                        </div>
                        <div className="text-3xl font-black text-white mt-2">{summary.pendingCourses}</div>
                        <p className="text-xs text-indigo-300/80 mt-1">Curriculum & lessons awaiting review</p>
                    </div>

                    <div className="glass-card p-5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Queue</span>
                            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400"><Clock className="w-5 h-5" /></span>
                        </div>
                        <div className="text-3xl font-black text-amber-400 mt-2">{summary.totalPending}</div>
                        <p className="text-xs text-slate-400 mt-1">Items currently requiring action</p>
                    </div>
                </div>

                {/* Tabs & Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 w-full sm:w-auto">
                        <button
                            onClick={() => setActiveTab('questions')}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                                activeTab === 'questions' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <HelpCircle className="w-4 h-4" />
                            <span>Questions Queue</span>
                            <span className="px-2 py-0.5 rounded-full text-xs bg-white/20">{summary.pendingQuestions}</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('courses')}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                                activeTab === 'courses' ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/25' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            <BookOpen className="w-4 h-4" />
                            <span>Courses Queue</span>
                            <span className="px-2 py-0.5 rounded-full text-xs bg-white/20">{summary.pendingCourses}</span>
                        </button>
                    </div>

                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Filter by title, topic, company..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="input-field pl-10 text-xs h-10 w-full"
                        />
                    </div>
                </div>

                {/* Content Table */}
                <div className="glass-card p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-24">
                            <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mb-3" />
                            <p className="text-slate-400 text-sm">Loading approval queue...</p>
                        </div>
                    ) : activeTab === 'questions' ? (
                        filteredQuestions.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 text-2xl">
                                    ✓
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">Question Queue is All Clear!</h3>
                                <p className="text-slate-400 text-sm max-w-md mx-auto">
                                    There are no questions currently waiting for review. All creator submissions have been evaluated.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="role-data-table w-full">
                                    <thead>
                                        <tr className="border-b border-white/10 text-left text-xs font-semibold text-slate-400">
                                            <th className="pb-3 pr-4">Code</th>
                                            <th className="pb-3 pr-4">Type</th>
                                            <th className="pb-3 pr-4">Question Details</th>
                                            <th className="pb-3 pr-4">Target Companies</th>
                                            <th className="pb-3 pr-4">Creator / Author</th>
                                            <th className="pb-3 text-right">Moderation Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredQuestions.map((q) => {
                                            const companies = q.targetCompanies || q.companiesAppeared || ''
                                            return (
                                                <tr key={q.id} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="py-4 pr-4">
                                                        <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                                                            {q.questionNumber}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 pr-4">
                                                        <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                                            {q.type}
                                                        </span>
                                                        <div className="text-[11px] text-slate-400 mt-1">{q.difficulty?.replace('_', ' ')}</div>
                                                    </td>
                                                    <td className="py-4 pr-4 max-w-sm">
                                                        <p className="text-sm font-semibold text-white line-clamp-2">{q.questionText}</p>
                                                        <p className="text-xs text-slate-400 mt-1">Topic: <span className="text-slate-300 font-medium">{q.topicNames}</span> ({q.domain})</p>
                                                    </td>
                                                    <td className="py-4 pr-4 max-w-[180px]">
                                                        {companies ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {companies.split(',').map((c: string) => (
                                                                    <span key={c} className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-medium">
                                                                        🏢 {c.trim()}
                                                                    </span>
                                                                ))}
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
                                                                <p className="text-xs font-semibold text-white">{q.creator?.name || 'Question Creator'}</p>
                                                                <p className="text-[10px] text-slate-400">{q.creator?.email || 'creator@eduverse.com'}</p>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                onClick={() => setSelectedQuestion(q)}
                                                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all flex items-center gap-1.5"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" /> Preview
                                                            </button>
                                                            <button
                                                                disabled={actionLoading === q.id}
                                                                onClick={() => handleApproveQuestion(q.id)}
                                                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50"
                                                            >
                                                                <CheckCircle className="w-3.5 h-3.5" /> Approve
                                                            </button>
                                                            <button
                                                                disabled={actionLoading === q.id}
                                                                onClick={() => setRejectTarget({ type: 'question', id: q.id, title: q.questionText })}
                                                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                                            >
                                                                <XCircle className="w-3.5 h-3.5" /> Reject
                                                            </button>
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
                                <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 text-2xl">
                                    ✓
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">Course Queue is All Clear!</h3>
                                <p className="text-slate-400 text-sm max-w-md mx-auto">
                                    There are no courses waiting for review. All curriculum proposals have been evaluated.
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="role-data-table w-full">
                                    <thead>
                                        <tr className="border-b border-white/10 text-left text-xs font-semibold text-slate-400">
                                            <th className="pb-3 pr-4">Course Title</th>
                                            <th className="pb-3 pr-4">Category & Level</th>
                                            <th className="pb-3 pr-4">Instructor / Author</th>
                                            <th className="pb-3 pr-4">Submitted Date</th>
                                            <th className="pb-3 text-right">Moderation Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredCourses.map((c) => (
                                            <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="py-4 pr-4 max-w-md">
                                                    <div className="flex items-center gap-3">
                                                        {c.thumbnail ? (
                                                            <img src={c.thumbnail} alt="" className="w-12 h-8 rounded-lg object-cover border border-white/10" />
                                                        ) : (
                                                            <div className="w-12 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs">📚</div>
                                                        )}
                                                        <div>
                                                            <p className="text-sm font-bold text-white">{c.title}</p>
                                                            <p className="text-xs text-slate-400 line-clamp-1">{c.description || 'No description provided'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 pr-4">
                                                    <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                        {c.category || 'General'}
                                                    </span>
                                                    <div className="text-[11px] text-slate-400 mt-1">{c.level || 'All Levels'}</div>
                                                </td>
                                                <td className="py-4 pr-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs text-white font-bold">
                                                            {c.instructor?.name?.[0] || 'I'}
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-white">{c.instructor?.name || 'Content Creator'}</p>
                                                            <p className="text-[10px] text-slate-400">{c.instructor?.email || 'instructor@eduverse.com'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 pr-4 text-xs text-slate-400">
                                                    {new Date(c.createdAt).toLocaleDateString()}
                                                </td>
                                                <td className="py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => router.push(`/dashboard/superadmin/courses/${c.id}`)}
                                                            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-all flex items-center gap-1.5"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" /> Inspect
                                                        </button>
                                                        <button
                                                            disabled={actionLoading === c.id}
                                                            onClick={() => handleApproveCourse(c.id)}
                                                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-md shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50"
                                                        >
                                                            <CheckCircle className="w-3.5 h-3.5" /> Approve
                                                        </button>
                                                        <button
                                                            disabled={actionLoading === c.id}
                                                            onClick={() => setRejectTarget({ type: 'course', id: c.id, title: c.title })}
                                                            className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white border border-rose-500/20 transition-all flex items-center gap-1.5 disabled:opacity-50"
                                                        >
                                                            <XCircle className="w-3.5 h-3.5" /> Reject
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
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
        </div>
    )
}
