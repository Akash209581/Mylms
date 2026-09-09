'use client'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

export default function DailyChallengePage() {
    const router = useRouter()
    const [streak, setStreak] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [answer, setAnswer] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [selectedLang, setSelectedLang] = useState<string>('')

    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10)
        apiFetch(`${API_URL}/daily-streak/today?date=${today}`, { credentials: 'include' })
            .then(r => r.json())
            .then(data => {
                if (data && !data.message) {
                    setStreak(data)
                    const q = data.question
                    if (q && q.type === 'PQ') {
                        const langs = q.allowedLanguages || ['Python']
                        const firstLang = langs[0] || 'Python'
                        setSelectedLang(firstLang)
                        
                        let snippetObj: Record<string, string> = {}
                        try {
                            if (q.codeSnippet) {
                                const parsed = JSON.parse(q.codeSnippet)
                                if (typeof parsed === 'object' && parsed !== null) {
                                    snippetObj = parsed
                                }
                            }
                        } catch (e) {
                            snippetObj = { [firstLang]: q.codeSnippet || '' }
                        }
                        setAnswer(snippetObj[firstLang] || '')
                    }
                }
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const handleSubmit = () => {
        setSubmitted(true)
        const q = streak.question
        let correct = false

        if (q.type === 'MCQ') {
            correct = answer === q.correctAnswer
        } else if (q.type === 'FIB') {
            // Basic check for first blank
            correct = q.blanks?.some((b: string) => b.toLowerCase() === answer.toLowerCase())
        } else {
            // General feedback for other types in this MVP
            correct = true
        }

        setResult({
            success: correct,
            message: correct ? 'Great job! You earned +10 Streak Points!' : 'Oops! That’s not quite right. Try again tomorrow!',
            explanation: q.type === 'MCQ' ? `The correct answer was: ${q.correctAnswer}` : ''
        })
    }

    const handleLanguageChange = (lang: string) => {
        setSelectedLang(lang)
        const q = streak.question
        let snippetObj: Record<string, string> = {}
        try {
            if (q.codeSnippet) {
                const parsed = JSON.parse(q.codeSnippet)
                if (typeof parsed === 'object' && parsed !== null) {
                    snippetObj = parsed
                }
            }
        } catch (e) {
            snippetObj = { [lang]: q.codeSnippet || '' }
        }
        setAnswer(snippetObj[lang] || '')
    }

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    )

    if (!streak) return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="STUDENT" />
            <Navbar title="Daily Challenge" />
            <main className="page-content flex items-center justify-center">
                <div className="text-center">
                    <div className="text-6xl mb-4">🌙</div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">No Daily Challenge</h1>
                    <p className="text-[var(--text-secondary)] mt-2">Come back tomorrow for a new coding challenge!</p>
                    <button onClick={() => router.push('/dashboard/student')} className="btn-primary mt-6 px-6 py-2.5">Back to Dashboard</button>
                </div>
            </main>
        </div>
    )

    const q = streak.question

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="STUDENT" />
            <Navbar title="Daily Coding Streak" />
            <main className="page-content">
                <div className="max-w-3xl mx-auto">
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">Daily Challenge</h1>
                            <p className="text-[var(--text-secondary)]">Earn streak points by solving today's puzzle.</p>
                        </div>
                        <div className="bg-amber-100 px-4 py-2 rounded-2xl flex items-center gap-2 border border-amber-200">
                            <span className="text-xl">🔥</span>
                            <span className="text-amber-700 font-bold">12 Day Streak</span>
                        </div>
                    </div>

                    <div className="glass-card p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full uppercase tracking-wider">{q.type}</span>
                            <span className="text-gray-400 font-mono text-sm">Question #{q.questionNumber}</span>
                        </div>

                        <div className="prose prose-indigo max-w-none">
                            <p className="text-xl text-[var(--text-primary)] leading-relaxed font-medium mb-8">
                                {q.questionText}
                            </p>
                        </div>

                        {submitted ? (
                            <div className={`p-6 rounded-2xl mb-8 animate-fade-in ${result.success ? 'bg-emerald-50 border border-emerald-100' : 'bg-rose-50 border border-rose-100'}`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-2xl">{result.success ? '🎉' : '❌'}</span>
                                    <h3 className={`text-lg font-bold ${result.success ? 'text-emerald-800' : 'text-rose-800'}`}>
                                        {result.success ? 'Correct Answer!' : 'Incorrect'}
                                    </h3>
                                </div>
                                <p className={`${result.success ? 'text-emerald-700' : 'text-rose-700'} mb-4`}>{result.message}</p>
                                {result.explanation && <p className="text-sm text-[var(--text-secondary)] mt-2 italic font-mono">{result.explanation}</p>}

                                <button onClick={() => router.push('/dashboard/student')} className="btn-primary mt-4 px-6 py-2">Return to Dashboard</button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {q.type === 'MCQ' && (
                                    <div className="grid grid-cols-1 gap-3">
                                        {q.options?.map((opt: string, i: number) => (
                                            <button
                                                key={i}
                                                onClick={() => setAnswer(opt)}
                                                className={`p-4 rounded-xl border text-left transition-all hover:border-indigo-500 ${answer === opt ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-200' : 'bg-gray-50 border-[var(--border)]'}`}
                                            >
                                                <span className="font-bold mr-3 text-indigo-400">{String.fromCharCode(65 + i)}</span>
                                                <span className="text-[var(--text-primary)]">{opt}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {(q.type === 'FIB' || q.type === 'OP') && (
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wide">Enter your answer</label>
                                        <input
                                            type="text"
                                            value={answer}
                                            onChange={e => setAnswer(e.target.value)}
                                            placeholder="Type your answer here..."
                                            className="input-field py-4 text-lg font-mono"
                                        />
                                    </div>
                                )}

                                {q.type === 'PQ' && (() => {
                                    const langs = q.allowedLanguages || ['Python']
                                    return (
                                        <div className="space-y-4 mb-6 animate-in fade-in duration-300">
                                            {langs.length > 0 && (
                                                <div className="flex items-center gap-3 bg-[var(--bg-surface)]/5 p-2 rounded-2xl border border-white/10 max-w-max">
                                                    <span className="text-xs font-bold text-gray-400 pl-2">Language:</span>
                                                    <div className="flex gap-2">
                                                        {langs.map((l: string) => (
                                                            <button
                                                                key={l}
                                                                type="button"
                                                                onClick={() => handleLanguageChange(l)}
                                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                                                    selectedLang === l
                                                                        ? 'bg-indigo-500 border-indigo-500 text-white shadow-lg'
                                                                        : 'bg-white/5 border-white/10 text-gray-300 hover:border-white/30'
                                                                }`}
                                                            >
                                                                {l}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            <div className="bg-gray-900 rounded-2xl p-6 border border-white/5">
                                                <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-wider font-bold border-b border-white/5 pb-2 mb-4">
                                                    <span>{selectedLang} Solution Editor</span>
                                                </div>
                                                <textarea
                                                    value={answer}
                                                    onChange={e => setAnswer(e.target.value)}
                                                    className="w-full h-64 bg-transparent text-emerald-400 font-mono focus:outline-none resize-none text-sm leading-relaxed"
                                                    placeholder="Implement your solution here..."
                                                />
                                            </div>
                                        </div>
                                    )
                                })()}

                                <button
                                    onClick={handleSubmit}
                                    disabled={!answer}
                                    className="btn-primary w-full py-4 text-lg mt-4 disabled:opacity-50 shadow-xl shadow-indigo-500/20"
                                >
                                    Submit Answer
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    )
}
