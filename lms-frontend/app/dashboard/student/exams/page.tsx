'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import { api } from '@/lib/api'
import { EmptyState, Loading, PageHeader, Stat, StatusBadge } from '@/components/ui'
import { ArrowRight, Award, BarChart3, CalendarClock, CheckCircle2, ClipboardList, Clock, FileText, Hourglass, Lock, PlayCircle, Radio, Target, XCircle } from 'lucide-react'

export default function StudentExamsPage() {
  const router = useRouter()
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { router.push('/login'); return }
    api.get('/student/exams').then(r => setExams(Array.isArray(r.data) ? r.data : [])).catch(() => setExams([])).finally(() => setLoading(false))
  }, [])

  const getTimeLeft = (endAt?: string) => {
    if (!endAt) return null
    const diff = new Date(endAt).getTime() - Date.now()
    if (diff <= 0) return 'Ended'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`
  }

  const getTimeUntilStart = (startAt?: string) => {
    if (!startAt) return null
    const diff = new Date(startAt).getTime() - Date.now()
    if (diff <= 0) return null
    const d = Math.floor(diff / 86400000)
    const h = Math.floor((diff % 86400000) / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    if (d > 0) return `Opens in ${d}d ${h}h`
    if (h > 0) return `Opens in ${h}h ${m}m`
    return `Opens in ${m}m`
  }

  const formatDateTime = (d?: string) => {
    if (!d) return ''
    return new Date(d).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const live = exams.filter(e => e.status === 'LIVE' && e.attemptStatus !== 'SUBMITTED' && e.attemptStatus !== 'EVALUATED').length
  const done = exams.filter(e => e.attemptStatus === 'SUBMITTED' || e.attemptStatus === 'EVALUATED').length

  return (
    <div className="portal-page">
      <StudentReferenceShell active="exams" />
      <main id="student-main" tabIndex={-1} className="portal-main">
        <PageHeader
          eyebrow="Assessment centre"
          title="My exams"
          description="Assessments assigned to you by your college. Live exams can be started right away."
        />

        {!loading && exams.length > 0 && (
          <div className="ui-grid-sm mb-8">
            <Stat label="Assigned" value={exams.length} icon={ClipboardList} />
            <Stat label="Live now" value={live} icon={Radio} tone="success" />
            <Stat label="Completed" value={done} icon={CheckCircle2} tone="gold" />
          </div>
        )}

        {loading ? (
          <Loading label="Loading exams" />
        ) : exams.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No exams yet">
            When your instructor assigns an exam, it will appear here with its schedule and duration.
          </EmptyState>
        ) : (
          <div className="ui-grid">
            {exams.map(exam => {
              const isInProgress = exam.attemptStatus === 'IN_PROGRESS'
              const isSubmitted = exam.attemptStatus === 'SUBMITTED' || exam.attemptStatus === 'EVALUATED'
              const timeLeft = getTimeLeft(exam.endAt)
              const timeUntilStart = getTimeUntilStart(exam.startAt)
              const isScheduled = exam.status === 'SCHEDULED' || (timeUntilStart && exam.status !== 'COMPLETED')
              const go = (suffix = '') => router.push(`/dashboard/student/exams/${exam.id}${suffix}`)

              return (
                <article key={exam.id} className={`ui-card ui-card-pad ui-card-interactive${exam.status === 'LIVE' && !isSubmitted ? ' ui-card-accent' : ''}`}>
                  <div className="ui-card-header">
                    <div className="min-w-0">
                      <StatusBadge status={isInProgress ? 'IN_PROGRESS' : exam.status} label={isInProgress ? 'In progress' : undefined} />
                      <h3 className="ui-card-title">{exam.title}</h3>
                    </div>
                    <span className="ui-icon-tile" aria-hidden="true"><FileText /></span>
                  </div>

                  <ul className="ui-meta mt-4">
                    <li><Clock /> {exam.durationMinutes} min</li>
                    <li><Award /> {exam.totalMarks} marks</li>
                    <li><Target /> Pass {exam.passingMarks}</li>
                    {timeLeft && !isSubmitted && !isScheduled && (
                      <li className={timeLeft === 'Ended' ? '' : 'text-[var(--warning)]'}><Hourglass /> {timeLeft}</li>
                    )}
                  </ul>

                  {exam.startAt && isScheduled && (
                    <div className="ui-alert is-warning mt-4">
                      <CalendarClock aria-hidden="true" />
                      <span className="flex-1">Starts {formatDateTime(exam.startAt)}</span>
                      {timeUntilStart && <strong>{timeUntilStart}</strong>}
                    </div>
                  )}

                  {isSubmitted && (
                    <div className={`ui-result mt-4 ${exam.passed ? 'is-pass' : 'is-fail'}`}>
                      <span className="ui-result-label">
                        {exam.passed ? <CheckCircle2 aria-hidden="true" /> : <XCircle aria-hidden="true" />}
                        {exam.passed ? 'Passed' : 'Not passed'}
                      </span>
                      <span className="ui-result-score">
                        {Number(exam.totalScore ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        <small> / {exam.totalMarks}</small>
                      </span>
                    </div>
                  )}

                  <div className="ui-card-footer">
                    {isInProgress ? (
                      <button onClick={() => go(`/attempt?attemptId=${exam.attemptId}`)} className="ui-btn ui-btn-primary ui-btn-block">
                        <PlayCircle aria-hidden="true" /> Resume exam
                      </button>
                    ) : isSubmitted ? (
                      <button onClick={() => go(`/result?attemptId=${exam.attemptId}`)} className="ui-btn ui-btn-secondary ui-btn-block">
                        <BarChart3 aria-hidden="true" /> View results
                      </button>
                    ) : exam.status === 'LIVE' ? (
                      <button onClick={() => go()} className="ui-btn ui-btn-primary ui-btn-block">
                        Start exam <ArrowRight aria-hidden="true" />
                      </button>
                    ) : exam.status === 'SCHEDULED' ? (
                      <button onClick={() => go()} className="ui-btn ui-btn-secondary ui-btn-block">
                        View details
                      </button>
                    ) : (
                      <button disabled className="ui-btn ui-btn-secondary ui-btn-block">
                        <Lock aria-hidden="true" /> Exam closed
                      </button>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
