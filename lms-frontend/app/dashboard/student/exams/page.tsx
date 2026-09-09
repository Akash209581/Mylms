'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api } from '@/lib/api'

const statusStyle: Record<string, string> = {
  LIVE:      'bg-green-500/20 text-green-400 border-green-500/30',
  SCHEDULED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  COMPLETED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
}

export default function StudentExamsPage() {
  const router = useRouter()
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { router.push('/login'); return }
    api.get('/student/exams').then(r => setExams(r.data)).finally(() => setLoading(false))
  }, [])

  const getTimeLeft = (endAt?: string) => {
    if (!endAt) return null
    const diff = new Date(endAt).getTime() - Date.now()
    if (diff <= 0) return 'Ended'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    return h > 0 ? `${h}h ${m}m left` : `${m}m left`
  }

  return (
    <div className="min-h-screen bg-mesh">
      <Sidebar role="STUDENT" />
      <Navbar title="My Exams" />
      <main className="page-content">
        <div className="role-page-header mb-8">
          <div className="relative z-10">
            <p className="role-eyebrow">Assessment Center</p>
            <h1>My Exams</h1>
            <p className="text-sm md:text-base opacity-80">Corporate-grade assessments assigned to you</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></div>
        ) : exams.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">📋</div>
            <p className="role-text-muted">No exams assigned to you yet.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {exams.map(exam => {
              const hasAttempt = exam.attemptId
              const isInProgress = exam.attemptStatus === 'IN_PROGRESS'
              const isSubmitted = exam.attemptStatus === 'SUBMITTED' || exam.attemptStatus === 'EVALUATED'
              const timeLeft = getTimeLeft(exam.endAt)
              return (
                <div key={exam.id} className="glass-card p-6 flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <span className={`badge border text-xs ${statusStyle[exam.status] || ''}`}>{exam.status}</span>
                      <h3 className="text-base font-bold role-text-primary mt-2 leading-snug">{exam.title}</h3>
                    </div>
                    <div className="text-2xl shrink-0">📝</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs role-text-muted">
                    <span>⏱ {exam.durationMinutes} min</span>
                    <span>📊 {exam.totalMarks} marks</span>
                    <span>✓ Pass: {exam.passingMarks}</span>
                    {timeLeft && <span className={timeLeft === 'Ended' ? 'text-red-400' : 'text-yellow-400'}>{timeLeft}</span>}
                  </div>

                  {isSubmitted && (
                    <div className={`rounded-xl p-3 text-center ${exam.passed ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                      <p className={`text-sm font-black ${exam.passed ? 'text-green-400' : 'text-red-400'}`}>
                        {exam.passed ? '🎉 PASSED' : '❌ FAILED'}
                      </p>
                      <p className="text-xl font-black role-text-primary">{exam.totalScore} / {exam.totalMarks}</p>
                    </div>
                  )}

                  <div className="mt-auto flex gap-2">
                    {isInProgress ? (
                      <button
                        onClick={() => router.push(`/dashboard/student/exams/${exam.id}/attempt?attemptId=${exam.attemptId}`)}
                        className="btn-primary flex-1 text-sm animate-pulse"
                      >
                        ▶ Resume Exam
                      </button>
                    ) : isSubmitted ? (
                      <button
                        onClick={() => router.push(`/dashboard/student/exams/${exam.id}/result?attemptId=${exam.attemptId}`)}
                        className="btn-secondary flex-1 text-sm"
                      >
                        📊 View Results
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push(`/dashboard/student/exams/${exam.id}`)}
                        className="btn-primary flex-1 text-sm"
                        disabled={exam.status !== 'LIVE'}
                      >
                        {exam.status === 'LIVE' ? '🚀 Start Exam' : '⏳ Not Yet Live'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
