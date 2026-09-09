'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api } from '@/lib/api'

const statusColors: Record<string, string> = {
  DRAFT:     'bg-slate-500/20 text-slate-400 border-slate-500/30',
  SCHEDULED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  LIVE:      'bg-green-500/20 text-green-400 border-green-500/30',
  COMPLETED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  ARCHIVED:  'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function ExamListPage() {
  const router = useRouter()
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [user, setUser] = useState<any>(null)

  // Edit Timings Modal
  const [editingExam, setEditingExam] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    durationMinutes: 60,
    startAt: '',
    endAt: '',
    passingMarks: 0,
    status: 'DRAFT',
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editMsg, setEditMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { router.push('/login'); return }
    const u = JSON.parse(stored)
    if (u.role === 'STUDENT') { router.push('/dashboard/student'); return }
    setUser(u)
    loadExams()
  }, [])

  const loadExams = async () => {
    try {
      const r = await api.get('/exams')
      setExams(r.data || [])
    } catch (err) {
      console.error('Failed to load exams', err)
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (exam: any) => {
    setEditingExam(exam)
    setEditMsg(null)
    setEditForm({
      title: exam.title || '',
      durationMinutes: exam.durationMinutes || 60,
      startAt: exam.startAt ? new Date(exam.startAt).toISOString().slice(0, 16) : '',
      endAt: exam.endAt ? new Date(exam.endAt).toISOString().slice(0, 16) : '',
      passingMarks: exam.passingMarks || 0,
      status: exam.status || 'DRAFT',
    })
  }

  const saveTimings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExam) return
    setSavingEdit(true)
    setEditMsg(null)
    try {
      await api.put(`/exams/${editingExam.id}`, {
        title: editForm.title,
        durationMinutes: Number(editForm.durationMinutes),
        startAt: editForm.startAt ? new Date(editForm.startAt).toISOString() : null,
        endAt: editForm.endAt ? new Date(editForm.endAt).toISOString() : null,
        passingMarks: Number(editForm.passingMarks),
        status: editForm.status,
      })
      setEditMsg({ type: 'success', text: 'Exam timings & settings updated!' })
      await loadExams()
      setTimeout(() => setEditingExam(null), 1000)
    } catch (err: any) {
      setEditMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to update exam' })
    } finally {
      setSavingEdit(false)
    }
  }

  const role = user?.role === 'SUPERADMIN' ? 'superadmin' : user?.role === 'ADMIN' ? 'admin' : 'instructor'

  const filtered = filter === 'ALL' ? exams : exams.filter(e => e.status === filter)

  return (
    <div className="min-h-screen bg-mesh">
      <Sidebar role={user?.role || 'SUPERADMIN'} />
      <Navbar title="Exam Management" />
      <main className="page-content">
        {/* Header */}
        <div className="role-page-header mb-8">
          <div className="relative z-10">
            <p className="role-eyebrow">Assessment Platform</p>
            <h1>Exam Management</h1>
            <p className="text-sm md:text-base opacity-80">Create, schedule, assign institutions, and analyze assessments</p>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {['ALL','DRAFT','LIVE','SCHEDULED','COMPLETED'].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`stat-card cursor-pointer text-left transition-all ${filter === s ? 'ring-2 ring-[var(--accent)]' : ''}`}
            >
              <p className="text-2xl font-bold role-text-primary">
                {s === 'ALL' ? exams.length : exams.filter(e => e.status === s).length}
              </p>
              <p className="role-text-muted text-xs mt-1">{s}</p>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold role-text-primary">
            {filter === 'ALL' ? 'All Exams' : `${filter} Exams`}
            <span className="ml-2 text-sm role-text-muted font-normal">({filtered.length})</span>
          </h2>
          <button
            onClick={() => router.push(`/dashboard/${role}/exams/create`)}
            className="btn-primary flex items-center gap-2 shadow-lg shadow-indigo-500/20"
            id="create-exam-btn"
          >
            <span>＋</span> Create Exam
          </button>
        </div>

        {/* Exam Table */}
        <div className="glass-card overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-5xl mb-3">📋</div>
              <p className="role-text-muted">No exams found. Create your first exam!</p>
              <button onClick={() => router.push(`/dashboard/${role}/exams/create`)} className="btn-primary mt-4">
                Create Exam
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="role-data-table w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                    {['Title', 'Status', 'Duration', 'Total Marks', 'Schedule (Start — End)', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-semibold role-text-muted py-4 px-6">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(exam => (
                    <tr
                      key={exam.id}
                      className="border-b hover:bg-[var(--bg-surface)]/10 transition-colors"
                      style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                    >
                      <td className="py-4 px-6">
                        <p className="role-text-primary font-semibold text-sm">{exam.title}</p>
                        <p className="role-text-muted text-xs mt-0.5">#{exam.id}</p>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`badge border text-xs ${statusColors[exam.status] || ''}`}>
                          {exam.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 role-text-muted text-sm">{exam.durationMinutes}m</td>
                      <td className="py-4 px-6 role-text-muted text-sm">{exam.totalMarks}</td>
                      <td className="py-4 px-6 role-text-muted text-xs">
                        {exam.startAt ? (
                          <div>
                            <span className="text-indigo-400 font-medium">
                              {new Date(exam.startAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                            {exam.endAt && (
                              <span className="block opacity-75">
                                to {new Date(exam.endAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="opacity-50">Immediate / Anytime</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(exam)}
                            className="text-xs font-semibold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1"
                            title="Edit Timings and Settings"
                          >
                            🕒 Timings
                          </button>
                          <span className="role-text-muted">|</span>
                          <button
                            onClick={() => router.push(`/dashboard/${role}/exams/${exam.id}/questions`)}
                            className="text-xs font-semibold text-[var(--accent-text)] hover:underline"
                          >
                            Questions
                          </button>
                          <span className="role-text-muted">|</span>
                          <button
                            onClick={() => router.push(`/dashboard/${role}/exams/${exam.id}/assign`)}
                            className="text-xs font-semibold text-[var(--accent-text)] hover:underline"
                          >
                            Assign
                          </button>
                          <span className="role-text-muted">|</span>
                          <button
                            onClick={() => router.push(`/dashboard/${role}/exams/${exam.id}/analytics`)}
                            className="text-xs font-semibold text-[var(--accent-text)] hover:underline"
                          >
                            Analytics
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* EDIT TIMINGS & SCHEDULE MODAL */}
        {editingExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass-card max-w-lg w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-lg font-bold role-text-primary">Edit Timings & Settings</h2>
                  <p className="text-xs role-text-muted">Exam #{editingExam.id} — {editingExam.title}</p>
                </div>
                <button
                  onClick={() => setEditingExam(null)}
                  className="w-8 h-8 rounded-full bg-[var(--bg-raised)] flex items-center justify-center text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {editMsg && (
                <div className={`p-3 rounded-xl text-xs mb-4 ${editMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}`}>
                  {editMsg.text}
                </div>
              )}

              <form onSubmit={saveTimings} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold role-text-muted mb-1">Exam Title</label>
                  <input
                    type="text"
                    className="input-field w-full"
                    value={editForm.title}
                    onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold role-text-muted mb-1">Duration (Minutes)</label>
                    <input
                      type="number"
                      min={10}
                      max={360}
                      className="input-field w-full"
                      value={editForm.durationMinutes}
                      onChange={e => setEditForm({ ...editForm, durationMinutes: Number(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold role-text-muted mb-1">Passing Marks</label>
                    <input
                      type="number"
                      min={0}
                      className="input-field w-full"
                      value={editForm.passingMarks}
                      onChange={e => setEditForm({ ...editForm, passingMarks: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold role-text-muted mb-1">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      className="input-field w-full text-xs"
                      value={editForm.startAt}
                      onChange={e => setEditForm({ ...editForm, startAt: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold role-text-muted mb-1">End Date & Time</label>
                    <input
                      type="datetime-local"
                      className="input-field w-full text-xs"
                      value={editForm.endAt}
                      onChange={e => setEditForm({ ...editForm, endAt: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold role-text-muted mb-1">Status</label>
                  <select
                    className="input-field w-full"
                    value={editForm.status}
                    onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="SCHEDULED">SCHEDULED</option>
                    <option value="LIVE">LIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setEditingExam(null)}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="btn-primary text-sm font-semibold"
                  >
                    {savingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
