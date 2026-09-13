'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api } from '@/lib/api'

export default function ExamAssignPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params?.id as string
  const [user, setUser] = useState<any>(null)
  const [exam, setExam] = useState<any>(null)

  // Institutions State
  const [colleges, setColleges] = useState<any[]>([])
  const [assignedColleges, setAssignedColleges] = useState<any[]>([])
  const [collegeSearch, setCollegeSearch] = useState('')
  const [selectedColleges, setSelectedColleges] = useState<Set<number>>(new Set())
  const [assigningColleges, setAssigningColleges] = useState(false)
  const [assignBranches, setAssignBranches] = useState('')
  const [assignBatches, setAssignBatches] = useState('')

  // Individual Students State (Tab)
  const [activeTab, setActiveTab] = useState<'institutions' | 'students'>('institutions')
  const [students, setStudents] = useState<any[]>([])
  const [assignedStudents, setAssignedStudents] = useState<any[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set())
  const [assigningStudents, setAssigningStudents] = useState(false)

  // Edit Timings Modal State
  const [showEditModal, setShowEditModal] = useState(false)
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
    setUser(JSON.parse(stored))
    fetchData()
  }, [examId])

  const fetchData = async () => {
    try {
      const [examRes, collegesRes, assignedCollegesRes, assignedStudentsRes] = await Promise.all([
        api.get(`/exams/${examId}`),
        api.get('/exams/colleges'),
        api.get(`/exams/${examId}/assigned-colleges`),
        api.get(`/exams/${examId}/assigned`),
      ])
      const e = examRes.data
      setExam(e)
      setColleges(collegesRes.data || [])
      setAssignedColleges(assignedCollegesRes.data || [])
      setAssignedStudents(assignedStudentsRes.data || [])

      if (e.targetBranches && Array.isArray(e.targetBranches)) {
        setAssignBranches(e.targetBranches.join(', '))
      }
      if (e.targetBatches && Array.isArray(e.targetBatches)) {
        setAssignBatches(e.targetBatches.join(', '))
      }

      // Pre-fill edit form
      setEditForm({
        title: e.title || '',
        durationMinutes: e.durationMinutes || 60,
        startAt: e.startAt ? new Date(e.startAt).toISOString().slice(0, 16) : '',
        endAt: e.endAt ? new Date(e.endAt).toISOString().slice(0, 16) : '',
        passingMarks: e.passingMarks || 0,
        status: e.status || 'DRAFT',
      })
    } catch (err) {
      console.error('Failed to load data', err)
    }
  }

  // Institution Assignment
  const toggleSelectCollege = (id: number) => {
    setSelectedColleges(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const assignSelectedColleges = async () => {
    if (!selectedColleges.size) return
    setAssigningColleges(true)
    try {
      const branches = assignBranches ? assignBranches.split(',').map(s => s.trim()).filter(Boolean) : undefined
      const batches = assignBatches ? assignBatches.split(',').map(s => s.trim()).filter(Boolean) : undefined

      const r = await api.post(`/exams/${examId}/assign/colleges`, {
        collegeIds: Array.from(selectedColleges),
        branches,
        batches,
      })
      setSelectedColleges(new Set())
      await fetchData()
      alert(`Assigned ${r.data?.assigned ?? 0} students across selected institution(s)!`)
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to assign institutions')
    } finally {
      setAssigningColleges(false)
    }
  }

  const unassignCollege = async (collegeId: number, collegeName: string) => {
    if (!confirm(`Remove "${collegeName}" and unassign all its students from this exam?`)) return
    try {
      await api.delete(`/exams/${examId}/assign/colleges/${collegeId}`)
      await fetchData()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to unassign institution')
    }
  }

  // Student Assignment
  const searchStudents = async () => {
    if (!studentSearch.trim()) return
    const r = await api.get('/admin/students', { params: { search: studentSearch } })
    setStudents(r.data || [])
  }

  const toggleSelectStudent = (id: number) => {
    setSelectedStudents(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const assignSelectedStudents = async () => {
    if (!selectedStudents.size) return
    setAssigningStudents(true)
    try {
      await api.post(`/exams/${examId}/assign`, { studentIds: Array.from(selectedStudents) })
      setSelectedStudents(new Set())
      await fetchData()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to assign students')
    } finally {
      setAssigningStudents(false)
    }
  }

  const unassignStudent = async (studentId: number) => {
    if (!confirm('Remove this student from the exam?')) return
    try {
      await api.delete(`/exams/${examId}/assign/${studentId}`)
      await fetchData()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to unassign student')
    }
  }

  // Edit Timings Form Save
  const saveTimings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingEdit(true)
    setEditMsg(null)
    try {
      await api.put(`/exams/${examId}`, {
        title: editForm.title,
        durationMinutes: Number(editForm.durationMinutes),
        startAt: editForm.startAt ? new Date(editForm.startAt).toISOString() : null,
        endAt: editForm.endAt ? new Date(editForm.endAt).toISOString() : null,
        passingMarks: Number(editForm.passingMarks),
        status: editForm.status,
      })
      setEditMsg({ type: 'success', text: 'Exam details & timings updated successfully!' })
      await fetchData()
      setTimeout(() => setShowEditModal(false), 1200)
    } catch (err: any) {
      setEditMsg({ type: 'error', text: err?.response?.data?.message || 'Failed to update timings' })
    } finally {
      setSavingEdit(false)
    }
  }

  const examBase = '/dashboard/superadmin/exams'

  const filteredColleges = colleges.filter(c =>
    c.name?.toLowerCase().includes(collegeSearch.toLowerCase()) ||
    c.city?.toLowerCase().includes(collegeSearch.toLowerCase()) ||
    c.state?.toLowerCase().includes(collegeSearch.toLowerCase())
  )

  const totalAssignedStudents = assignedStudents.length

  return (
    <div className="min-h-screen bg-mesh">
      <Sidebar role={user?.role || 'SUPERADMIN'} />
      <Navbar title="Assign Institutions & Students" />
      <main className="page-content max-w-6xl">
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => router.push(`${examBase}/${examId}/questions`)}
            className="btn-secondary text-sm"
          >
            ← Back to Questions
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="btn-secondary text-sm flex items-center gap-2 border-[var(--accent)] text-[var(--accent-text)]"
            >
              🕒 Edit Timings & Schedule
            </button>
            <button
              onClick={() => router.push(`${examBase}/${examId}/analytics`)}
              className="btn-primary text-sm"
            >
              View Analytics →
            </button>
          </div>
        </div>

        {/* Exam Summary Banner */}
        <div className="glass-card p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold role-text-primary">{exam?.title}</h1>
                <span className={`badge text-xs px-2.5 py-0.5 rounded-full font-semibold border
                  ${exam?.status === 'LIVE' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    exam?.status === 'SCHEDULED' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                    'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                  {exam?.status}
                </span>
              </div>
              <p className="text-sm role-text-muted mt-1">
                ⏱️ Duration: <strong>{exam?.durationMinutes} mins</strong> | Passing Marks: <strong>{exam?.passingMarks}</strong>
              </p>
              <p className="text-xs role-text-muted mt-0.5">
                📅 Schedule: {exam?.startAt ? `${new Date(exam.startAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Immediate'}
                {exam?.endAt ? ` to ${new Date(exam.endAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` : ''}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-right p-3 bg-[var(--bg-raised)] rounded-xl">
                <p className="text-xs role-text-muted">Assigned Institutions</p>
                <p className="text-xl font-black text-[var(--accent-text)]">{assignedColleges.length}</p>
              </div>
              <div className="text-right p-3 bg-[var(--bg-raised)] rounded-xl">
                <p className="text-xs role-text-muted">Total Students</p>
                <p className="text-xl font-black role-text-primary">{totalAssignedStudents}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs: Assign Institutions vs Individual Students */}
        <div className="flex gap-2 mb-6 border-b pb-3" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={() => setActiveTab('institutions')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'institutions'
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'role-text-muted hover:role-text-primary bg-[var(--bg-raised)]'
            }`}
          >
            🏛️ Assign Institutions ({assignedColleges.length})
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
              activeTab === 'students'
                ? 'bg-[var(--accent)] text-white shadow-md'
                : 'role-text-muted hover:role-text-primary bg-[var(--bg-raised)]'
            }`}
          >
            👤 Individual Students ({assignedStudents.length})
          </button>
        </div>

        {/* TAB 1: INSTITUTIONS / COLLEGES ASSIGNMENT */}
        {activeTab === 'institutions' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Search & Select Institutions */}
            <div className="glass-card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-bold role-text-primary">Available Institutions</h2>
                <span className="text-xs role-text-muted">{filteredColleges.length} colleges</span>
              </div>
              <input
                className="input-field w-full mb-3"
                placeholder="Search institution by name, city, state..."
                value={collegeSearch}
                onChange={e => setCollegeSearch(e.target.value)}
              />

              {/* Branch / Batch Filtering when assigning institutions */}
              <div className="p-3 bg-[var(--bg-raised)] rounded-xl border border-[var(--border)] mb-4 space-y-2">
                <p className="text-xs font-bold role-text-primary">Filter Target Audience (Optional):</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] uppercase font-bold role-text-muted">Batches / Years</label>
                    <input
                      type="text"
                      placeholder="e.g. 2025, 2026"
                      className="input-field w-full text-xs"
                      value={assignBatches}
                      onChange={e => setAssignBatches(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold role-text-muted">Branches</label>
                    <input
                      type="text"
                      placeholder="e.g. CSE, IT, ECE"
                      className="input-field w-full text-xs"
                      value={assignBranches}
                      onChange={e => setAssignBranches(e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-[10px] role-text-muted">Leave empty to assign all registered students in selected institutions.</p>
              </div>

              {selectedColleges.size > 0 && (
                <button
                  onClick={assignSelectedColleges}
                  disabled={assigningColleges}
                  className="btn-success w-full mb-4 text-sm font-bold shadow-lg shadow-emerald-500/20"
                >
                  {assigningColleges ? 'Assigning...' : `✓ Assign ${selectedColleges.size} Selected Institution(s)`}
                </button>
              )}

              <div className="space-y-2.5 max-h-[440px] overflow-y-auto pr-1">
                {filteredColleges.map(c => {
                  const isAssigned = assignedColleges.some(ac => ac.id === c.id)
                  const isSelected = selectedColleges.has(c.id)
                  return (
                    <div
                      key={c.id}
                      onClick={() => !isAssigned && toggleSelectCollege(c.id)}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all border
                        ${isAssigned
                          ? 'opacity-50 cursor-default bg-emerald-500/5 border-emerald-500/30'
                          : isSelected
                            ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-sm'
                            : 'border-[var(--border)] bg-[var(--bg-raised)] hover:border-[var(--border-strong)]'}`}
                    >
                      <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors
                        ${isSelected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-gray-400'}`}>
                        {isSelected && <span className="text-white text-xs font-black">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm role-text-primary font-bold truncate">{c.name}</p>
                        <p className="text-xs role-text-muted truncate">
                          {c.type || 'College'} • {c.city ? `${c.city}, ` : ''}{c.state || ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                          {c.studentCount || 0} students
                        </span>
                        {isAssigned && (
                          <p className="text-[11px] text-emerald-400 font-bold mt-1">✓ Assigned</p>
                        )}
                      </div>
                    </div>
                  )
                })}
                {filteredColleges.length === 0 && (
                  <p className="text-center py-8 text-sm role-text-muted">No institutions found matching &quot;{collegeSearch}&quot;</p>
                )}
              </div>
            </div>

            {/* Assigned Institutions List */}
            <div className="glass-card p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-bold role-text-primary">
                  Assigned Institutions ({assignedColleges.length})
                </h2>
                <span className="text-xs text-indigo-400 font-semibold">{totalAssignedStudents} total enrolled</span>
              </div>

              <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
                {assignedColleges.map(ac => (
                  <div key={ac.id} className="p-4 bg-[var(--bg-raised)] rounded-2xl border border-[var(--border)] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-base font-black shrink-0">
                        {ac.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm role-text-primary font-bold truncate">{ac.name}</p>
                        <p className="text-xs role-text-muted truncate">
                          {ac.type || 'College'} • {ac.city ? `${ac.city}, ` : ''}{ac.state || ''}
                        </p>
                        <p className="text-xs text-indigo-400 font-medium mt-0.5">
                          👥 {ac.assignedStudentCount} students assigned
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => unassignCollege(ac.id, ac.name)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-rose-500/20 shrink-0 transition-colors"
                    >
                      Unassign
                    </button>
                  </div>
                ))}
                {assignedColleges.length === 0 && (
                  <div className="text-center py-16">
                    <div className="text-4xl mb-2">🏛️</div>
                    <p className="role-text-primary font-semibold">No Institutions Assigned</p>
                    <p className="text-xs role-text-muted mt-1">Select institutions on the left to assign all their students at once.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INDIVIDUAL STUDENTS ASSIGNMENT */}
        {activeTab === 'students' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Search Students */}
            <div className="glass-card p-6">
              <h2 className="text-base font-bold role-text-primary mb-4">Search & Assign Individual Students</h2>
              <div className="flex gap-2 mb-4">
                <input
                  className="input-field flex-1"
                  placeholder="Search by student name or email..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchStudents()}
                />
                <button onClick={searchStudents} className="btn-primary shrink-0">Search</button>
              </div>

              {selectedStudents.size > 0 && (
                <button
                  onClick={assignSelectedStudents}
                  disabled={assigningStudents}
                  className="btn-success w-full mb-4 text-sm font-bold"
                >
                  {assigningStudents ? 'Assigning...' : `✓ Assign ${selectedStudents.size} Students`}
                </button>
              )}

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {students.map(s => {
                  const isAssigned = assignedStudents.some(a => a.id === s.id)
                  const isSelected = selectedStudents.has(s.id)
                  return (
                    <div
                      key={s.id}
                      onClick={() => !isAssigned && toggleSelectStudent(s.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border
                        ${isAssigned ? 'opacity-40 cursor-default border-[var(--border)]' :
                          isSelected ? 'border-[var(--accent)] bg-[var(--accent-soft)]' :
                          'border-[var(--border)] hover:border-[var(--border-strong)]'}`}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0
                        ${isSelected ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)]'}`}>
                        {isSelected && <span className="text-white text-[10px]">✓</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm role-text-primary font-medium truncate">{s.name}</p>
                        <p className="text-xs role-text-muted truncate">{s.email}</p>
                      </div>
                      {isAssigned && <span className="text-xs text-green-400">Assigned</span>}
                    </div>
                  )
                })}
                {students.length === 0 && (
                  <p className="text-center py-6 text-sm role-text-muted">Type in search box and click Search</p>
                )}
              </div>
            </div>

            {/* Assigned Students List */}
            <div className="glass-card p-6">
              <h2 className="text-base font-bold role-text-primary mb-4">
                Assigned Students List ({assignedStudents.length})
              </h2>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {assignedStudents.map(a => (
                  <div key={a.id} className="flex items-center gap-3 p-3 bg-[var(--bg-raised)] rounded-xl">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {a.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm role-text-primary font-medium truncate">{a.name}</p>
                      <p className="text-xs role-text-muted truncate">{a.email} {a.collegeName ? `• ${a.collegeName}` : ''}</p>
                    </div>
                    {!a.attemptStatus && (
                      <button
                        onClick={() => unassignStudent(a.id)}
                        className="text-xs text-rose-400 hover:text-rose-300 shrink-0 font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
                {assignedStudents.length === 0 && (
                  <p className="text-center py-6 text-sm role-text-muted">No students assigned yet</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* EDIT TIMINGS & SCHEDULE MODAL */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="glass-card max-w-lg w-full p-6 relative animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-lg font-bold role-text-primary">Edit Timings & Settings</h2>
                  <p className="text-xs role-text-muted">Update schedule, duration, or marks for this exam</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
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
                  </select>
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="btn-secondary text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingEdit}
                    className="btn-primary text-sm"
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
