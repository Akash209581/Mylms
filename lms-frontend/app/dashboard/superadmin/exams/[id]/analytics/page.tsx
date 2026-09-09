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
  const [rankings, setRankings] = useState<any[]>([])
  const [tab, setTab] = useState<'overview' | 'students' | 'questions' | 'rankings'>('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { router.push('/login'); return }
    setUser(JSON.parse(stored))
    fetchAll()
  }, [examId])

  const fetchAll = async () => {
    setLoading(true)
    const [examR, overviewR, distR, studR, qR, rankR] = await Promise.all([
      api.get(`/exams/${examId}`),
      api.get(`/exams/${examId}/analytics`),
      api.get(`/exams/${examId}/analytics/distribution`),
      api.get(`/exams/${examId}/analytics/students`),
      api.get(`/exams/${examId}/analytics/questions`),
      api.get(`/exams/${examId}/rankings`),
    ])
    setExam(examR.data)
    setOverview(overviewR.data)
    setDist(distR.data)
    setStudents(studR.data.rows || [])
    setQAnalytics(qR.data)
    setRankings(rankR.data)
    setLoading(false)
  }

  const role = user?.role === 'SUPERADMIN' ? 'superadmin' : 'admin'
  const maxDistCount = Math.max(...dist.map(d => d.count), 1)

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
        <button onClick={() => router.push(`/dashboard/${role}/exams`)} className="btn-secondary mb-6 text-sm">← Back to Exams</button>

        <div className="glass-card p-6 mb-6">
          <h1 className="text-2xl font-bold role-text-primary">{exam?.title}</h1>
          <p className="text-sm role-text-muted mt-1">Analytics Dashboard</p>
        </div>

        {/* Overview KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Submissions', value: overview?.submitted || 0, color: 'from-blue-500 to-blue-600' },
            { label: 'Pass Rate', value: `${overview?.passRate || 0}%`, color: 'from-green-500 to-green-600' },
            { label: 'Avg Score', value: overview?.avgScore || '—', color: 'from-purple-500 to-purple-600' },
            { label: 'Highest', value: overview?.maxScore || '—', color: 'from-yellow-500 to-yellow-600' },
            { label: 'Lowest', value: overview?.minScore || '—', color: 'from-red-500 to-red-600' },
          ].map(k => (
            <div key={k.label} className="stat-card">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${k.color} flex items-center justify-center text-white text-lg mb-2`}>📊</div>
              <p className="text-2xl font-bold role-text-primary">{k.value}</p>
              <p className="text-xs role-text-muted">{k.label}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 glass-subtle rounded-xl w-fit">
          {(['overview', 'students', 'questions', 'rankings'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-[var(--accent)] text-white shadow' : 'role-text-muted hover:role-text-primary'}`}>
              {t === 'overview' ? '📈 Score Distribution' : t === 'students' ? '👥 Students' : t === 'questions' ? '📝 Questions' : '🏆 Rankings'}
            </button>
          ))}
        </div>

        {/* Score Distribution */}
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

        {/* Student Performance */}
        {tab === 'students' && (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="role-data-table w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    {['Rank','Name','Email','MCQ Score','Coding Score','Total','Passed','Time'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold role-text-muted py-4 px-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.studentId} className="border-b hover:bg-[var(--bg-surface)]/5 transition-colors"
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
                    </tr>
                  ))}
                  {students.length === 0 && (
                    <tr><td colSpan={8} className="text-center py-10 role-text-muted">No submissions yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Question Analytics */}
        {tab === 'questions' && (
          <div className="space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-base font-bold role-text-primary mb-4">Section A — MCQ Accuracy</h2>
              <div className="space-y-3">
                {qAnalytics.mcq.map((q, i) => (
                  <div key={q.questionId} className="p-4 bg-[var(--bg-raised)] rounded-xl">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm role-text-primary font-medium flex-1 pr-4">Q{i + 1}. {q.questionText?.substring(0, 80)}...</p>
                      <span className={`text-sm font-bold shrink-0 ${q.accuracy >= 60 ? 'text-green-400' : q.accuracy >= 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {q.accuracy}%
                      </span>
                    </div>
                    <div className="w-full bg-[var(--bg-hover)] rounded-full h-2">
                      <div className={`h-2 rounded-full transition-all ${q.accuracy >= 60 ? 'bg-green-500' : q.accuracy >= 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${q.accuracy}%` }} />
                    </div>
                    <div className="flex gap-4 mt-2 text-xs role-text-muted">
                      <span>✓ {q.correct} correct</span>
                      <span>✗ {q.incorrect} wrong</span>
                      <span>— {q.unanswered} skipped</span>
                    </div>
                  </div>
                ))}
                {qAnalytics.mcq.length === 0 && <p className="text-sm role-text-muted">No MCQ data yet</p>}
              </div>
            </div>

            <div className="glass-card p-6">
              <h2 className="text-base font-bold role-text-primary mb-4">Section B — Coding Performance</h2>
              <div className="space-y-3">
                {qAnalytics.coding.map((q, i) => (
                  <div key={q.questionId} className="p-4 bg-[var(--bg-raised)] rounded-xl">
                    <p className="text-sm role-text-primary font-medium mb-2">Q{i + 1}. {q.problemStatement?.substring(0, 80)}...</p>
                    <div className="flex gap-4 text-xs">
                      <span className="role-text-muted">Submissions: <strong className="role-text-primary">{q.submissions}</strong></span>
                      <span className="role-text-muted">Accepted: <strong className="text-green-400">{q.accepted}</strong></span>
                      <span className="role-text-muted">Avg Score: <strong className="role-text-primary">{q.avgScore}/{q.marks}</strong></span>
                    </div>
                  </div>
                ))}
                {qAnalytics.coding.length === 0 && <p className="text-sm role-text-muted">No coding data yet</p>}
              </div>
            </div>
          </div>
        )}

        {/* Rankings */}
        {tab === 'rankings' && (
          <div className="glass-card overflow-hidden">
            <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <h2 className="font-bold role-text-primary">🏆 Leaderboard</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="role-data-table w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    {['Rank','Name','Reg No','Total Score','MCQ','Coding','Result'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold role-text-muted py-3 px-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rankings.map(r => (
                    <tr key={r.studentId} className={`border-b transition-colors ${r.rank <= 3 ? 'bg-yellow-500/5' : ''}`}
                      style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                      <td className="py-3 px-4 font-bold">
                        {r.rank <= 3
                          ? <span className="text-xl">{['🥇','🥈','🥉'][r.rank - 1]}</span>
                          : <span className="text-sm role-text-muted">#{r.rank}</span>}
                      </td>
                      <td className="py-3 px-4 text-sm role-text-primary font-semibold">{r.name}</td>
                      <td className="py-3 px-4 text-xs role-text-muted">{r.regNo || '—'}</td>
                      <td className="py-3 px-4 text-sm font-black role-text-primary">{r.totalScore ?? '—'}</td>
                      <td className="py-3 px-4 text-sm role-text-muted">{r.mcqScore ?? '—'}</td>
                      <td className="py-3 px-4 text-sm role-text-muted">{r.codingScore ?? '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`badge text-xs ${r.passed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {r.passed ? 'PASS' : 'FAIL'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {rankings.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-10 role-text-muted">No results yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
