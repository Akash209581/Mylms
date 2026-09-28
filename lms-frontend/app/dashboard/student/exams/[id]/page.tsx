'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import Link from 'next/link'
import { api } from '@/lib/api'
import { toast } from '@/lib/toast'
import { EmptyState, Loading, PageHeader } from '@/components/ui'
import { AlertTriangle, ArrowLeft, ArrowRight, BarChart3, CalendarClock, Code2, Eye, FileWarning, Hourglass, ListChecks, Loader2, Lock, PlayCircle, Save } from 'lucide-react'

export default function ExamInstructionsPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params?.id as string

  const [exam, setExam] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [currentTime, setCurrentTime] = useState<number>(Date.now())

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { router.push('/login'); return }
    api.get(`/student/exams/${examId}`)
      .then(r => setExam(r.data))
      .catch(() => setExam(null))
      .finally(() => setLoading(false))
  }, [examId])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const startAtMs = exam?.startAt ? new Date(exam.startAt).getTime() : 0
  const endAtMs = exam?.endAt ? new Date(exam.endAt).getTime() : 0

  const isScheduledFuture = (exam?.status === 'SCHEDULED' || !!startAtMs) && startAtMs > currentTime
  const isEnded = (exam?.status === 'COMPLETED' || !!endAtMs) && endAtMs > 0 && currentTime >= endAtMs

  const formatCountdown = (ms: number) => {
    if (ms <= 0) return '00:00:00'
    const totalSec = Math.floor(ms / 1000)
    const days = Math.floor(totalSec / 86400)
    const hours = Math.floor((totalSec % 86400) / 3600)
    const minutes = Math.floor((totalSec % 3600) / 60)
    const seconds = totalSec % 60

    const pad = (n: number) => String(n).padStart(2, '0')
    if (days > 0) {
      return `${days}d ${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
    }
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  const handleStart = async () => {
    if (!agreed) { toast.warning('Please confirm you have read the instructions first.'); return }
    setStarting(true)
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen().catch(() => {})
      } else if ((document.documentElement as any).webkitRequestFullscreen) {
        await (document.documentElement as any).webkitRequestFullscreen().catch(() => {})
      }
    } catch {
      // fullscreen might be triggered or handled by the attempt page modal
    }
    try {
      const r = await api.post(`/student/exams/${examId}/start`)
      const attemptId = r.data.attemptId
      router.push(`/dashboard/student/exams/${examId}/attempt?attemptId=${attemptId}`)
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Could not start the exam. Please try again.')
      setStarting(false)
    }
  }

  if (loading) return (
    <div className="portal-page"><StudentReferenceShell active="exams" />
      <main id="student-main" tabIndex={-1} className="portal-main"><Loading label="Loading exam" /></main>
    </div>
  )

  if (!exam) return (
    <div className="portal-page"><StudentReferenceShell active="exams" />
      <main id="student-main" tabIndex={-1} className="portal-main">
        <EmptyState icon={FileWarning} title="Exam not available" action={<Link href="/dashboard/student/exams" className="ui-btn ui-btn-secondary">Back to exams</Link>}>
          This exam could not be loaded. It may have been removed or is not assigned to you.
        </EmptyState>
      </main>
    </div>
  )

  const hasExisting = exam.existingAttempt
  const canStart = (!hasExisting || hasExisting.status === 'IN_PROGRESS') && !isEnded

  return (
    <div className="portal-page">
      <StudentReferenceShell active="exams" />
      <main id="student-main" tabIndex={-1} className="portal-main">
        <Link href="/dashboard/student/exams" className="ui-back"><ArrowLeft aria-hidden="true" /> All exams</Link>

        <PageHeader
          eyebrow="Exam briefing"
          title={exam.title}
          description={exam.description || 'Read the briefing carefully before you begin.'}
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] items-start">
          <div className="grid gap-6 min-w-0">
            {isScheduledFuture && (
              <div className="ui-alert is-warning">
                <CalendarClock aria-hidden="true" />
                <div><strong>Scheduled.</strong> Opens {new Date(exam.startAt).toLocaleString()}. The start button unlocks automatically.</div>
              </div>
            )}
            {isEnded && (
              <div className="ui-alert is-danger">
                <Lock aria-hidden="true" />
                <div><strong>Closed.</strong> The deadline was {new Date(exam.endAt).toLocaleString()}. New attempts are no longer accepted.</div>
              </div>
            )}

            <dl className="ui-kv">
              <div><dt>Duration</dt><dd>{exam.durationMinutes} min</dd></div>
              <div><dt>Total marks</dt><dd>{exam.totalMarks}</dd></div>
              <div><dt>Pass mark</dt><dd>{exam.passingMarks}</dd></div>
              <div><dt>Attempts</dt><dd>{exam.existingAttempt ? 1 : 0} / {exam.attemptLimit}</dd></div>
            </dl>

            {exam.sections?.length > 0 && (
              <section className="ui-card ui-card-pad">
                <h2 className="ui-section-title mb-4">Sections</h2>
                <div className="grid gap-3">
                  {exam.sections.map((s: any) => (
                    <div key={s.section} className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--bg-raised)]">
                      <span className={`ui-icon-tile ${s.section === 'A' ? '' : 'is-gold'}`} aria-hidden="true">
                        {s.section === 'A' ? <ListChecks /> : <Code2 />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold role-text-primary text-sm">
                          Section {s.section} · {s.section === 'A' ? 'Multiple choice' : 'Coding'}
                        </p>
                        <p className="text-xs role-text-muted mt-0.5">{s.count} questions · {s.marks} marks</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {exam.instructions && (
              <section className="ui-card ui-card-pad">
                <h2 className="ui-section-title mb-3">Instructions</h2>
                <div className="role-text-secondary whitespace-pre-wrap text-sm leading-7">{exam.instructions}</div>
              </section>
            )}

            <section className="grid gap-3">
              {exam.negativeMarking && (
                <div className="ui-alert is-danger"><AlertTriangle aria-hidden="true" /><div><strong>Negative marking.</strong> Wrong MCQ answers deduct marks. Unanswered questions carry no penalty.</div></div>
              )}
              {exam.tabSwitchMonitoring && (
                <div className="ui-alert is-warning"><Eye aria-hidden="true" /><div><strong>Tab-switch monitoring.</strong> Don&apos;t switch tabs or minimise the window. Every switch is logged.</div></div>
              )}
              <div className="ui-alert is-info"><Save aria-hidden="true" /><div><strong>Auto-save.</strong> Answers are saved as you go, so refreshing the page is safe.</div></div>
            </section>
          </div>

          <aside className="ui-card ui-card-pad ui-card-accent-gold lg:sticky lg:top-24">
            <h2 className="ui-section-title">{hasExisting && hasExisting.status !== 'IN_PROGRESS' ? 'Your attempt' : 'Ready to begin?'}</h2>

            {isScheduledFuture ? (
              <>
                <p className="ui-card-sub mt-2">This exam opens in</p>
                <p className="font-display text-3xl role-text-primary mt-1 ui-num">{formatCountdown(startAtMs - currentTime)}</p>
                <button id="start-exam-btn" disabled className="ui-btn ui-btn-secondary ui-btn-block ui-btn-lg mt-5">
                  <Hourglass aria-hidden="true" /> Not open yet
                </button>
              </>
            ) : canStart ? (
              <>
                {hasExisting ? (
                  <div className="ui-alert is-success mt-4"><PlayCircle aria-hidden="true" /><div>You have an attempt in progress.</div></div>
                ) : (
                  <label className="flex items-start gap-3 cursor-pointer mt-4 p-3 rounded-lg border border-[var(--border)] bg-[var(--bg-raised)]">
                    <input
                      type="checkbox"
                      id="exam-agree-checkbox"
                      className="mt-1 w-4 h-4 shrink-0 accent-[var(--accent)]"
                      checked={agreed}
                      onChange={e => setAgreed(e.target.checked)}
                    />
                    <span className="text-sm role-text-secondary leading-6">
                      I have read the instructions and will not use unfair means during this exam.
                    </span>
                  </label>
                )}
                <button
                  id="start-exam-btn"
                  onClick={hasExisting ? () => router.push(`/dashboard/student/exams/${examId}/attempt?attemptId=${hasExisting.id}`) : handleStart}
                  disabled={starting || (!hasExisting && !agreed)}
                  className="ui-btn ui-btn-primary ui-btn-block ui-btn-lg mt-5"
                >
                  {starting ? <><Loader2 className="animate-spin" aria-hidden="true" /> Starting…</> : hasExisting ? <><PlayCircle aria-hidden="true" /> Resume exam</> : <>Start exam <ArrowRight aria-hidden="true" /></>}
                </button>
                <p className="ui-hint mt-3 text-center">The exam opens in full-screen mode.</p>
              </>
            ) : hasExisting ? (
              <button onClick={() => router.push(`/dashboard/student/exams/${examId}/result?attemptId=${hasExisting.id}`)} className="ui-btn ui-btn-primary ui-btn-block ui-btn-lg mt-5">
                <BarChart3 aria-hidden="true" /> View your results
              </button>
            ) : (
              <p className="ui-card-sub mt-2">This exam is closed.</p>
            )}
          </aside>
        </div>
      </main>
    </div>
  )
}
