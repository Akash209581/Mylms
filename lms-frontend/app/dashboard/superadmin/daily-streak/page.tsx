'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

export default function DailyStreakPage() {
    const router = useRouter()
    const [questions, setQuestions] = useState<any[]>([])
    const [streaks, setStreaks] = useState<any[]>([])
    const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), questionId: '', questionType: '' })
    const [saving, setSaving] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN') { router.push('/login'); return }

        Promise.all([
            fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/question-bank`, { credentials: 'include' }).then(r => r.json()),
            fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/daily-streak`, { credentials: 'include' }).then(r => r.json()),
        ]).then(([qs, ss]) => {
            if (Array.isArray(qs)) setQuestions(qs)
            if (Array.isArray(ss)) setStreaks(ss)
        }).catch(() => { }).finally(() => setLoading(false))
    }, [])

    const handleSet = async () => {
        if (!form.questionId) return
        setSaving(true)
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/daily-streak`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ date: form.date, questionId: +form.questionId, questionType: form.questionType }),
        })
        if (res.ok) {
            const updated = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/daily-streak`, { credentials: 'include' }).then(r => r.json())
            if (Array.isArray(updated)) setStreaks(updated)
        }
        setSaving(false)
    }

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="SUPERADMIN" />
            <Navbar title="Daily Streak" />
            <main className="page-content">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-1">Daily Streak Question</h1>
                    <p className="text-gray-400">Set a question that appears for all students each day</p>
                </div>

                {/* Set Streak Form */}
                <div className="glass-card p-6 mb-8">
                    <h3 className="text-white font-semibold mb-5 flex items-center gap-2">🔥 Set Today's Streak Question</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
                        <div>
                            <label className="text-gray-400 text-sm mb-2 block">Date</label>
                            <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="input-field" />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="text-gray-400 text-sm mb-2 block">Select Question</label>
                            <select value={form.questionId} onChange={e => {
                                const q = questions.find(q => q.id === +e.target.value)
                                setForm(p => ({ ...p, questionId: e.target.value, questionType: q?.type || '' }))
                            }} className="input-field">
                                <option value="">-- Select a question --</option>
                                {questions.map(q => (
                                    <option key={q.id} value={q.id}>
                                        [{q.type}] {q.questionNumber} — {q.questionText?.slice(0, 60)}...
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <button onClick={handleSet} disabled={saving || !form.questionId}
                        className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50">
                        {saving ? 'Setting...' : '🔥 Set as Daily Streak'}
                    </button>
                </div>

                {/* Streak History */}
                <div className="glass-card p-6">
                    <h3 className="text-white font-semibold mb-5">Streak History</h3>
                    {loading ? (
                        <div className="flex justify-center py-10"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : streaks.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-4xl mb-3">🔥</div>
                            <p className="text-gray-400">No streak questions set yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                        {['Date', 'Question ID', 'Type', 'Status'].map(h => (
                                            <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {streaks.map((s: any) => (
                                        <tr key={s.id} className="border-b hover:bg-white/5 transition-colors"
                                            style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                                            <td className="py-4 pr-4 text-white font-medium">{s.date}</td>
                                            <td className="py-4 pr-4 text-primary-400 font-mono">Q#{s.questionId}</td>
                                            <td className="py-4 pr-4">
                                                <span className="badge badge-student">{s.questionType}</span>
                                            </td>
                                            <td className="py-4">
                                                <span className={`badge ${s.isActive ? 'badge-student' : 'badge-instructor'}`}>
                                                    {s.isActive ? '✅ Active' : 'Inactive'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
