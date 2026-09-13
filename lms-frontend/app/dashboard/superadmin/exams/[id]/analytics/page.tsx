'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api } from '@/lib/api'

function formatSeconds(sec?: number) {
  if (!sec || isNaN(sec) || sec <= 0) return '0s'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  if (m > 0 && s > 0) return `${m}m ${s}s`
  if (m > 0) return `${m}m`
  return `${s}s`
}

function formatTimestamp(isoStr?: string) {
  if (!isoStr) return '—'
  try {
    const d = new Date(isoStr)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return isoStr
  }
}

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

  // Drilldown modal state
  const [selectedStudent, setSelectedStudent] = useState<any>(null)
  const [studentDetailLoading, setStudentDetailLoading] = useState(false)
  const [studentDetail, setStudentDetail] = useState<any>(null)

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

  const openStudentModal = async (student: any) => {
    setSelectedStudent(student)
    setStudentDetailLoading(true)
    try {
      const res = await api.get(`/exams/${examId}/analytics/students/${student.studentId}`)
      setStudentDetail(res.data)
    } catch (err) {
      console.warn('Failed to load student details:', err)
      setStudentDetail(null)
    } finally {
      setStudentDetailLoading(false)
    }
  }

  const exportCsv = () => {
    const header = [
      'Rank', 'Name', 'Email', 'Reg No', 'MCQ Score', 'Coding Score', 'Total',
      'Passed', 'Time (min)', 'Wrong Submissions', 'Face Coverage %',
      'Inactivity Duration', 'Tab switches', 'Auto-submit reason'
    ]
    const rows = students.map(s => [
      s.rank, s.name, s.email, s.regNo || '',
      s.mcqScore ?? '', s.codingScore ?? '', s.totalScore ?? '',
      s.passed ? 'PASS' : 'FAIL',
      s.timeTakenMinutes != null ? Math.round(s.timeTakenMinutes) : '',
      s.wrongSubmissionsCount ?? 0,
      `${Number(s.faceCoveragePercent ?? 100).toFixed(1)}%`,
      formatSeconds(s.inactivityDurationSeconds),
      s.tabSwitchCount ?? 0,
      s.autoSubmittedReason || '',
    ])
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${exam?.title || 'exam'}-analytics-results.csv`
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold role-text-primary">{exam?.title}</h1>
              <p className="text-sm role-text-muted mt-1">Comprehensive Assessment Analytics & Proctoring Telemetry</p>
            </div>
            <button onClick={exportCsv} disabled={!students.length} className="btn-primary text-xs flex items-center gap-2 self-start sm:self-center">
              <span>📥</span> Export Full CSV
            </button>
          </div>
        </div>

        {/* Top Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
          {[
            { label: 'Assigned', value: assigned, icon: '👥' },
            { label: 'Submitted', value: `${submitted}${assigned ? ` / ${assigned}` : ''}`, icon: '📝' },
            { label: 'Pass Rate', value: `${overview?.passRate || 0}%`, icon: '🎯' },
            { label: 'Avg Total', value: overview?.avgScore ?? '—', icon: '📊' },
            { label: 'Avg MCQ', value: overview?.avgMcqScore ?? '—', icon: '🔘' },
            { label: 'Avg Coding', value: overview?.avgCodingScore ?? '—', icon: '💻' },
          ].map(k => (
            <div key={k.label} className="stat-card">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs role-text-muted">{k.label}</span>
                <span className="text-sm">{k.icon}</span>
              </div>
              <p className="text-2xl font-bold role-text-primary">{k.value}</p>
            </div>
          ))}
        </div>

        {/* Proctoring & Integrity Telemetry Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="stat-card border-l-4 border-l-indigo-500">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs role-text-muted font-semibold uppercase tracking-wider">Avg Face Coverage</span>
              <span className="text-lg">📷</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {overview?.avgFaceCoverage != null ? `${overview.avgFaceCoverage}%` : '100%'}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {overview?.totalFaceViolations || 0} total face anomalies recorded
            </p>
          </div>

          <div className="stat-card border-l-4 border-l-amber-500">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs role-text-muted font-semibold uppercase tracking-wider">Avg Inactivity</span>
              <span className="text-lg">⏳</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {formatSeconds(overview?.avgInactivitySeconds)}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Max idle: {formatSeconds(overview?.maxInactivitySeconds)}
            </p>
          </div>

          <div className="stat-card border-l-4 border-l-rose-500">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs role-text-muted font-semibold uppercase tracking-wider">Tab Switches</span>
              <span className="text-lg">⚠️</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {overview?.totalTabSwitches || 0}
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              {overview?.studentsWithTabSwitches || 0} students flagged
            </p>
          </div>

          <div className="stat-card border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs role-text-muted font-semibold uppercase tracking-wider">Score Range</span>
              <span className="text-lg">🏆</span>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {overview?.maxScore ?? '—'} <span className="text-xs text-slate-400 font-normal">/ {overview?.minScore ?? '—'}</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-1">
              Highest / Lowest Score
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 p-1 glass-subtle rounded-xl w-fit">
          {(['overview', 'students', 'questions'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize ${tab === t ? 'bg-[var(--accent)] text-white shadow' : 'role-text-muted hover:role-text-primary'}`}>
              {t === 'overview' ? '📈 Score Distribution' : t === 'students' ? '👥 Students & Telemetry' : '📝 Questions Breakdown'}
            </button>
          ))}
        </div>

        {/* ─── TAB 1: OVERVIEW ────────────────────────────────────────── */}
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

        {/* ─── TAB 2: STUDENTS ────────────────────────────────────────── */}
        {tab === 'students' && (
          <div className="glass-card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div>
                <h2 className="font-bold role-text-primary">Student Leaderboard & Proctoring Breakdown</h2>
                <p className="text-xs role-text-muted mt-0.5">Click "View Details" on any student to inspect code submissions, wrong attempts count, and timestamps</p>
              </div>
              <button onClick={exportCsv} disabled={!students.length} className="btn-secondary text-xs">
                Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="role-data-table w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    {['Rank', 'Name', 'Email', 'MCQ', 'Coding', 'Total', 'Passed', 'Wrong Runs', 'Face Cov.', 'Inactivity', 'Tab Switches', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold role-text-muted py-4 px-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => {
                    const faceCov = Number(s.faceCoveragePercent ?? 100)
                    return (
                      <tr key={`${s.studentId}-${s.attemptNumber || 0}`} className="border-b hover:bg-[var(--bg-surface)]/5 transition-colors"
                        style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                        <td className="py-3 px-4">
                          {s.rank <= 3 ? (
                            <span className={`font-black text-lg ${s.rank === 1 ? 'text-yellow-400' : s.rank === 2 ? 'text-slate-300' : 'text-amber-600'}`}>
                              {['🥇', '🥈', '🥉'][s.rank - 1]}
                            </span>
                          ) : <span className="text-sm role-text-muted">#{s.rank}</span>}
                        </td>
                        <td className="py-3 px-4 text-sm role-text-primary font-medium">{s.name}</td>
                        <td className="py-3 px-4 text-xs role-text-muted">{s.email}</td>
                        <td className="py-3 px-4 text-sm role-text-primary font-semibold">{s.mcqScore ?? '—'}</td>
                        <td className="py-3 px-4 text-sm role-text-primary font-semibold">{s.codingScore ?? '—'}</td>
                        <td className="py-3 px-4 text-sm font-bold text-indigo-600 dark:text-indigo-400">{s.totalScore ?? '—'}</td>
                        <td className="py-3 px-4">
                          <span className={`badge text-xs ${s.passed ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'}`}>
                            {s.passed ? '✓ PASS' : '✗ FAIL'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold">
                          <span className={s.wrongSubmissionsCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}>
                            {s.wrongSubmissionsCount || 0} wrong
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            faceCov >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            faceCov >= 75 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {faceCov.toFixed(0)}%
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs role-text-muted">
                          {formatSeconds(s.inactivityDurationSeconds)}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          <span className={s.tabSwitchCount > 0 ? 'text-rose-600 font-bold' : 'text-slate-500'}>
                            {s.tabSwitchCount || 0}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => openStudentModal(s)}
                            className="px-3 py-1 text-xs font-semibold bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30 transition-colors shadow-sm"
                          >
                            👁️ View Details
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                  {students.length === 0 && (
                    <tr><td colSpan={12} className="text-center py-10 role-text-muted">No submissions yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 3: QUESTIONS BREAKDOWN ──────────────────────────────── */}
        {tab === 'questions' && (
          <div className="space-y-6">
            {/* Coding Questions Performance */}
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold role-text-primary">Section B — Coding Questions Performance</h2>
                  <p className="text-xs role-text-muted mt-0.5">Tracking correct submission timestamps, count of wrong submissions, and pass rates</p>
                </div>
              </div>
              <div className="space-y-4">
                {qAnalytics.coding.map((q, i) => (
                  <div key={q.questionId} className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm dark:bg-[var(--bg-raised)] dark:border-white/10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <p className="text-sm text-slate-900 dark:text-white font-bold">
                        Q{i + 1}. {q.questionText || q.problemStatement || 'Untitled'}
                      </p>
                      <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200 self-start sm:self-auto">
                        {q.marks} Marks
                      </span>
                    </div>
                    {q.problemStatement && q.problemStatement !== q.questionText && (
                      <p className="text-xs text-slate-500 mb-3 whitespace-pre-line line-clamp-2">{q.problemStatement}</p>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200/60 dark:border-white/10">
                        <span className="text-[11px] text-slate-400 block font-medium">Total Runs</span>
                        <strong className="text-lg font-bold text-slate-900 dark:text-white">{q.totalRuns || q.submissions || 0}</strong>
                      </div>
                      <div className="p-3 bg-emerald-50/60 dark:bg-emerald-500/10 rounded-xl border border-emerald-200/60 dark:border-emerald-500/20">
                        <span className="text-[11px] text-emerald-600 block font-medium">✓ Accepted</span>
                        <strong className="text-lg font-bold text-emerald-600">{q.accepted || 0}</strong>
                      </div>
                      <div className="p-3 bg-rose-50/60 dark:bg-rose-500/10 rounded-xl border border-rose-200/60 dark:border-rose-500/20">
                        <span className="text-[11px] text-rose-600 block font-medium">✗ Wrong Runs</span>
                        <strong className="text-lg font-bold text-rose-600">{q.wrongSubmissions || 0}</strong>
                      </div>
                      <div className="p-3 bg-indigo-50/60 dark:bg-indigo-500/10 rounded-xl border border-indigo-200/60 dark:border-indigo-500/20">
                        <span className="text-[11px] text-indigo-600 block font-medium">Avg Score</span>
                        <strong className="text-lg font-bold text-indigo-600">{q.avgScore}/{q.marks}</strong>
                      </div>
                    </div>

                    {/* Timeline of Correct Submissions */}
                    {q.correctTimeline && q.correctTimeline.length > 0 && (
                      <div className="pt-3 border-t border-slate-200/80 dark:border-white/10">
                        <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider block mb-2">
                          ⏱️ Correct Submissions Timeline ({q.correctTimeline.length} solved)
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {q.correctTimeline.map((item: any, idx: number) => (
                            <span key={idx} className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-medium shadow-xs">
                              <span className="font-semibold">{item.studentName}:</span>
                              <span className="text-emerald-600 font-mono">+{formatSeconds(item.elapsedSeconds)}</span>
                              <span className="text-[10px] text-slate-400">({formatTimestamp(item.timestamp)})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {qAnalytics.coding.length === 0 && <p className="text-sm role-text-muted">No coding questions in this exam</p>}
              </div>
            </div>

            {/* MCQ Accuracy */}
            <div className="glass-card p-6">
              <h2 className="text-base font-bold role-text-primary mb-2">Section A — MCQ Accuracy</h2>
              <p className="text-xs role-text-muted mb-4">Accuracy is correct answers ÷ all submitted attempts</p>
              <div className="space-y-3">
                {qAnalytics.mcq.map((q, i) => {
                  const title = q.questionText || ''
                  const body = q.problemStatement || ''
                  const counts = q.optionCounts || {}
                  return (
                    <div key={q.questionId} className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm dark:bg-[var(--bg-raised)] dark:border-white/10">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 pr-4">
                          <p className="text-sm role-text-primary font-medium">Q{i + 1}. {title || body || 'Untitled'}</p>
                          {body && body !== title && (
                            <p className="text-xs role-text-muted mt-1 whitespace-pre-line">{body}</p>
                          )}
                        </div>
                        <span className={`text-sm font-bold shrink-0 ${q.accuracy >= 60 ? 'text-green-600' : q.accuracy >= 30 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {q.accuracy ?? 0}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
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
                          <div key={opt} className={`p-2 rounded-lg border text-xs ${q.correctAnswer === opt ? 'border-green-500/40 bg-green-50 text-green-800' : 'border-slate-200 text-slate-600'}`}>
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
          </div>
        )}

        {/* ─── STUDENT DRILLDOWN MODAL ─────────────────────────────────── */}
        {selectedStudent && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-50/50 dark:bg-white/5">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>👤</span> {selectedStudent.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedStudent.email} • Reg No: {selectedStudent.regNo || '—'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 flex items-center justify-center font-bold text-sm transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Score & Telemetry Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-2xl border border-indigo-200 dark:border-indigo-500/30">
                    <span className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold block">Total Score</span>
                    <strong className="text-xl font-bold text-indigo-700 dark:text-indigo-300">
                      {selectedStudent.totalScore ?? '—'}
                    </strong>
                    <span className="text-[10px] text-slate-500 block">MCQ: {selectedStudent.mcqScore ?? 0} | Code: {selectedStudent.codingScore ?? 0}</span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold block">Face Coverage</span>
                    <strong className="text-xl font-bold text-slate-900 dark:text-white">
                      {Number(selectedStudent.faceCoveragePercent ?? 100).toFixed(0)}%
                    </strong>
                    <span className="text-[10px] text-slate-500 block">{selectedStudent.faceViolationsCount || 0} violations</span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold block">Inactivity</span>
                    <strong className="text-xl font-bold text-slate-900 dark:text-white">
                      {formatSeconds(selectedStudent.inactivityDurationSeconds)}
                    </strong>
                    <span className="text-[10px] text-slate-500 block">Total test idle time</span>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10">
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold block">Tab Switches</span>
                    <strong className="text-xl font-bold text-slate-900 dark:text-white">
                      {selectedStudent.tabSwitchCount || 0}
                    </strong>
                    <span className="text-[10px] text-slate-500 block">
                      {selectedStudent.autoSubmittedReason ? `Auto-submit: ${selectedStudent.autoSubmittedReason}` : 'Normal submit'}
                    </span>
                  </div>
                </div>

                {studentDetailLoading ? (
                  <div className="py-12 flex justify-center">
                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* Coding Submissions & Questions Breakdown */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        💻 Coding Questions Breakdown
                      </h4>

                      {studentDetail?.codingSubmissions && studentDetail.codingSubmissions.length > 0 ? (
                        studentDetail.codingSubmissions.map((sub: any) => {
                          const timeline = studentDetail?.attempt?.codingTimeline || []
                          const questionEvents = timeline.filter((ev: any) => Number(ev.questionId) === Number(sub.questionId))
                          const correctEvent = questionEvents.find((ev: any) => ev.status === 'ACCEPTED')
                          const wrongEventsCount = questionEvents.filter((ev: any) => ev.status !== 'ACCEPTED').length

                          return (
                            <div key={sub.id} className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <h5 className="font-bold text-slate-900 dark:text-white text-sm">
                                    {sub.questionText || sub.problemStatement || `Question #${sub.questionId}`}
                                  </h5>
                                  <div className="flex flex-wrap gap-2 text-xs mt-1">
                                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-medium">
                                      Lang: {sub.language}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded-md font-bold ${
                                      sub.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                                    }`}>
                                      {sub.status}
                                    </span>
                                    <span className="text-slate-500">
                                      Score: <strong>{sub.score}</strong> | Cases: {sub.passedCases}/{sub.totalCases}
                                    </span>
                                  </div>
                                </div>

                                <div className="text-right sm:text-right">
                                  {correctEvent ? (
                                    <div className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                                      ✓ Correct at +{formatSeconds(correctEvent.elapsedSeconds)} ({formatTimestamp(correctEvent.timestamp)})
                                    </div>
                                  ) : (
                                    <div className="text-xs text-amber-600 font-medium bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 inline-block">
                                      No correct submission
                                    </div>
                                  )}
                                  <div className="text-[11px] text-slate-500 mt-1">
                                    {wrongEventsCount} wrong attempt{wrongEventsCount !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              </div>

                              {/* Submitted Code View */}
                              {sub.code && (
                                <div className="mt-2">
                                  <span className="text-[11px] font-mono font-bold text-slate-500 uppercase block mb-1">Submitted Code:</span>
                                  <pre className="p-3 bg-slate-900 text-slate-100 rounded-xl text-xs font-mono overflow-x-auto max-h-48 border border-slate-800">
                                    <code>{sub.code}</code>
                                  </pre>
                                </div>
                              )}
                            </div>
                          )
                        })
                      ) : (
                        <p className="text-sm text-slate-400 py-4 text-center">No coding submissions recorded for this attempt.</p>
                      )}
                    </div>

                    {/* Tab Switch Logs */}
                    {studentDetail?.attempt?.tabSwitchLog && studentDetail.attempt.tabSwitchLog.length > 0 && (
                      <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-2">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                          ⚠️ Tab Switch Event Log ({studentDetail.attempt.tabSwitchLog.length})
                        </h4>
                        <div className="space-y-1.5 max-h-40 overflow-y-auto">
                          {studentDetail.attempt.tabSwitchLog.map((log: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-rose-50/50 dark:bg-rose-500/5 rounded-lg text-xs border border-rose-200/60 dark:border-rose-500/20 text-rose-800 dark:text-rose-300">
                              <span>Switch #{idx + 1} {log.questionId ? `on Question #${log.questionId}` : ''}</span>
                              <span className="font-mono font-semibold">+{formatSeconds(log.elapsedSeconds)} ({formatTimestamp(log.timestamp)})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-white/10 flex justify-end bg-slate-50/50 dark:bg-white/5">
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="btn-secondary text-xs px-5 py-2"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

