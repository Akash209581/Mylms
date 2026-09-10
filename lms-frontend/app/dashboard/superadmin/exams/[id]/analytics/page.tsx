'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api } from '@/lib/api'

export default function ExamAnalyticsPage() {
  const params = useParams()
  const router = useRouter()
  const examId = params?.id as string
  const [user, setUser] = useState<any>(null)
  const [exam, setExam] = useState<any>(null)
  const [overview, setOverview] = useState<any>(null)
  const [dist, setDist] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [qAnalytics, setQAnalytics] = useState<{ mcq: any[]; coding: any[] }>({ mcq: [], coding: [] })
  const [tab, setTab] = useState<'overview' | 'students' | 'questions'>('overview')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { router.push('/login'); return }
    setUser(JSON.parse(stored))
    fetchAll()
  }, [examId])

  const fetchAll = async () => {
    setLoading(true)
    setError('')
    try {
      const [examR, overviewR, distR, studR, qR] = await Promise.all([
        api.get(`/exams/${examId}`),
        api.get(`/exams/${examId}/analytics`),
        api.get(`/exams/${examId}/analytics/distribution`),
        api.get(`/exams/${examId}/analytics/students`, { params: { page: 1, limit: 500 } }),
        api.get(`/exams/${examId}/analytics/questions`),
      ])
      setExam(examR.data)
      setOverview(overviewR.data)
      setDist(distR.data)
      setStudents(studR.data.rows || [])
      setQAnalytics(qR.data)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const exportCsv = () => {
    const header = ['Rank', 'Name', 'Email', 'Reg No', 'MCQ Score', 'Coding Score', 'Total', 'Passed', 'Time (min)', 'Tab switches', 'Auto-submit reason']
    const rows = students.map(s => [
      s.rank, s.name, s.email, s.regNo || '',
      s.mcqScore ?? '', s.codingScore ?? '', s.totalScore ?? '',
      s.passed ? 'PASS' : 'FAIL',
      s.timeTakenMinutes != null ? Math.round(s.timeTakenMinutes) : '',
      s.tabSwitchCount ?? 0,
      s.autoSubmittedReason || '',
    ])
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exam?.title || 'exam'}-results.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const examBase = '/dashboard/superadmin/exams'
  const maxDistCount = Math.max(...dist.map(d => d.count), 1)
  const assigned = overview?.assigned ?? exam?.assignedStudents ?? 0
  const submitted = overview?.submitted || 0

  if (loading) return (
    <div className="min-h-screen bg-mesh"><Sidebar role="SUPERADMIN" /><Navbar title="Analytics" />
      <main className="page-content flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></main>
    </div>
  )

  return (
    <div className="min-h-screen bg-mesh">
      <Sidebar role={user?.role || 'SUPERADMIN'} />
      <Navbar title="Exam Analytics" />
      <main className="page-content">
        <button onClick={() => router.push(examBase)} className="btn-secondary mb-6 text-sm">← Back to Exams</button>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-400">{error}</div>
        )}

        <div className="glass-card p-6 mb-6">
          <h1 className="text-2xl font-bold role-text-primary">{exam?.title}</h1>
          <p className="text-sm role-text-muted mt-1">Analytics Dashboard</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {[
            { label: 'Assigned', value: assigned },
            { label: 'Submitted', value: `${submitted}${assigned ? ` / ${assigned}` : ''}` },
            { label: 'Pass Rate', value: `${overview?.passRate || 0}%` },
            { label: 'Avg Total', value: overview?.avgScore ?? '—' },
            { label: 'Avg MCQ', value: overview?.avgMcqScore ?? '—' },
            { label: 'Avg Coding', value: overview?.avgCodingScore ?? '—' },
          ].map(k => (
            <div key={k.label} className="stat-card">
              <p className="text-2xl font-bold role-text-primary">{k.value}</p>
              <p className="text-xs role-text-muted">{k.label}</p>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="stat-card">
            <p className="text-2xl font-bold role-text-primary">{overview?.maxScore ?? '—'}</p>
            <p className="text-xs role-text-muted">Highest</p>
          </div>
          <div className="stat-card">
            <p className="text-2xl font-bold role-text-primary">{overview?.minScore ?? '—'}</p>
            <p className="text-xs role-text-muted">Lowest</p>
          </div>
        </div>

        <div className="flex gap-1 mb-6 p-1 glass-subtle rounded-xl w-fit">
          {(['overview', 'students', 'questions'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-[var(--accent)] text-white shadow' : 'role-text-muted hover:role-text-primary'}`}>
              {t === 'overview' ? '📈 Score Distribution' : t === 'students' ? '👥 Students' : '📝 Questions'}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="glass-card p-6">
            <h2 className="text-base font-bold role-text-primary mb-6">Score Distribution</h2>
            {dist.length === 0 ? (
              <p className="text-center py-10 role-text-muted">No submissions yet</p>
            ) : (
              <div className="flex items-end gap-2 h-48">
                {dist.map(d => (
                  <div key={d.range} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-xs role-text-primary font-bold">{d.count}</span>
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-[var(--accent)] to-[var(--accent-text)] transition-all"
                      style={{ height: `${(d.count / maxDistCount) * 160}px`, minHeight: d.count > 0 ? '8px' : '0' }}
                    />
                    <span className="text-[10px] role-text-muted text-center leading-tight">{d.range}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'students' && (
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <h2 className="font-bold role-text-primary">Student leaderboard</h2>
              <button onClick={exportCsv} disabled={!students.length} className="btn-secondary text-xs">
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="role-data-table w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    {['Rank','Name','Email','Reg No','MCQ','Coding','Total','Passed','Time','Tab switches','Submit'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold role-text-muted py-4 px-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={`${s.studentId}-${s.attemptNumber || 0}`} className="border-b hover:bg-[var(--bg-surface)]/5 transition-colors"
                      style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <td className="py-3 px-4">
                        {s.rank <= 3 ? (
                          <span className={`font-black text-lg ${s.rank === 1 ? 'text-yellow-400' : s.rank === 2 ? 'text-slate-300' : 'text-amber-600'}`}>
                            {['🥇','🥈','🥉'][s.rank - 1]}
                          </span>
                        ) : <span className="text-sm role-text-muted">#{s.rank}</span>}
                      </td>
                      <td className="py-3 px-4 text-sm role-text-primary font-medium">{s.name}</td>
                      <td className="py-3 px-4 text-xs role-text-muted">{s.email}</td>
                      <td className="py-3 px-4 text-xs role-text-muted">{s.regNo || '—'}</td>
                      <td className="py-3 px-4 text-sm role-text-primary">{s.mcqScore ?? '—'}</td>
                      <td className="py-3 px-4 text-sm role-text-primary">{s.codingScore ?? '—'}</td>
                      <td className="py-3 px-4 text-sm font-bold role-text-primary">{s.totalScore ?? '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`badge text-xs ${s.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {s.passed ? '✓ PASS' : '✗ FAIL'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs role-text-muted">
                        {s.timeTakenMinutes ? `${Math.round(s.timeTakenMinutes)}m` : '—'}
                      </td>
                      <td className="py-3 px-4 text-sm role-text-primary">{s.tabSwitchCount ?? 0}</td>
                      <td className="py-3 px-4 text-xs role-text-muted">
                        {s.autoSubmittedReason === 'TAB_SWITCH' ? 'Tab switch' : s.autoSubmittedReason === 'TIMER' ? 'Timer' : '—'}
                      </td>
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan={11} className="text-center py-10 role-text-muted">No submissions yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'questions' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-base font-bold role-text-primary mb-4">Section A — MCQ Accuracy</h2>
              <p className="text-xs role-text-muted mb-4">Accuracy is correct answers ÷ all submitted attempts (skipped counts against accuracy).</p>
              <div className="space-y-3">
                {qAnalytics.mcq.map((q, i) => {
                  const title = q.questionText || ''
                  const body = q.problemStatement || ''
                  const counts = q.optionCounts || {}
                  return (
                  <div key={q.questionId} className="p-4 bg-[var(--bg-raised)] rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 pr-4">
                        <p className="text-sm role-text-primary font-medium">Q{i + 1}. {title || body || 'Untitled'}</p>
                        {body && body !== title && (
                          <p className="text-xs role-text-muted mt-1 whitespace-pre-line">{body}</p>
                        )}
                      </div>
                      <span className={`text-sm font-bold shrink-0 ${q.accuracy >= 60 ? 'text-green-400' : q.accuracy >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {q.accuracy ?? 0}%
                      </span>
                    </div>
                    <div className="w-full bg-[var(--bg-hover)] rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${q.accuracy >= 60 ? 'bg-green-500' : q.accuracy >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${q.accuracy || 0}%` }} />
                    </div>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs role-text-muted">
                      <span>✓ {q.correct} correct</span>
                      <span>✗ {q.incorrect} wrong</span>
                      <span>— {q.unanswered} skipped</span>
                      <span>{q.totalAttempts} attempts</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mt-3">
                      {['A', 'B', 'C', 'D'].map((opt, idx) => (
                        <div key={opt} className={`p-2 rounded-lg border text-xs ${q.correctAnswer === opt ? 'border-green-500/30 bg-green-500/10 text-green-300' : 'border-[var(--border)] role-text-muted'}`}>
                          <span className="font-bold">{opt}</span>
                          {q.options?.[idx] ? <span className="block mt-0.5 line-clamp-2">{q.options[idx]}</span> : null}
                          <span className="block mt-1 font-semibold">{counts[opt] || 0} picked</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  )
                })}
                {qAnalytics.mcq.length === 0 && <p className="text-sm role-text-muted">No MCQ data yet</p>}
              </div>
            </div>

            <div className="glass-card p-6">
              <h2 className="text-base font-bold role-text-primary mb-4">Section B — Coding Performance</h2>
              <div className="space-y-3">
                {qAnalytics.coding.map((q, i) => (
                  <div key={q.questionId} className="p-4 bg-[var(--bg-raised)] rounded-xl">
                    <p className="text-sm role-text-primary font-medium mb-2">
                      Q{i + 1}. {q.questionText || q.problemStatement || 'Untitled'}
                    </p>
                    {q.problemStatement && q.problemStatement !== q.questionText && (
                      <p className="text-xs role-text-muted mb-2 whitespace-pre-line">{q.problemStatement}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-xs">
                      <span className="role-text-muted">Submissions: <strong className="role-text-primary">{q.submissions}</strong></span>
                      <span className="role-text-muted">Accepted: <strong className="text-green-400">{q.accepted}</strong></span>
                      <span className="role-text-muted">Avg Score: <strong className="role-text-primary">{q.avgScore}/{q.marks}</strong></span>
                      {q.avgPublicPassRate != null && (
                        <span className="role-text-muted">Public pass rate: <strong className="role-text-primary">{q.avgPublicPassRate}%</strong></span>
                      )}
                    </div>
                  </div>
                ))}
                {qAnalytics.coding.length === 0 && <p className="text-sm role-text-muted">No coding data yet</p>}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
