'use client'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import { EmptyState, Loading, PageHeader } from '@/components/ui'
import { api } from '@/lib/api'
import { CheckCircle2, Flame, MoonStar, Send, XCircle } from 'lucide-react'

export default function DailyChallengePage() {
    const router = useRouter()
    const [streak, setStreak] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [answer, setAnswer] = useState('')
    const [submitted, setSubmitted] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [selectedLang, setSelectedLang] = useState<string>('')
    const [streakDays, setStreakDays] = useState<number | null>(null)

    useEffect(() => {
        api.get('/student/stats').then(r => setStreakDays(Number(r.data?.streak) || 0)).catch(() => setStreakDays(null))
    }, [])

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

    const shell = (content: React.ReactNode) => (
        <div className="portal-page">
            <StudentReferenceShell active="dashboard" />
            <main id="student-main" tabIndex={-1} className="portal-main">
                <PageHeader
                    eyebrow="Daily challenge"
                    title="Learning streak"
                    description="Solve one question a day to keep your streak alive and earn points."
                    actions={streakDays !== null && (
                        <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] shadow-sm">
                            <Flame className="w-5 h-5 text-[var(--gold)]" aria-hidden="true" />
                            <span className="font-display text-xl font-semibold role-text-primary ui-num">{streakDays}</span>
                            <span className="text-sm role-text-muted">day streak</span>
                        </span>
                    )}
                />
                {content}
            </main>
        </div>
    )

    if (loading) return shell(<Loading label="Loading today's challenge" />)

    if (!streak) return shell(
        <EmptyState icon={MoonStar} title="No challenge today" action={<Link href="/dashboard/student" className="ui-btn ui-btn-secondary">Back to overview</Link>}>
            There is no daily challenge scheduled for today. Check back tomorrow.
        </EmptyState>
    )

    const q = streak.question

    return shell(
        <section className="ui-card ui-card-pad max-w-3xl" style={{ padding: 32 }}>
            <div className="flex items-center gap-3 mb-5">
                <span className="ui-badge is-accent no-dot">{q.type}</span>
                {q.questionNumber && <span className="text-sm role-text-muted ui-num">Question #{q.questionNumber}</span>}
            </div>

            <p className="font-display text-2xl leading-snug role-text-primary mb-8">{q.questionText}</p>

            {submitted ? (
                <div className={`ui-alert ${result.success ? 'is-success' : 'is-danger'}`} style={{ padding: 20 }}>
                    {result.success ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
                    <div className="flex-1">
                        <p className="font-semibold text-base">{result.success ? 'Correct answer' : 'Not quite'}</p>
                        <p className="mt-1">{result.message}</p>
                        {result.explanation && <p className="mt-2 text-sm opacity-80">{result.explanation}</p>}
                        <Link href="/dashboard/student" className="ui-btn ui-btn-secondary ui-btn-sm mt-4">Back to overview</Link>
                    </div>
                </div>
            ) : (
                <div className="grid gap-6">
                    {q.type === 'MCQ' && (
                        <div className="grid gap-3" role="radiogroup" aria-label="Answer options">
                            {q.options?.map((opt: string, i: number) => {
                                const selected = answer === opt
                                return (
                                    <button
                                        key={i}
                                        role="radio"
                                        aria-checked={selected}
                                        onClick={() => setAnswer(opt)}
                                        className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-colors ${selected ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)] hover:bg-[var(--bg-raised)]'}`}
                                    >
                                        <span className={`grid place-items-center w-8 h-8 rounded-lg text-sm font-semibold shrink-0 ${selected ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-raised)] role-text-secondary'}`}>{String.fromCharCode(65 + i)}</span>
                                        <span className="role-text-primary">{opt}</span>
                                    </button>
                                )
                            })}
                        </div>
                    )}

                    {(q.type === 'FIB' || q.type === 'OP') && (
                        <div className="ui-field">
                            <label className="ui-label" htmlFor="streak-answer">Your answer</label>
                            <input id="streak-answer" type="text" value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Type your answer" className="ui-input font-mono" style={{ minHeight: 52, fontSize: 16 }} />
                        </div>
                    )}

                    {q.type === 'PQ' && (() => {
                        const langs = q.allowedLanguages || ['Python']
                        return (
                            <div className="grid gap-3">
                                {langs.length > 1 && (
                                    <div className="ui-tabs" role="tablist" aria-label="Language">
                                        {langs.map((l: string) => (
                                            <button key={l} type="button" role="tab" aria-selected={selectedLang === l} onClick={() => handleLanguageChange(l)} className="ui-tab">{l}</button>
                                        ))}
                                    </div>
                                )}
                                <div className="rounded-xl overflow-hidden border border-[#2c313c] bg-[#14161c]">
                                    <div className="flex items-center justify-between px-4 py-2 border-b border-[#2c313c] text-[11px] tracking-wider uppercase text-[#9d9a92] font-semibold">
                                        <span>{selectedLang}</span><span>solution.{selectedLang?.toLowerCase().startsWith('py') ? 'py' : 'txt'}</span>
                                    </div>
                                    <textarea
                                        value={answer}
                                        onChange={e => setAnswer(e.target.value)}
                                        spellCheck={false}
                                        aria-label="Solution code"
                                        className="w-full h-64 p-4 bg-transparent text-[#e6e1d6] font-mono focus:outline-none resize-y text-sm leading-relaxed"
                                        placeholder="Write your solution here…"
                                    />
                                </div>
                            </div>
                        )
                    })()}

                    <button onClick={handleSubmit} disabled={!answer} className="ui-btn ui-btn-primary ui-btn-lg ui-btn-block">
                        <Send aria-hidden="true" /> Submit answer
                    </button>
                </div>
            )}
        </section>
    )
}
