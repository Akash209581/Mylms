'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import { api } from '@/lib/api'
import MarkdownRenderer from '@/components/editor/MarkdownRenderer'
import { normalizeMcqLetter, optionTextForLetter } from '@/lib/mcq-answer'
import Link from 'next/link'
import { EmptyState, Loading } from '@/components/ui'
import { ArrowLeft, BarChart3, Check, CheckCircle2, Code2, Lightbulb, ListChecks, PieChart, X } from 'lucide-react'

export default function ExamResultPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const examId = params?.id as string
  const attemptId = searchParams?.get('attemptId')

  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'summary' | 'mcq' | 'coding'>('summary')

  useEffect(() => {
    if (!attemptId) { router.push('/dashboard/student/exams'); return }
    api.get(`/student/exams/attempts/${attemptId}/result`)
      .then(r => setResult(r.data))
      .catch(e => setResult({ message: e.response?.data?.message || 'Results could not be loaded.' }))
      .finally(() => setLoading(false))
  }, [attemptId])

  if (loading) return (
    <div className="portal-page"><StudentReferenceShell active="exams" />
      <main id="student-main" tabIndex={-1} className="portal-main"><Loading label="Loading results" /></main>
    </div>
  )

  if (!result || result.message) return (
    <div className="portal-page"><StudentReferenceShell active="exams" />
      <main id="student-main" tabIndex={-1} className="portal-main">
        <EmptyState icon={BarChart3} title="Results not available yet" action={<Link href="/dashboard/student/exams" className="ui-btn ui-btn-primary">Back to exams</Link>}>
          {result?.message || 'Your results will appear here once they have been published.'}
        </EmptyState>
      </main>
    </div>
  )

  const percentage = result.totalMarks ? Math.round((Number(result.totalScore) / Number(result.totalMarks)) * 100) : 0
  const mcqTotal = result.mcqDetails?.length || 0
  const mcqCorrect = result.mcqDetails?.filter((q: any) => q.correct).length || 0
  const mcqWrong = result.mcqDetails?.filter((q: any) => !q.correct && q.yourAnswer).length || 0
  const mcqSkipped = mcqTotal - mcqCorrect - mcqWrong
  const LETTERS = ['A', 'B', 'C', 'D']
  const tone = result.passed ? 'var(--success)' : 'var(--error)'

  return (
    <div className="portal-page">
      <StudentReferenceShell active="exams" />
      <main id="student-main" tabIndex={-1} className="portal-main">
        <Link href="/dashboard/student/exams" className="ui-back"><ArrowLeft aria-hidden="true" /> All exams</Link>

        {/* Result summary */}
        <section className="ui-card ui-card-pad mb-6" style={{ borderTop: `3px solid ${tone}` }}>
          <div className="flex flex-col md:flex-row md:items-center gap-8">
            <div className="shrink-0 grid place-items-center">
              <div
                className="grid place-items-center w-36 h-36 rounded-full"
                style={{ background: `conic-gradient(${tone} ${percentage * 3.6}deg, var(--bg-hover) 0)` }}
                role="img"
                aria-label={`Score ${percentage} percent`}
              >
                <div className="grid place-items-center w-[120px] h-[120px] rounded-full bg-[var(--bg-surface)]">
                  <div className="text-center">
                    <p className="font-display text-4xl font-semibold role-text-primary ui-num leading-none">{percentage}%</p>
                    <p className="text-xs role-text-muted mt-1">score</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <span className={`ui-badge ${result.passed ? 'is-success' : 'is-danger'}`}>{result.passed ? 'Passed' : 'Not passed'}</span>
              <h1 className="font-display text-3xl font-semibold role-text-primary mt-3 leading-tight">{result.examTitle}</h1>
              <dl className="ui-kv mt-5">
                <div><dt>Total</dt><dd>{result.totalScore} / {result.totalMarks}</dd></div>
                <div><dt>MCQ</dt><dd>{result.mcqScore ?? '—'}</dd></div>
                <div><dt>Coding</dt><dd>{result.codingScore ?? '—'}</dd></div>
                <div><dt>Pass mark</dt><dd>{result.passingMarks}</dd></div>
                <div><dt>Time taken</dt><dd>{result.timeTaken ? `${Math.floor(result.timeTaken / 60)}m ${result.timeTaken % 60}s` : '—'}</dd></div>
                {result.rank ? <div><dt>Rank</dt><dd>#{result.rank}</dd></div> : null}
              </dl>
            </div>
          </div>
        </section>

        {/* Tabs */}
        <div className="ui-tabs mb-6" role="tablist">
          {([
            ['summary', 'Summary', PieChart],
            ['mcq', 'MCQ review', ListChecks],
            ['coding', 'Coding review', Code2],
          ] as const).map(([key, label, Icon]) => (
            <button key={key} role="tab" aria-selected={activeTab === key} onClick={() => setActiveTab(key)} className="ui-tab">
              <Icon className="w-4 h-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>

        {activeTab === 'summary' && (
          <div className="grid md:grid-cols-2 gap-5">
            <section className="ui-card ui-card-pad">
              <h2 className="ui-section-title mb-4">Section A · Multiple choice</h2>
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="p-3 rounded-lg bg-[var(--success-soft)]"><p className="text-xs text-[var(--success)] font-semibold">Correct</p><p className="font-display text-2xl text-[var(--success)] ui-num">{mcqCorrect}</p></div>
                <div className="p-3 rounded-lg bg-[var(--error-soft)]"><p className="text-xs text-[var(--error)] font-semibold">Wrong</p><p className="font-display text-2xl text-[var(--error)] ui-num">{mcqWrong}</p></div>
                <div className="p-3 rounded-lg bg-[var(--bg-raised)]"><p className="text-xs role-text-muted font-semibold">Skipped</p><p className="font-display text-2xl role-text-primary ui-num">{mcqSkipped}</p></div>
              </div>
              {mcqTotal > 0 && (
                <div className="flex h-2 rounded-full overflow-hidden bg-[var(--bg-hover)]" aria-hidden="true">
                  <span style={{ width: `${(mcqCorrect / mcqTotal) * 100}%`, background: 'var(--success)' }} />
                  <span style={{ width: `${(mcqWrong / mcqTotal) * 100}%`, background: 'var(--error)' }} />
                </div>
              )}
              <p className="ui-hint mt-3">{mcqTotal} questions in this section</p>
            </section>

            <section className="ui-card ui-card-pad">
              <h2 className="ui-section-title mb-4">Section B · Coding</h2>
              {result.codingDetails?.length ? (
                <ul className="grid gap-3">
                  {result.codingDetails.map((q: any, i: number) => (
                    <li key={q.questionId} className="flex items-center gap-3">
                      <span className="text-sm role-text-secondary line-clamp-1 flex-1">Q{i + 1}. {q.problemStatement?.substring(0, 60)}</span>
                      <span className={`ui-badge no-dot ${q.status === 'ACCEPTED' ? 'is-success' : q.status === 'PARTIAL' ? 'is-warning' : 'is-neutral'}`}>{q.score}/{q.marks}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm role-text-muted">No coding questions in this exam.</p>}
            </section>
          </div>
        )}

        {activeTab === 'mcq' && (
          <div className="grid gap-4">
            {result.mcqDetails?.map((q: any, i: number) => {
              const yourLetter = normalizeMcqLetter(q.yourAnswer, q.options)
              const correctLetter = q.correctAnswer ? normalizeMcqLetter(q.correctAnswer, q.options) : null
              const title = q.questionText?.trim() || ''
              const body = q.problemStatement?.trim() || ''
              const showTitle = !!title && !!body && title !== body
              const statement = body || title
              const correctText = correctLetter ? optionTextForLetter(correctLetter, q.options) : null
              const state = q.correct ? 'correct' : q.yourAnswer ? 'wrong' : 'skipped'
              return (
                <article key={q.questionId} className="ui-card ui-card-pad" style={{ borderLeft: `3px solid ${state === 'correct' ? 'var(--success)' : state === 'wrong' ? 'var(--error)' : 'var(--border-strong)'}` }}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <span className="text-xs font-semibold tracking-wider uppercase role-text-muted">Question {i + 1}</span>
                    <span className={`ui-badge ${state === 'correct' ? 'is-success' : state === 'wrong' ? 'is-danger' : 'is-neutral'}`}>
                      {state === 'correct' ? 'Correct' : state === 'wrong' ? 'Incorrect' : 'Skipped'} · {q.earned >= 0 ? `+${q.earned}` : q.earned}
                    </span>
                  </div>
                  {showTitle && <p className="text-sm font-semibold role-text-primary mb-2">{title}</p>}
                  {statement && <div className="mb-4"><MarkdownRenderer content={statement} className="text-sm role-text-primary" /></div>}
                  <div className="grid sm:grid-cols-2 gap-2">
                    {LETTERS.map((opt, idx) => {
                      const isCorrect = correctLetter === opt
                      const isYours = yourLetter === opt
                      const cls = isCorrect
                        ? 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]'
                        : isYours
                          ? 'border-[var(--error)] bg-[var(--error-soft)] text-[var(--error)]'
                          : 'border-[var(--border)] role-text-secondary'
                      return (
                        <div key={opt} className={`flex items-start gap-2 p-3 rounded-lg border text-sm ${cls}`}>
                          <span className="font-semibold shrink-0">{opt}.</span>
                          <span className="flex-1">{q.options?.[idx]}</span>
                          {isCorrect && <Check className="w-4 h-4 shrink-0" aria-label="Correct answer" />}
                          {isYours && !isCorrect && <X className="w-4 h-4 shrink-0" aria-label="Your answer" />}
                        </div>
                      )
                    })}
                  </div>
                  <p className="text-xs role-text-muted mt-3">
                    Your answer: <strong className="role-text-primary">{yourLetter || 'Skipped'}</strong>
                    {correctLetter && <> · Correct: <strong className="text-[var(--success)]">{correctLetter}{correctText ? ` — ${correctText}` : ''}</strong></>}
                  </p>
                  {q.explanation && (
                    <div className="ui-alert is-info mt-3"><Lightbulb aria-hidden="true" /><div><strong>Explanation.</strong> {q.explanation}</div></div>
                  )}
                </article>
              )
            })}
            {!result.mcqDetails?.length && <EmptyState icon={ListChecks} title="No multiple-choice questions" />}
          </div>
        )}

        {activeTab === 'coding' && (
          <div className="grid gap-4">
            {result.codingDetails?.map((q: any, i: number) => {
              const hints = q.hintsUnlocked || result.unlockedHints?.[String(q.questionId)]?.length || 0
              return (
                <article key={q.questionId} className="ui-card ui-card-pad">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold role-text-primary flex-1 min-w-0">Q{i + 1}. {q.problemStatement?.substring(0, 90)}</h3>
                    <div className="flex items-center gap-3">
                      <span className={`ui-badge ${q.status === 'ACCEPTED' ? 'is-success' : q.status === 'PARTIAL' ? 'is-warning' : 'is-neutral'}`}>{String(q.status || 'Not attempted').replace(/_/g, ' ').toLowerCase()}</span>
                      <span className="font-display text-lg role-text-primary ui-num">{q.score}/{q.marks}</span>
                    </div>
                  </div>
                  <ul className="ui-meta mt-3">
                    <li><CheckCircle2 /> {q.passedPublic}/{q.totalPublic} public tests passed</li>
                    {q.language && <li><Code2 /> {q.language}</li>}
                  </ul>
                  {hints > 0 && (
                    <div className="ui-alert is-warning mt-4">
                      <Lightbulb aria-hidden="true" />
                      <div className="flex-1">{hints} hint{hints > 1 ? 's' : ''} unlocked{q.hintDeduction > 0 && <> · <strong>−{q.hintDeduction} marks</strong> penalty</>}</div>
                    </div>
                  )}
                </article>
              )
            })}
            {!result.codingDetails?.length && <EmptyState icon={Code2} title="No coding questions" />}
          </div>
        )}
      </main>
    </div>
  )
}
