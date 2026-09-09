'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api } from '@/lib/api'

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
      .finally(() => setLoading(false))
  }, [attemptId])

  if (loading) return (
    <div className="min-h-screen bg-mesh"><Sidebar role="STUDENT" /><Navbar title="Results" />
      <main className="page-content flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
      </main>
    </div>
  )

  if (!result || result.message) return (
    <div className="min-h-screen bg-mesh"><Sidebar role="STUDENT" /><Navbar title="Results" />
      <main className="page-content max-w-2xl">
        <div className="glass-card p-12 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h1 className="text-xl font-bold role-text-primary mb-2">Results Not Yet Available</h1>
          <p className="role-text-muted text-sm">{result?.message || 'Please check back later.'}</p>
          <button onClick={() => router.push('/dashboard/student/exams')} className="btn-primary mt-6">← Back to Exams</button>
        </div>
      </main>
    </div>
  )

  const percentage = Math.round((result.totalScore / result.totalMarks) * 100)

  return (
    <div className="min-h-screen bg-mesh">
      <Sidebar role="STUDENT" />
      <Navbar title="Exam Results" />
      <main className="page-content max-w-4xl">
        <button onClick={() => router.push('/dashboard/student/exams')} className="btn-secondary mb-6 text-sm">← Back to Exams</button>

        {/* Hero Result Card */}
        <div className={`glass-card p-8 mb-6 relative overflow-hidden ${result.passed ? 'border-green-500/30' : 'border-red-500/30'}`}>
          <div className={`absolute inset-0 opacity-10 ${result.passed ? 'bg-green-500' : 'bg-red-500'}`} />
          <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            {/* Score Circle */}
            <div className="shrink-0 text-center">
              <div className={`w-36 h-36 rounded-full border-4 flex flex-col items-center justify-center
                ${result.passed ? 'border-green-500 bg-green-500/10' : 'border-red-500 bg-red-500/10'}`}>
                <p className="text-4xl font-black role-text-primary">{percentage}%</p>
                <p className="text-xs role-text-muted font-semibold">Score</p>
              </div>
              <p className={`text-xl font-black mt-3 ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                {result.passed ? '🎉 PASSED' : '❌ FAILED'}
              </p>
            </div>

            {/* Stats */}
            <div className="flex-1 space-y-3">
              <h1 className="text-xl font-bold role-text-primary">{result.examTitle}</h1>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { label: 'Total Score', value: `${result.totalScore} / ${result.totalMarks}`, highlight: true },
                  { label: 'MCQ Score', value: result.mcqScore ?? '—' },
                  { label: 'Coding Score', value: result.codingScore ?? '—' },
                  { label: 'Passing Marks', value: result.passingMarks },
                  { label: 'Time Taken', value: result.timeTaken ? `${Math.round(result.timeTaken / 60)}m ${result.timeTaken % 60}s` : '—' },
                  ...(result.rank ? [{ label: 'Your Rank', value: `#${result.rank} 🏆` }] : []),
                ].map(s => (
                  <div key={s.label} className={`p-3 rounded-xl ${s.highlight ? 'bg-[var(--accent-soft)] border border-[var(--accent)]/30' : 'bg-[var(--bg-raised)]'}`}>
                    <p className="text-xs role-text-muted">{s.label}</p>
                    <p className={`text-lg font-bold ${s.highlight ? 'text-[var(--accent-text)]' : 'role-text-primary'}`}>{s.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 glass-subtle rounded-xl w-fit">
          {(['summary', 'mcq', 'coding'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${activeTab === t ? 'bg-[var(--accent)] text-white shadow' : 'role-text-muted hover:role-text-primary'}`}>
              {t === 'summary' ? '📈 Summary' : t === 'mcq' ? '📝 MCQ Detail' : '💻 Coding Detail'}
            </button>
          ))}
        </div>

        {/* Summary */}
        {activeTab === 'summary' && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* MCQ Summary */}
            <div className="glass-card p-6">
              <h2 className="font-bold role-text-primary mb-4">Section A — MCQ</h2>
              <div className="space-y-2 text-sm">
                {(() => {
                  const total = result.mcqDetails?.length || 0
                  const correct = result.mcqDetails?.filter((q: any) => q.correct).length || 0
                  const wrong = result.mcqDetails?.filter((q: any) => !q.correct && q.yourAnswer).length || 0
                  const skipped = total - correct - wrong
                  return [
                    { label: 'Correct', value: correct, color: 'text-green-400' },
                    { label: 'Wrong', value: wrong, color: 'text-red-400' },
                    { label: 'Skipped', value: skipped, color: 'text-gray-400' },
                    { label: 'Total', value: total, color: 'role-text-primary' },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center">
                      <span className="role-text-muted">{item.label}</span>
                      <span className={`font-bold ${item.color}`}>{item.value}</span>
                    </div>
                  ))
                })()}
              </div>
            </div>
            {/* Coding Summary */}
            <div className="glass-card p-6">
              <h2 className="font-bold role-text-primary mb-4">Section B — Coding</h2>
              <div className="space-y-3">
                {result.codingDetails?.map((q: any, i: number) => (
                  <div key={q.questionId} className="flex items-center justify-between text-sm">
                    <span className="role-text-muted line-clamp-1 flex-1 pr-4">Q{i + 1}. {q.problemStatement?.substring(0, 40)}...</span>
                    <span className={`font-bold shrink-0 ${q.status === 'ACCEPTED' ? 'text-green-400' : q.status === 'PARTIAL' ? 'text-yellow-400' : 'role-text-muted'}`}>
                      {q.score}/{q.marks}
                    </span>
                  </div>
                ))}
                {!result.codingDetails?.length && <p className="text-sm role-text-muted">No coding questions</p>}
              </div>
            </div>
          </div>
        )}

        {/* MCQ Detail */}
        {activeTab === 'mcq' && (
          <div className="space-y-3">
            {result.mcqDetails?.map((q: any, i: number) => (
              <div key={q.questionId} className={`glass-card p-5 border ${q.correct ? 'border-green-500/20' : q.yourAnswer ? 'border-red-500/20' : 'border-[var(--border)]'}`}>
                <div className="flex items-start gap-3">
                  <span className={`text-xl shrink-0 ${q.correct ? 'text-green-400' : q.yourAnswer ? 'text-red-400' : 'text-gray-500'}`}>
                    {q.correct ? '✓' : q.yourAnswer ? '✗' : '—'}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm role-text-primary font-medium mb-3">Q{i + 1}. {q.questionText}</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {['A', 'B', 'C', 'D'].map((opt, idx) => (
                        <div key={opt} className={`p-2 rounded-lg border
                          ${q.correctAnswer === opt && q.yourAnswer === opt ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                            q.correctAnswer === opt ? 'bg-green-500/10 border-green-500/20 text-green-300' :
                            q.yourAnswer === opt ? 'bg-red-500/15 border-red-500/30 text-red-400' :
                            'border-[var(--border)] role-text-muted'}`}>
                          <span className="font-bold mr-1">{opt}.</span>{q.options?.[idx]}
                        </div>
                      ))}
                    </div>
                    {q.explanation && (
                      <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <p className="text-xs text-blue-400"><strong>💡 Explanation:</strong> {q.explanation}</p>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className={q.correct ? 'text-green-400' : 'text-red-400'}>
                        {q.earned >= 0 ? `+${q.earned}` : q.earned} marks
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Coding Detail */}
        {activeTab === 'coding' && (
          <div className="space-y-4">
            {result.codingDetails?.map((q: any, i: number) => (
              <div key={q.questionId} className="glass-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold role-text-primary text-sm">
                    Q{i + 1}. {q.problemStatement?.substring(0, 60)}...
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`badge text-xs ${q.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-400' : q.status === 'PARTIAL' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {q.status}
                    </span>
                    <span className="text-sm font-bold role-text-primary">{q.score}/{q.marks}</span>
                  </div>
                </div>
                <div className="flex gap-4 text-xs role-text-muted">
                  <span>Public: {q.passedPublic}/{q.totalPublic} passed</span>
                  {q.language && <span>Language: {q.language}</span>}
                </div>
              </div>
            ))}
            {!result.codingDetails?.length && (
              <div className="glass-card p-10 text-center role-text-muted">No coding questions in this exam</div>
            )}
          </div>
        )}

        <div className="flex justify-center mt-8">
          <button onClick={() => router.push('/dashboard/student/exams')} className="btn-primary px-8">← Back to Exams</button>
        </div>
      </main>
    </div>
  )
}
