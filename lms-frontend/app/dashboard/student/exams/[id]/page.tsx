'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import { api } from '@/lib/api'

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
    if (!agreed) { alert('Please agree to the terms before starting'); return }
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
      alert(e.response?.data?.message || 'Failed to start exam')
      setStarting(false)
    }
  }

  if (loading) return (
    <div className="portal-page"><StudentReferenceShell active="exams" />
      <main id="student-main" tabIndex={-1} className="portal-main flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></main>
    </div>
  )

  if (!exam) return null

  const hasExisting = exam.existingAttempt

  return (
    <div className="portal-page">
      <StudentReferenceShell active="exams" />
      <main id="student-main" tabIndex={-1} className="portal-main max-w-3xl">
        <button onClick={() => router.push('/dashboard/student/exams')} className="btn-secondary mb-6 text-sm">← Back to Exams</button>

        {/* Scheduled Banner */}
        {isScheduledFuture && (
          <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-4 mb-6 shadow-sm">
            <span className="text-2xl shrink-0">⏳</span>
            <div className="flex-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-base font-bold text-amber-300">Exam is Scheduled</h3>
                <span className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/40 text-xs font-mono font-bold">
                  Opens in {formatCountdown(startAtMs - currentTime)}
                </span>
              </div>
              <p className="text-xs text-amber-200/80 mt-1 leading-relaxed">
                This exam is scheduled to open on <span className="font-semibold text-amber-200">{new Date(exam.startAt).toLocaleString()}</span>. The start button will unlock automatically when the scheduled time arrives.
              </p>
            </div>
          </div>
        )}

        {/* Ended Banner */}
        {isEnded && (
          <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-start gap-4 mb-6">
            <span className="text-2xl shrink-0">🛑</span>
            <div className="flex-1">
              <h3 className="text-base font-bold text-red-400">Exam Concluded</h3>
              <p className="text-xs text-red-300/80 mt-1">
                The deadline for this exam was {new Date(exam.endAt).toLocaleString()}. It is no longer accepting new attempts.
              </p>
            </div>
          </div>
        )}

        {/* Exam Header */}
        <div className="glass-card p-8 mb-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-3xl">📝</span>
              <div>
                <h1 className="text-2xl font-bold role-text-primary">{exam.title}</h1>
                {exam.description && <p className="text-sm role-text-muted mt-1">{exam.description}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Exam Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { icon: '⏱', label: 'Duration', value: `${exam.durationMinutes} minutes` },
            { icon: '📊', label: 'Total Marks', value: exam.totalMarks },
            { icon: '✓', label: 'Passing Marks', value: exam.passingMarks },
            { icon: '🔄', label: 'Attempts', value: `${exam.existingAttempt ? 1 : 0} / ${exam.attemptLimit}` },
          ].map(item => (
            <div key={item.label} className="stat-card text-center">
              <div className="text-xl mb-1">{item.icon}</div>
              <p className="text-lg font-bold role-text-primary">{item.value}</p>
              <p className="text-xs role-text-muted">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Sections */}
        <div className="glass-card p-6 mb-6">
          <h2 className="text-base font-bold role-text-primary mb-4">Exam Sections</h2>
          <div className="space-y-3">
            {exam.sections?.map((s: any) => (
              <div key={s.section} className="flex items-center gap-4 p-4 bg-[var(--bg-raised)] rounded-xl">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black
                  ${s.section === 'A' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                  {s.section}
                </div>
                <div className="flex-1">
                  <p className="font-semibold role-text-primary text-sm">
                    Section {s.section} — {s.section === 'A' ? 'Multiple Choice Questions (MCQ)' : 'Coding Questions'}
                  </p>
                  <p className="text-xs role-text-muted">{s.count} questions · {s.marks} marks</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Instructions */}
        {exam.instructions && (
          <div className="glass-card p-6 mb-6">
            <h2 className="text-base font-bold role-text-primary mb-4">📋 Instructions</h2>
            <div className="prose prose-sm role-text-secondary whitespace-pre-wrap text-sm leading-relaxed">
              {exam.instructions}
            </div>
          </div>
        )}

        {/* Feature Alerts */}
        <div className="space-y-3 mb-6">
          {exam.negativeMarking && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <span className="text-xl shrink-0">⚠️</span>
              <div>
                <p className="text-sm font-semibold text-red-400">Negative Marking Enabled</p>
                <p className="text-xs text-red-300/80">Wrong MCQ answers will deduct marks. Unanswered questions carry no penalty.</p>
              </div>
            </div>
          )}
          {exam.tabSwitchMonitoring && (
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
              <span className="text-xl shrink-0">👁</span>
              <div>
                <p className="text-sm font-semibold text-yellow-400">Tab-Switch Monitoring Enabled</p>
                <p className="text-xs text-yellow-300/80">Do not switch browser tabs or minimize during the exam. Violations will be logged.</p>
              </div>
            </div>
          )}
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
            <span className="text-xl shrink-0">💾</span>
            <div>
              <p className="text-sm font-semibold text-blue-400">Auto-Save Enabled</p>
              <p className="text-xs text-blue-300/80">Your answers are saved automatically every time you select or type. Refreshing the page is safe.</p>
            </div>
          </div>
        </div>

        {/* Existing Attempt */}
        {hasExisting && hasExisting.status === 'IN_PROGRESS' && (
          <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 mb-6">
            <p className="text-sm text-green-400 font-semibold">You have an ongoing attempt. Click "Resume" to continue.</p>
          </div>
        )}

        {/* Agreement + Start */}
        {(!hasExisting || hasExisting.status === 'IN_PROGRESS') && !isEnded && (
          <div className="glass-card p-6 space-y-4">
            {!hasExisting && !isScheduledFuture && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="exam-agree-checkbox"
                  className="mt-1 w-4 h-4 rounded accent-[var(--accent)]"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                />
                <span className="text-sm role-text-secondary">
                  I have read and understood all the instructions. I will not use any unfair means during the exam.
                </span>
              </label>
            )}

            {isScheduledFuture ? (
              <div className="space-y-2 text-center">
                <button
                  id="start-exam-btn"
                  disabled
                  className="btn-secondary w-full py-4 text-base font-bold border-amber-500/30 bg-amber-500/10 text-amber-300 cursor-not-allowed opacity-80 flex items-center justify-center gap-2"
                >
                  <span>⏳ Opens in {formatCountdown(startAtMs - currentTime)}</span>
                </button>
                <p className="text-xs text-slate-400">
                  Scheduled for {new Date(exam.startAt).toLocaleString()}. Unlocks automatically!
                </p>
              </div>
            ) : (
              <button
                id="start-exam-btn"
                onClick={hasExisting ? () => router.push(`/dashboard/student/exams/${examId}/attempt?attemptId=${hasExisting.id}`) : handleStart}
                disabled={starting || (!hasExisting && !agreed)}
                className="btn-primary w-full py-4 text-lg font-bold shadow-lg shadow-indigo-600/30"
              >
                {starting ? 'Starting...' : hasExisting ? '▶ Resume Exam' : '🚀 Start Exam Now'}
              </button>
            )}
          </div>
        )}

        {hasExisting && hasExisting.status !== 'IN_PROGRESS' && (
          <button onClick={() => router.push(`/dashboard/student/exams/${examId}/result?attemptId=${hasExisting.id}`)} className="btn-primary w-full py-4 text-lg font-bold">
            📊 View Your Results
          </button>
        )}
      </main>
    </div>
  )
}
