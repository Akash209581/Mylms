'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

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
    const [questions, setQuestions] = useState<any[]>([])
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [filterType, setFilterType] = useState('ALL')
    const [filterDiff, setFilterDiff] = useState('ALL')
    const [search, setSearch] = useState('')

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN' && u.role !== 'ADMIN') { router.push('/login'); return }

        Promise.all([
            fetch('http://localhost:3001/question-bank', { credentials: 'include' }).then(r => r.json()),
            fetch('http://localhost:3001/question-bank/stats', { credentials: 'include' }).then(r => r.json()),
        ]).then(([qs, s]) => {
            if (Array.isArray(qs)) setQuestions(qs)
            setStats(s)
        }).catch(() => { }).finally(() => setLoading(false))
    }, [])

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this question?')) return
        await fetch(`http://localhost:3001/question-bank/${id}`, { method: 'DELETE', credentials: 'include' })
        setQuestions(prev => prev.filter(q => q.id !== id))
    }

    const diffColors: Record<string, string> = {
        VERY_EASY: '#10b981', EASY: '#34d399', MEDIUM: '#f59e0b',
        HARD: '#ef4444', VERY_HARD: '#7f1d1d',
    }

    const filtered = questions.filter(q => {
        const matchType = filterType === 'ALL' || q.type === filterType
        const matchDiff = filterDiff === 'ALL' || q.difficulty === filterDiff
        const matchSearch = !search || q.questionText?.toLowerCase().includes(search.toLowerCase()) ||
            q.topicNames?.toLowerCase().includes(search.toLowerCase())
        return matchType && matchDiff && matchSearch
    })

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="SUPERADMIN" />
            <Navbar title="Question Bank" />
            <main className="page-content">
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-1">Question Bank</h1>
                        <p className="text-gray-400">Create and manage all question types for assessments</p>
                    </div>
                    <button onClick={() => router.push('/dashboard/superadmin/question-bank/create')}
                        className="btn-primary px-5 py-2.5 text-sm flex items-center gap-2">
                        <span>+</span> Add Question
                    </button>
                </div>

                {/* Type Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                    {QUESTION_TYPES.map(t => {
                        const count = stats?.byType?.find((b: any) => b.type === t.key)?.count ?? 0
                        return (
                            <div key={t.key} onClick={() => setFilterType(filterType === t.key ? 'ALL' : t.key)}
                                className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-105 border ${filterType === t.key ? 'scale-105' : 'border-transparent'
                                    }`}
                                style={{
                                    background: filterType === t.key ? `${t.color}25` : 'rgba(255,255,255,0.05)',
                                    borderColor: filterType === t.key ? t.color : 'transparent'
                                }}>
                                <div className="text-2xl mb-2">{t.icon}</div>
                                <p className="text-white font-semibold text-sm">{t.label}</p>
                                <p className="text-gray-500 text-xs mb-2">{t.desc}</p>
                                <p className="text-2xl font-bold" style={{ color: t.color }}>{count}</p>
                            </div>
                        )
                    })}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex gap-2 flex-wrap">
                        {['ALL', 'VERY_EASY', 'EASY', 'MEDIUM', 'HARD', 'VERY_HARD'].map(d => (
                            <button key={d} onClick={() => setFilterDiff(d)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filterDiff === d ? 'text-white scale-105' : 'text-gray-400'}`}
                                style={{
                                    background: filterDiff === d ? (diffColors[d] || '#6366f1') : 'rgba(255,255,255,0.06)',
                                    border: filterDiff === d ? 'none' : '1px solid rgba(255,255,255,0.1)'
                                }}>
                                {d.replace('_', ' ')}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input type="text" placeholder="Search by topic or question text..." value={search}
                            onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
                    </div>
                </div>

                {/* Table */}
                <div className="glass-card p-6">
                    <p className="text-gray-400 text-sm mb-5">{filtered.length} question{filtered.length !== 1 ? 's' : ''} found</p>
                    {loading ? (
                        <div className="flex justify-center py-16">
                            <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-5xl mb-3">📋</div>
                            <p className="text-gray-400">No questions yet. Click "Add Question" to create your first one.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                        {['#', 'Q. Number', 'Type', 'Topic', 'Difficulty', 'Question', 'Actions'].map(h => (
                                            <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((q: any, i: number) => {
                                        const qType = QUESTION_TYPES.find(t => t.key === q.type)
                                        return (
                                            <tr key={q.id} className="border-b hover:bg-white/5 transition-colors"
                                                style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                                <td className="py-4 pr-4 text-gray-500 text-sm">{i + 1}</td>
                                                <td className="py-4 pr-4">
                                                    <span className="text-xs font-mono font-semibold text-primary-400">{q.questionNumber}</span>
                                                </td>
                                                <td className="py-4 pr-4">
                                                    <span className="px-2 py-1 rounded-lg text-xs font-semibold"
                                                        style={{ background: `${qType?.color}25`, color: qType?.color }}>
                                                        {qType?.icon} {q.type}
                                                    </span>
                                                </td>
                                                <td className="py-4 pr-4 text-gray-300 text-sm">{q.topicNames}</td>
                                                <td className="py-4 pr-4">
                                                    <span className="px-2 py-1 rounded-lg text-xs font-semibold"
                                                        style={{ background: `${diffColors[q.difficulty] || '#6366f1'}20`, color: diffColors[q.difficulty] || '#6366f1' }}>
                                                        {q.difficulty?.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="py-4 pr-4 text-gray-300 text-sm max-w-xs truncate">{q.questionText}</td>
                                                <td className="py-4">
                                                    <div className="flex gap-2">
                                                        <button onClick={() => router.push(`/dashboard/superadmin/question-bank/${q.id}/edit`)}
                                                            className="px-2.5 py-1 rounded-lg text-xs font-medium"
                                                            style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.3)' }}>
                                                            Edit
                                                        </button>
                                                        <button onClick={() => handleDelete(q.id)}
                                                            className="px-2.5 py-1 rounded-lg text-xs font-medium"
                                                            style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                                                            Del
                                                        </button>
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
        </div>
    )
}
