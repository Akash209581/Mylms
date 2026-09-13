'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import QuestionPreview from '@/components/question-bank/QuestionPreview'
import { api } from '@/lib/api'
import { hasPerLanguageStarters } from '@/lib/starter-code'

type Tab = 'bank-mcq' | 'bank-coding' | 'excel-import' | 'manage'

const EXAM_BASE = '/dashboard/superadmin/exams'

export default function ExamQuestionsPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params?.id as string

  const [user, setUser] = useState<any>(null)
  const [exam, setExam] = useState<any>(null)
  const [tab, setTab] = useState<Tab>('bank-mcq')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Question bank state
  const [bankQuestions, setBankQuestions] = useState<any[]>([])
  const [bankSearch, setBankSearch] = useState('')
  const [bankDifficulty, setBankDifficulty] = useState('')
  const [bankLoading, setBankLoading] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [adding, setAdding] = useState(false)

  // Per-question Marks Configuration before adding
  const [customMarks, setCustomMarks] = useState<Record<number, { marks: number; negativeMarks: number }>>({})
  const [defaultMarks, setDefaultMarks] = useState<number>(1)
  const [defaultNegMarks, setDefaultNegMarks] = useState<number>(0)

  // Question Preview State
  const [previewQuestion, setPreviewQuestion] = useState<any | null>(null)

  // Inline Marks Edit state (Manage tab)
  const [editingMarksId, setEditingMarksId] = useState<number | null>(null)
  const [editMarksVal, setEditMarksVal] = useState<number>(1)
  const [editNegVal, setEditNegVal] = useState<number>(0)
  const [savingMarks, setSavingMarks] = useState(false)

  // Excel import state
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<any>(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Publishing
  const [publishing, setPublishing] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { router.push('/login'); return }
    setUser(JSON.parse(stored))
    fetchExam()
  }, [examId])

  useEffect(() => {
    setDefaultMarks(tab === 'bank-coding' ? 10 : 1)
    setDefaultNegMarks(0)
    if (tab !== 'bank-mcq' && tab !== 'bank-coding') return
    const t = setTimeout(() => { fetchBankQuestions() }, 300)
    return () => clearTimeout(t)
  }, [tab, bankSearch, bankDifficulty])

  const fetchExam = async (silent = false) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const r = await api.get(`/exams/${examId}`)
      setExam(r.data)
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load exam')
    } finally {
      if (!silent) setLoading(false)
    }
  }

  const fetchBankQuestions = async () => {
    setBankLoading(true)
    try {
      const type = tab === 'bank-mcq' ? 'MCQ' : 'PQ'
      const r = await api.get('/question-bank', {
        params: {
          type,
          difficulty: bankDifficulty || undefined,
          search: bankSearch.trim() || undefined,
          limit: 50,
        },
      })
      setBankQuestions(r.data || [])
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to load question bank')
      setBankQuestions([])
    } finally {
      setBankLoading(false)
    }
  }

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
        if (!customMarks[id]) {
          setCustomMarks(cm => ({
            ...cm,
            [id]: { marks: defaultMarks, negativeMarks: defaultNegMarks },
          }))
        }
      }
      return next
    })
  }

  const addSelected = async () => {
    if (!selected.size || adding) return
    const section = tab === 'bank-mcq' ? 'mcq' : 'coding'
    const fallbackMarks = tab === 'bank-coding' ? 10 : 1
    const questions = Array.from(selected).map(qId => ({
      questionId: qId,
      marks: customMarks[qId]?.marks ?? defaultMarks ?? fallbackMarks,
      negativeMarks: customMarks[qId]?.negativeMarks ?? defaultNegMarks ?? 0,
    }))
    setAdding(true)
    setError('')
    try {
      const r = await api.post(`/exams/${examId}/questions/${section}`, { questions })
      setSelected(new Set())
      await fetchExam(true)
      alert(`Added ${r.data?.added ?? questions.length} questions!`)
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to add questions')
    } finally {
      setAdding(false)
    }
  }

  const removeQuestion = async (questionId: number) => {
    if (!confirm('Remove this question from the exam?')) return
    try {
      await api.delete(`/exams/${examId}/questions/${questionId}`)
      await fetchExam(true)
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to remove question')
    }
  }

  const saveUpdatedMarks = async (questionId: number) => {
    setSavingMarks(true)
    try {
      await api.put(`/exams/${examId}/questions/${questionId}/marks`, {
        marks: Number(editMarksVal),
        negativeMarks: Number(editNegVal),
      })
      setEditingMarksId(null)
      await fetchExam(true)
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to update marks')
    } finally {
      setSavingMarks(false)
    }
  }

  const handleFileUpload = async () => {
    if (!excelFile) return
    setImporting(true)
    try {
      const formData = new FormData()
      formData.append('file', excelFile)
      const r = await api.post(`/exams/${examId}/import-mcq/validate`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setImportResult(r.data)
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to validate file')
    } finally {
      setImporting(false)
    }
  }

  const confirmImport = async (saveToBank: boolean) => {
    if (!importResult?.valid?.length) return
    try {
      await api.post(`/exams/${examId}/import-mcq/confirm`, { rows: importResult.valid, saveToBank })
      const count = importResult.valid.length
      setImportResult(null)
      setExcelFile(null)
      await fetchExam(true)
      alert(`Imported ${count} MCQ questions!`)
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to import questions')
    }
  }

  const downloadTemplate = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'}/exams/${examId}/import-mcq/template`, '_blank')
  }

  const publishExam = async () => {
    setPublishing(true)
    try {
      const r = await api.post(`/exams/${examId}/publish`)
      alert(r.data.message)
      fetchExam(true)
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to publish')
    }
    setPublishing(false)
  }

  const examBase = EXAM_BASE
  const mcqQuestions = exam?.questions?.filter((q: any) => q.section === 'A') || []
  const codingQuestions = exam?.questions?.filter((q: any) => q.section === 'B') || []
  const alreadyAddedIds = useMemo(
    () => new Set((exam?.questions || []).map((eq: any) => eq.questionId)),
    [exam],
  )

  if (loading) return (
    <div className="min-h-screen bg-mesh">
      <Sidebar role="SUPERADMIN" />
      <Navbar title="Exam Questions" />
      <main className="page-content flex items-center justify-center"><div className="w-8 h-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" /></main>
    </div>
  )

  return (
    <div className="min-h-screen bg-mesh">
      <Sidebar role={user?.role || 'SUPERADMIN'} />
      <Navbar title="Question Manager" />
      <main className="page-content">
        {/* Back + Exam Header */}
        <button onClick={() => router.push(examBase)} className="btn-secondary mb-4 text-sm">← Back</button>
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-sm text-rose-400">{error}</div>
        )}
        <div className="glass-card p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold role-text-primary">{exam?.title}</h1>
              <div className="flex items-center gap-3 mt-2">
                <span className={`badge border text-xs ${exam?.status === 'DRAFT' ? 'bg-slate-500/20 text-slate-400 border-slate-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}>{exam?.status}</span>
                <span className="text-sm role-text-muted">⏱ {exam?.durationMinutes}m</span>
                <span className="text-sm role-text-muted">📊 Total: {exam?.totalMarks} marks</span>
                <span className="text-sm role-text-muted">🟦 MCQs: {mcqQuestions.length}</span>
                <span className="text-sm role-text-muted">💻 Coding: {codingQuestions.length}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => router.push(`${examBase}/${examId}/assign`)} className="btn-secondary text-sm">
                👥 Assign Students
              </button>
              {exam?.status === 'DRAFT' && (
                <button onClick={publishExam} disabled={publishing} className="btn-success text-sm">
                  {publishing ? 'Publishing...' : '🚀 Publish Exam'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 glass-subtle rounded-xl w-fit">
          {([
            ['bank-mcq', '📝 MCQ from Bank'],
            ['bank-coding', '💻 Coding from Bank'],
            ['excel-import', '📊 Excel Import'],
            ['manage', '⚙️ Manage Questions'],
          ] as [Tab, string][]).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-[var(--accent)] text-white shadow' : 'role-text-muted hover:role-text-primary'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab: MCQ/Coding from Bank */}
        {(tab === 'bank-mcq' || tab === 'bank-coding') && (
          <div className="glass-card p-6">
            {tab === 'bank-coding' && (
              <p className="text-xs role-text-muted mb-4">
                Section B coding questions: statement, input/output format, constraints, visible and hidden cases, marks, allowed languages, and per-language pre-code. Hidden cases and expected outputs stay hidden from students.
              </p>
            )}
            {tab === 'bank-mcq' && (
              <p className="text-xs role-text-muted mb-4">Section A MCQs only. There is no aptitude section on exams.</p>
            )}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
              <input
                className="input-field flex-1"
                placeholder="Search by question text or topic..."
                value={bankSearch}
                onChange={e => setBankSearch(e.target.value)}
              />
              <select className="input-field w-full sm:w-44" value={bankDifficulty} onChange={e => setBankDifficulty(e.target.value)}>
                <option value="">All Difficulties</option>
                {['VERY_EASY', 'EASY', 'MEDIUM', 'HARD', 'VERY_HARD'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Default Marks / Neg Marks Selector */}
              <div className="flex items-center gap-2 bg-[var(--bg-raised)] p-2 rounded-xl border border-[var(--border)]">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold role-text-muted uppercase">Marks:</span>
                  <input
                    type="number"
                    min="0.5"
                    step="0.5"
                    className="w-14 px-2 py-1 text-xs rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-center font-bold"
                    value={defaultMarks}
                    onChange={e => {
                      const v = parseFloat(e.target.value) || 1
                      setDefaultMarks(v)
                      setCustomMarks(cm => {
                        const updated = { ...cm }
                        selected.forEach(id => {
                          updated[id] = { marks: v, negativeMarks: updated[id]?.negativeMarks ?? defaultNegMarks }
                        })
                        return updated
                      })
                    }}
                  />
                </div>
                {tab === 'bank-mcq' && (
                  <div className="flex items-center gap-1 border-l pl-2 border-[var(--border)]">
                    <span className="text-[10px] font-bold text-red-400 uppercase">Neg:</span>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      className="w-14 px-2 py-1 text-xs rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] text-center font-bold text-red-400"
                      value={defaultNegMarks}
                      onChange={e => {
                        const v = parseFloat(e.target.value) || 0
                        setDefaultNegMarks(v)
                        setCustomMarks(cm => {
                          const updated = { ...cm }
                          selected.forEach(id => {
                            updated[id] = { marks: updated[id]?.marks ?? defaultMarks, negativeMarks: v }
                          })
                          return updated
                        })
                      }}
                    />
                  </div>
                )}
              </div>

              {selected.size > 0 && (
                <button onClick={addSelected} disabled={adding} className="btn-primary shrink-0 font-bold">
                  {adding ? 'Adding...' : `＋ Add ${selected.size} Selected`}
                </button>
              )}
            </div>

            {bankLoading ? (
              <div className="text-center py-10"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {bankQuestions.map(q => {
                  const alreadyAdded = alreadyAddedIds.has(q.id)
                  const isSel = selected.has(q.id)
                  const qMarks = customMarks[q.id]?.marks ?? defaultMarks
                  const qNeg = customMarks[q.id]?.negativeMarks ?? defaultNegMarks

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border transition-all
                        ${alreadyAdded ? 'opacity-40 cursor-not-allowed border-[var(--border)]' :
                          isSel ? 'border-[var(--accent)] bg-[var(--accent-soft)]/20 shadow-sm' :
                          'border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--bg-raised)]/50'}`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          onClick={() => !alreadyAdded && toggleSelect(q.id)}
                          className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border-2 transition-all cursor-pointer
                            ${isSel ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)]'}`}
                        >
                          {isSel && <span className="text-white text-xs">✓</span>}
                        </div>

                        <div className="flex-1 min-w-0" onClick={() => !alreadyAdded && toggleSelect(q.id)}>
                          <p className="text-sm role-text-primary font-medium line-clamp-2 cursor-pointer">
                            {q.questionText || q.problemStatement}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {q.questionNumber && (
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border)]">
                                {q.questionNumber}
                              </span>
                            )}
                            <span className="text-xs badge bg-[var(--bg-surface)]">{q.difficulty}</span>
                            {q.topicNames && <span className="text-xs role-text-muted">🏷️ {q.topicNames}</span>}
                            {tab === 'bank-coding' && hasPerLanguageStarters(q.codeSnippet) && (
                              <span className="text-xs badge bg-[var(--accent-soft)] text-[var(--accent-text)]">Starters</span>
                            )}
                            {alreadyAdded && <span className="text-xs text-green-400 font-semibold">✓ Already in Exam</span>}
                          </div>
                        </div>

                        {/* Marks Config & Preview Button */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isSel && !alreadyAdded && (
                            <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)]" onClick={e => e.stopPropagation()}>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] role-text-muted font-bold">Marks:</span>
                                <input
                                  type="number"
                                  min="0.5"
                                  step="0.5"
                                  value={qMarks}
                                  onChange={e => {
                                    const v = parseFloat(e.target.value) || 1
                                    setCustomMarks(cm => ({
                                      ...cm,
                                      [q.id]: { marks: v, negativeMarks: cm[q.id]?.negativeMarks ?? defaultNegMarks },
                                    }))
                                  }}
                                  className="w-12 px-1.5 py-0.5 text-xs rounded bg-[var(--bg-raised)] border border-[var(--border)] text-center font-bold"
                                />
                              </div>
                              {tab === 'bank-mcq' && (
                                <div className="flex items-center gap-1 border-l pl-1.5 border-[var(--border)]">
                                  <span className="text-[10px] text-red-400 font-bold">Neg:</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.25"
                                    value={qNeg}
                                    onChange={e => {
                                      const v = parseFloat(e.target.value) || 0
                                      setCustomMarks(cm => ({
                                        ...cm,
                                        [q.id]: { marks: cm[q.id]?.marks ?? defaultMarks, negativeMarks: v },
                                      }))
                                    }}
                                    className="w-12 px-1.5 py-0.5 text-xs rounded bg-[var(--bg-raised)] border border-[var(--border)] text-center font-bold text-red-400"
                                  />
                                </div>
                              )}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreviewQuestion(q)
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] border border-[var(--border)] text-[var(--accent-text)] transition-all flex items-center gap-1"
                            title="Preview Question"
                          >
                            <span>👁️</span> Preview
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {bankQuestions.length === 0 && (
                  <p className="text-center py-8 role-text-muted">No questions found in the bank.</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Tab: Excel Import */}
        {tab === 'excel-import' && (
          <div className="glass-card p-8">
            <h2 className="text-lg font-bold role-text-primary mb-2">Import MCQs from Excel</h2>
            <p className="text-sm role-text-muted mb-6">Upload an Excel file with your MCQ questions. Download the template to see the expected format.</p>

            <button onClick={downloadTemplate} className="btn-secondary mb-6 text-sm">
              ⬇️ Download Template
            </button>

            {!importResult && (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-[var(--border)] hover:border-[var(--accent)] rounded-2xl p-12 text-center cursor-pointer transition-all"
              >
                <div className="text-4xl mb-3">📊</div>
                <p className="role-text-primary font-semibold">Drop your Excel file here</p>
                <p className="text-sm role-text-muted mt-1">.xlsx or .xls files supported</p>
                {excelFile && <p className="text-sm text-[var(--accent-text)] mt-3 font-medium">📄 {excelFile.name}</p>}
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={e => setExcelFile(e.target.files?.[0] || null)} />
              </div>
            )}

            {excelFile && !importResult && (
              <button onClick={handleFileUpload} disabled={importing} className="btn-primary mt-4 w-full">
                {importing ? 'Validating...' : '✓ Validate File'}
              </button>
            )}

            {importResult && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="glass-subtle rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold role-text-primary">{importResult.summary.total}</p>
                    <p className="text-xs role-text-muted">Total Rows</p>
                  </div>
                  <div className="glass-subtle rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-400">{importResult.summary.valid}</p>
                    <p className="text-xs role-text-muted">Valid</p>
                  </div>
                  <div className="glass-subtle rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-red-400">{importResult.summary.invalid}</p>
                    <p className="text-xs role-text-muted">Invalid</p>
                  </div>
                </div>

                {importResult.invalid.length > 0 && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <p className="text-sm font-semibold text-red-400 mb-2">Invalid Rows (will be skipped):</p>
                    {importResult.invalid.map((e: any) => (
                      <p key={e.rowNumber} className="text-xs text-red-300">Row {e.rowNumber}: {e.reason}</p>
                    ))}
                  </div>
                )}

                {importResult.valid.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold role-text-primary">Preview ({importResult.valid.length} valid rows):</p>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {importResult.valid.slice(0, 5).map((r: any) => (
                        <div key={r.rowNumber} className="text-xs role-text-muted p-2 bg-[var(--bg-raised)] rounded-lg">
                          Row {r.rowNumber}: {r.question.substring(0, 80)}...
                        </div>
                      ))}
                      {importResult.valid.length > 5 && <p className="text-xs role-text-muted pl-2">... and {importResult.valid.length - 5} more</p>}
                    </div>

                    <div className="flex gap-3 pt-2">
                      <button onClick={() => confirmImport(false)} className="btn-primary flex-1">
                        ✓ Import {importResult.valid.length} Questions (Exam Only)
                      </button>
                      <button onClick={() => confirmImport(true)} className="btn-secondary flex-1">
                        ✓ Import + Save to Question Bank
                      </button>
                    </div>
                  </div>
                )}

                <button onClick={() => { setImportResult(null); setExcelFile(null) }} className="btn-secondary w-full text-sm">
                  ← Try Another File
                </button>
              </div>
            )}
          </div>
        )}

        {/* Tab: Manage Questions */}
        {tab === 'manage' && (
          <div className="space-y-6">
            {/* Section A */}
            <div className="glass-card p-6">
              <h3 className="text-base font-bold role-text-primary mb-4 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs font-bold">SECTION A</span>
                MCQ Questions ({mcqQuestions.length})
                <span className="text-xs role-text-muted font-normal ml-1">
                  — Total: {mcqQuestions.reduce((s: number, q: any) => s + Number(q.marks), 0)} marks
                </span>
              </h3>
              {mcqQuestions.length === 0 ? (
                <p className="text-sm role-text-muted">No MCQ questions added yet.</p>
              ) : (
                <div className="space-y-2">
                  {mcqQuestions.map((eq: any, i: number) => {
                    const isEditing = editingMarksId === eq.questionId
                    return (
                      <div key={eq.id} className="flex flex-wrap items-center gap-3 p-3 bg-[var(--bg-raised)] rounded-xl border border-[var(--border)]">
                        <span className="text-xs role-text-muted w-6 text-center font-bold">{i + 1}</span>
                        <p className="text-sm role-text-primary flex-1 min-w-[200px] line-clamp-1">
                          {eq.question?.questionText || eq.question?.problemStatement}
                        </p>

                        {/* Marks display & inline edit */}
                        {isEditing ? (
                          <div className="flex items-center gap-2 bg-[var(--bg-surface)] p-1.5 rounded-lg border border-[var(--accent)]">
                            <span className="text-xs font-bold role-text-muted">Marks:</span>
                            <input
                              type="number"
                              min="0.5"
                              step="0.5"
                              value={editMarksVal}
                              onChange={e => setEditMarksVal(parseFloat(e.target.value) || 0)}
                              className="w-14 px-1.5 py-0.5 text-xs rounded bg-[var(--bg-raised)] border border-[var(--border)] font-bold text-center"
                            />
                            <span className="text-xs font-bold text-red-400">Neg:</span>
                            <input
                              type="number"
                              min="0"
                              step="0.25"
                              value={editNegVal}
                              onChange={e => setEditNegVal(parseFloat(e.target.value) || 0)}
                              className="w-14 px-1.5 py-0.5 text-xs rounded bg-[var(--bg-raised)] border border-[var(--border)] font-bold text-center text-red-400"
                            />
                            <button
                              onClick={() => saveUpdatedMarks(eq.questionId)}
                              disabled={savingMarks}
                              className="px-2 py-0.5 rounded bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600"
                            >
                              {savingMarks ? '...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingMarksId(null)}
                              className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-xs hover:bg-slate-600"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              +{eq.marks} marks
                            </span>
                            {eq.negativeMarks > 0 && (
                              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                -{eq.negativeMarks} neg
                              </span>
                            )}
                            <button
                              onClick={() => {
                                setEditingMarksId(eq.questionId)
                                setEditMarksVal(Number(eq.marks))
                                setEditNegVal(Number(eq.negativeMarks || 0))
                              }}
                              className="text-xs text-amber-400 hover:text-amber-300 hover:underline px-1"
                              title="Edit question marks"
                            >
                              ✏️ Edit
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => setPreviewQuestion(eq.question)}
                          className="text-xs text-[var(--accent-text)] hover:underline px-2"
                        >
                          👁️ Preview
                        </button>

                        <button
                          onClick={() => removeQuestion(eq.questionId)}
                          className="text-xs text-red-400 hover:text-red-300 shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Section B */}
            <div className="glass-card p-6">
              <h3 className="text-base font-bold role-text-primary mb-4 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs font-bold">SECTION B</span>
                Coding Questions ({codingQuestions.length})
                <span className="text-xs role-text-muted font-normal ml-1">
                  — Total: {codingQuestions.reduce((s: number, q: any) => s + Number(q.marks), 0)} marks
                </span>
              </h3>
              {codingQuestions.length === 0 ? (
                <p className="text-sm role-text-muted">No coding questions added yet.</p>
              ) : (
                <div className="space-y-2">
                  {codingQuestions.map((eq: any, i: number) => {
                    const isEditing = editingMarksId === eq.questionId
                    return (
                      <div key={eq.id} className="flex flex-wrap items-center gap-3 p-3 bg-[var(--bg-raised)] rounded-xl border border-[var(--border)]">
                        <span className="text-xs role-text-muted w-6 text-center font-bold">{i + 1}</span>
                        <p className="text-sm role-text-primary flex-1 min-w-[200px] line-clamp-1">
                          {eq.question?.problemStatement || eq.question?.questionText}
                        </p>
                        {hasPerLanguageStarters(eq.question?.codeSnippet) && (
                          <span className="text-[10px] badge bg-[var(--accent-soft)] text-[var(--accent-text)] shrink-0">Starters</span>
                        )}

                        {/* Marks display & inline edit */}
                        {isEditing ? (
                          <div className="flex items-center gap-2 bg-[var(--bg-surface)] p-1.5 rounded-lg border border-[var(--accent)]">
                            <span className="text-xs font-bold role-text-muted">Marks:</span>
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={editMarksVal}
                              onChange={e => setEditMarksVal(parseFloat(e.target.value) || 0)}
                              className="w-14 px-1.5 py-0.5 text-xs rounded bg-[var(--bg-raised)] border border-[var(--border)] font-bold text-center"
                            />
                            <button
                              onClick={() => saveUpdatedMarks(eq.questionId)}
                              disabled={savingMarks}
                              className="px-2 py-0.5 rounded bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600"
                            >
                              {savingMarks ? '...' : 'Save'}
                            </button>
                            <button
                              onClick={() => setEditingMarksId(null)}
                              className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-xs hover:bg-slate-600"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                              +{eq.marks} marks
                            </span>
                            <button
                              onClick={() => {
                                setEditingMarksId(eq.questionId)
                                setEditMarksVal(Number(eq.marks))
                                setEditNegVal(0)
                              }}
                              className="text-xs text-amber-400 hover:text-amber-300 hover:underline px-1"
                              title="Edit question marks"
                            >
                              ✏️ Edit
                            </button>
                          </div>
                        )}

                        <button
                          onClick={() => setPreviewQuestion(eq.question)}
                          className="text-xs text-[var(--accent-text)] hover:underline px-2"
                        >
                          👁️ Preview
                        </button>

                        <button
                          onClick={() => removeQuestion(eq.questionId)}
                          className="text-xs text-red-400 hover:text-red-300 shrink-0"
                        >
                          Remove
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Question Preview Modal */}
        {previewQuestion && (
          <QuestionPreview
            form={previewQuestion}
            onClose={() => setPreviewQuestion(null)}
          />
        )}
      </main>
    </div>
  )
}
