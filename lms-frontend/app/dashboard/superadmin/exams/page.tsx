'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api } from '@/lib/api'
import { toLocalDatetimeInput, fromLocalDatetimeInput } from '@/lib/date-utils'

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

  const [editingExam, setEditingExam] = useState<any | null>(null)
  const [editForm, setEditForm] = useState({
    title: '',
    durationMinutes: 60,
    startAt: '',
    endAt: '',
    passingMarks: 0,
    status: 'DRAFT',
    timingMode: 'TOTAL',
    maxTabSwitches: 3,
    targetBranches: '',
    targetBatches: '',
    showCorrectAnswers: true,
    showExplanations: true,
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editMsg, setEditMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Clone Exam Modal State
  const [colleges, setColleges] = useState<any[]>([])
  const [cloningExam, setCloningExam] = useState<any | null>(null)
  const [cloneForm, setCloneForm] = useState({
    title: '',
    collegeId: '',
    startAt: '',
    endAt: '',
    targetBranches: '',
    targetBatches: '',
  })
  const [cloning, setCloning] = useState(false)
  const [cloneMsg, setCloneMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Two-Step Delete Exam Modal State
  const [deletingExam, setDeletingExam] = useState<any | null>(null)
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1)
  const [deleteInputText, setDeleteInputText] = useState('')
  const [deletingLoading, setDeletingLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { router.push('/login'); return }
    const u = JSON.parse(stored)
    if (u.role === 'STUDENT') { router.push('/dashboard/student'); return }
    setUser(u)
    loadExams()
    loadColleges()
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

  const loadColleges = async () => {
    try {
      const r = await api.get('/exams/colleges')
      setColleges(r.data || [])
    } catch (err) {
      console.error('Failed to load colleges', err)
    }
  }

  const openEditModal = (exam: any) => {
    setEditingExam(exam)
    setEditMsg(null)
    setEditForm({
      title: exam.title || '',
      durationMinutes: exam.durationMinutes || 60,
      startAt: toLocalDatetimeInput(exam.startAt),
      endAt: toLocalDatetimeInput(exam.endAt),
      passingMarks: exam.passingMarks || 0,
      status: exam.status || 'DRAFT',
      timingMode: exam.timingMode || 'TOTAL',
      maxTabSwitches: exam.maxTabSwitches ?? 3,
      targetBranches: Array.isArray(exam.targetBranches) ? exam.targetBranches.join(', ') : '',
      targetBatches: Array.isArray(exam.targetBatches) ? exam.targetBatches.join(', ') : '',
      showCorrectAnswers: exam.showCorrectAnswers !== false,
      showExplanations: exam.showExplanations !== false,
    })
  }

  const saveTimings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExam) return
    setSavingEdit(true)
    setEditMsg(null)
    try {
      const branches = editForm.targetBranches ? editForm.targetBranches.split(',').map(s => s.trim()).filter(Boolean) : undefined
      const batches = editForm.targetBatches ? editForm.targetBatches.split(',').map(s => s.trim()).filter(Boolean) : undefined

      await api.put(`/exams/${editingExam.id}`, {
        title: editForm.title,
        durationMinutes: Number(editForm.durationMinutes),
        startAt: fromLocalDatetimeInput(editForm.startAt),
        endAt: fromLocalDatetimeInput(editForm.endAt),
        passingMarks: Number(editForm.passingMarks),
        status: editForm.status,
        timingMode: editForm.timingMode,
        maxTabSwitches: Number(editForm.maxTabSwitches),
        targetBranches: branches,
        targetBatches: batches,
        showCorrectAnswers: editForm.showCorrectAnswers,
        showExplanations: editForm.showExplanations,
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

  const openCloneModal = (exam: any) => {
    setCloningExam(exam)
    setCloneMsg(null)
    setCloneForm({
      title: `${exam.title} (Copy)`,
      collegeId: exam.collegeId ? String(exam.collegeId) : '',
      startAt: toLocalDatetimeInput(exam.startAt),
      endAt: toLocalDatetimeInput(exam.endAt),
      targetBranches: Array.isArray(exam.targetBranches) ? exam.targetBranches.join(', ') : '',
      targetBatches: Array.isArray(exam.targetBatches) ? exam.targetBatches.join(', ') : '',
    })
  }

  const handleCloneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cloningExam) return
    setCloning(true)
    setCloneMsg(null)
    try {
      const branches = cloneForm.targetBranches ? cloneForm.targetBranches.split(',').map(s => s.trim()).filter(Boolean) : undefined
      const batches = cloneForm.targetBatches ? cloneForm.targetBatches.split(',').map(s => s.trim()).filter(Boolean) : undefined

      const payload = {
        title: cloneForm.title.trim(),
        collegeId: cloneForm.collegeId ? Number(cloneForm.collegeId) : undefined,
        startAt: fromLocalDatetimeInput(cloneForm.startAt),
        endAt: fromLocalDatetimeInput(cloneForm.endAt),
        targetBranches: branches,
        targetBatches: batches,
      }
      const r = await api.post(`/exams/${cloningExam.id}/clone`, payload)
      setCloneMsg({ type: 'success', text: `Exam cloned successfully as "${r.data?.title}"!` })
      await loadExams()
      setTimeout(() => {
        setCloningExam(null)
      }, 1200)
    } catch (err: any) {
      setCloneMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to clone exam' })
    } finally {
      setCloning(false)
    }
  }

  const openDeleteModal = (exam: any) => {
    setDeletingExam(exam)
    setDeleteStep(1)
    setDeleteInputText('')
    setDeleteError(null)
  }

  const handleDeleteExam = async () => {
    if (!deletingExam || deleteInputText.trim().toUpperCase() !== 'DELETE') return
    setDeletingLoading(true)
    setDeleteError(null)
    try {
      await api.delete(`/exams/${deletingExam.id}`)
      await loadExams()
      setDeletingExam(null)
    } catch (err: any) {
      setDeleteError(err?.response?.data?.message || 'Failed to delete exam')
    } finally {
      setDeletingLoading(false)
    }
  }

  const examBase = '/dashboard/superadmin/exams'

  const getEffectiveStatus = (exam: any) => {
    if (exam.status === 'ARCHIVED') return 'ARCHIVED'
    if (exam.endAt && new Date(exam.endAt).getTime() <= Date.now()) {
      return 'COMPLETED'
    }
    if (exam.startAt && new Date(exam.startAt).getTime() > Date.now() && exam.status !== 'DRAFT') {
      return 'SCHEDULED'
    }
    return exam.status || 'DRAFT'
  }

  const filtered = filter === 'ALL' ? exams : exams.filter(e => getEffectiveStatus(e) === filter)

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
                {s === 'ALL' ? exams.length : exams.filter(e => getEffectiveStatus(e) === s).length}
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
            onClick={() => router.push(`${examBase}/create`)}
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
              <button onClick={() => router.push(`${examBase}/create`)} className="btn-primary mt-4">
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
                  {filtered.map(exam => {
                    const effStatus = getEffectiveStatus(exam)
                    return (
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
                        <span className={`badge border text-xs ${statusColors[effStatus] || ''}`}>
                          {effStatus}
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
                        ) : exam.endAt ? (
                          <div>
                            <span className="opacity-75">
                              Until {new Date(exam.endAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                        ) : (
                          <span className="opacity-50">Immediate / Anytime</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => openCloneModal(exam)}
                            className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1"
                            title="Clone exam for another college / batch"
                          >
                            📋 Clone
                          </button>
                          <span className="role-text-muted">|</span>
                          <button
                            onClick={() => openEditModal(exam)}
                            className="text-xs font-semibold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1"
                            title="Edit Timings and Settings"
                          >
                            🕒 Timings
                          </button>
                          <span className="role-text-muted">|</span>
                          <button
                            onClick={() => router.push(`${examBase}/${exam.id}/questions`)}
                            className="text-xs font-semibold text-[var(--accent-text)] hover:underline"
                          >
                            Questions
                          </button>
                          <span className="role-text-muted">|</span>
                          <button
                            onClick={() => router.push(`${examBase}/${exam.id}/assign`)}
                            className="text-xs font-semibold text-[var(--accent-text)] hover:underline"
                          >
                            Assign
                          </button>
                          <span className="role-text-muted">|</span>
                          <button
                            onClick={() => router.push(`${examBase}/${exam.id}/analytics`)}
                            className="text-xs font-semibold text-[var(--accent-text)] hover:underline"
                          >
                            Analytics
                          </button>
                          <span className="role-text-muted">|</span>
                          <button
                            onClick={() => openDeleteModal(exam)}
                            className="text-xs font-semibold text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1"
                            title="Delete exam with two-step confirmation"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* EDIT TIMINGS & SCHEDULE MODAL */}
        {editingExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass-card max-w-xl w-full p-6 max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-200">
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
                    <label className="block text-xs font-semibold role-text-muted mb-1">Timing Mode</label>
                    <select
                      className="input-field w-full text-xs"
                      value={editForm.timingMode}
                      onChange={e => setEditForm({ ...editForm, timingMode: e.target.value })}
                    >
                      <option value="TOTAL">Total Exam Timer</option>
                      <option value="SECTION">Section-Wise Timer</option>
                      <option value="QUESTION">Question-Wise Timer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold role-text-muted mb-1">Max Tab Switches</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      className="input-field w-full text-xs"
                      value={editForm.maxTabSwitches}
                      onChange={e => setEditForm({ ...editForm, maxTabSwitches: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold role-text-muted mb-1">Target Batches / Years</label>
                    <input
                      type="text"
                      placeholder="e.g. 2024, 2025, 2026"
                      className="input-field w-full text-xs"
                      value={editForm.targetBatches}
                      onChange={e => setEditForm({ ...editForm, targetBatches: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold role-text-muted mb-1">Target Branches</label>
                    <input
                      type="text"
                      placeholder="e.g. CSE, ECE, IT, MECH"
                      className="input-field w-full text-xs"
                      value={editForm.targetBranches}
                      onChange={e => setEditForm({ ...editForm, targetBranches: e.target.value })}
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

                <div className="space-y-2 pt-1">
                  <label className="flex items-center justify-between text-sm">
                    <span className="role-text-primary">Show correct answers to students</span>
                    <input
                      type="checkbox"
                      checked={editForm.showCorrectAnswers}
                      onChange={e => setEditForm({ ...editForm, showCorrectAnswers: e.target.checked })}
                    />
                  </label>
                  <label className="flex items-center justify-between text-sm">
                    <span className="role-text-primary">Show explanations to students</span>
                    <input
                      type="checkbox"
                      checked={editForm.showExplanations}
                      onChange={e => setEditForm({ ...editForm, showExplanations: e.target.checked })}
                    />
                  </label>
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

        {/* CLONE EXAM MODAL */}
        {cloningExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass-card max-w-lg w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-lg font-bold role-text-primary flex items-center gap-2">
                    <span>📋</span> Clone Assessment
                  </h2>
                  <p className="text-xs role-text-muted">Duplicate "{cloningExam.title}" with all questions</p>
                </div>
                <button
                  onClick={() => setCloningExam(null)}
                  className="w-8 h-8 rounded-full bg-[var(--bg-raised)] flex items-center justify-center text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {cloneMsg && (
                <div className={`p-3 rounded-xl text-xs mb-4 ${cloneMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'}`}>
                  {cloneMsg.text}
                </div>
              )}

              <form onSubmit={handleCloneSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold role-text-muted mb-1">Cloned Exam Title *</label>
                  <input
                    type="text"
                    className="input-field w-full font-semibold"
                    value={cloneForm.title}
                    onChange={e => setCloneForm({ ...cloneForm, title: e.target.value })}
                    required
                  />
                </div>

                {user?.role === 'SUPERADMIN' && (
                  <div>
                    <label className="block text-xs font-semibold role-text-muted mb-1">Destination Institution / College (Optional)</label>
                    <select
                      className="input-field w-full text-xs"
                      value={cloneForm.collegeId}
                      onChange={e => setCloneForm({ ...cloneForm, collegeId: e.target.value })}
                    >
                      <option value="">Global Assessment (All / Multi-tenant)</option>
                      {colleges.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.city || c.state || 'College'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold role-text-muted mb-1">Target Batches / Years</label>
                    <input
                      type="text"
                      placeholder="e.g. 2025, 2026"
                      className="input-field w-full text-xs"
                      value={cloneForm.targetBatches}
                      onChange={e => setCloneForm({ ...cloneForm, targetBatches: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold role-text-muted mb-1">Target Branches</label>
                    <input
                      type="text"
                      placeholder="e.g. CSE, IT, ECE"
                      className="input-field w-full text-xs"
                      value={cloneForm.targetBranches}
                      onChange={e => setCloneForm({ ...cloneForm, targetBranches: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold role-text-muted mb-1">Start Date & Time (Optional)</label>
                    <input
                      type="datetime-local"
                      className="input-field w-full text-xs"
                      value={cloneForm.startAt}
                      onChange={e => setCloneForm({ ...cloneForm, startAt: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold role-text-muted mb-1">End Date & Time (Optional)</label>
                    <input
                      type="datetime-local"
                      className="input-field w-full text-xs"
                      value={cloneForm.endAt}
                      onChange={e => setCloneForm({ ...cloneForm, endAt: e.target.value })}
                    />
                  </div>
                </div>

                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs text-indigo-300">
                  💡 All MCQ and Coding questions, predefined code, marks, and settings will be copied into the new draft exam.
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setCloningExam(null)}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={cloning}
                    className="btn-success text-sm font-semibold"
                  >
                    {cloning ? 'Cloning Assessment...' : '🚀 Clone & Create Test'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TWO-STEP DELETE CONFIRMATION MODAL */}
        {deletingExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="glass-card max-w-md w-full p-6 relative border-rose-500/30 animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                    ⚠️
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-rose-400">Delete Assessment</h2>
                    <p className="text-xs role-text-muted">Step {deleteStep} of 2</p>
                  </div>
                </div>
                <button
                  onClick={() => setDeletingExam(null)}
                  className="w-8 h-8 rounded-full bg-[var(--bg-raised)] flex items-center justify-center text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              {deleteError && (
                <div className="p-3 rounded-xl text-xs mb-4 bg-rose-500/10 text-rose-400 border border-rose-500/30">
                  {deleteError}
                </div>
              )}

              {deleteStep === 1 ? (
                <div className="space-y-4">
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                    <p className="font-semibold mb-1">Are you sure you want to delete this test?</p>
                    <p className="opacity-90">
                      Exam: <span className="font-bold text-white">"{deletingExam.title}"</span> (#{deletingExam.id})
                    </p>
                    <p className="opacity-90 mt-0.5">
                      Status: <span className="font-semibold uppercase text-amber-300">{deletingExam.status}</span>
                    </p>
                  </div>

                  <div className="text-xs role-text-muted space-y-1 bg-[var(--bg-raised)] p-3 rounded-xl border border-[var(--border)]">
                    <p className="font-semibold role-text-primary mb-1">⚠️ The following data will be permanently deleted:</p>
                    <p>• All linked test questions & configurations</p>
                    <p>• Assigned college & student assignments</p>
                    <p>• Student submissions, results, and proctoring logs</p>
                  </div>

                  <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    <button
                      type="button"
                      onClick={() => setDeletingExam(null)}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteStep(2)}
                      className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white transition-all shadow-lg shadow-rose-600/20 flex items-center gap-1.5"
                    >
                      Proceed to Step 2 →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-rose-300">
                    To confirm deletion of <strong className="text-white">"{deletingExam.title}"</strong>, type <span className="font-mono font-bold bg-rose-500/20 px-1.5 py-0.5 rounded text-rose-300">DELETE</span> below:
                  </p>

                  <input
                    type="text"
                    value={deleteInputText}
                    onChange={e => setDeleteInputText(e.target.value)}
                    placeholder="Type DELETE to confirm"
                    className="input-field w-full font-mono text-center tracking-wider font-bold border-rose-500/40 focus:border-rose-500"
                    autoFocus
                  />

                  <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                    <button
                      type="button"
                      onClick={() => setDeleteStep(1)}
                      className="btn-secondary text-sm"
                      disabled={deletingLoading}
                    >
                      ← Back
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteExam}
                      disabled={deleteInputText.trim().toUpperCase() !== 'DELETE' || deletingLoading}
                      className="px-4 py-2 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all shadow-lg shadow-rose-600/20 flex items-center gap-1.5"
                    >
                      {deletingLoading ? 'Deleting...' : '🗑️ Confirm & Delete Permanently'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
