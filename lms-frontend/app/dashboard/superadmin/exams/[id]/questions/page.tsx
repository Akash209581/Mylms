'use client'

import { useEffect, useState, useRef, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import QuestionPreview from '@/components/question-bank/QuestionPreview'
import { api } from '@/lib/api'
import { hasPerLanguageStarters, parseStarterMap, ADMIN_STARTERS } from '@/lib/starter-code'

type Tab = 'bank' | 'excel-import' | 'manage'

const EXAM_BASE = '/dashboard/superadmin/exams'
const ALL_SUPPORTED_LANGS = ['Python', 'Java', 'C', 'C++', 'JavaScript']

const QUESTION_TYPES = [
  { value: 'ALL', label: 'All Question Types' },
  { value: 'MCQ', label: 'Multiple Choice (MCQ)' },
  { value: 'FIB', label: 'Fill in the Blank (FIB)' },
  { value: 'MQ', label: 'Matching Questions (MQ)' },
  { value: 'JC', label: 'Jumbled Code (JC)' },
  { value: 'OP', label: 'Output Prediction (OP)' },
  { value: 'PQ', label: 'Programming (PQ)' },
]

export default function ExamQuestionsPage() {
  const router = useRouter()
  const params = useParams()
  const examId = params?.id as string

  const [user, setUser] = useState<any>(null)
  const [exam, setExam] = useState<any>(null)
  const [tab, setTab] = useState<Tab>('bank')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Question bank state
  const [bankQuestions, setBankQuestions] = useState<any[]>([])
  const [bankType, setBankType] = useState<string>('ALL')
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

  // Pre-defined Starter Code Modal State
  const [preCodeModalQuestion, setPreCodeModalQuestion] = useState<any | null>(null)
  const [preCodeLanguage, setPreCodeLanguage] = useState<string>('Python')
  const [preCodeMap, setPreCodeMap] = useState<Record<string, string>>({})
  const [preCodeAllowedLangs, setPreCodeAllowedLangs] = useState<string[]>(ALL_SUPPORTED_LANGS)
  const [savingPreCode, setSavingPreCode] = useState(false)

  // Inline Marks Edit state (Manage tab & Bank list)
  const [editingMarksId, setEditingMarksId] = useState<number | null>(null)
  const [editMarksVal, setEditMarksVal] = useState<number>(1)
  const [editNegVal, setEditNegVal] = useState<number>(0)
  const [savingMarks, setSavingMarks] = useState(false)

  // Hint Settings Modal State
  const [hintModalEq, setHintModalEq] = useState<any | null>(null)
  const [hintSettingsEnabled, setHintSettingsEnabled] = useState<boolean>(true)
  const [hintPenaltyType, setHintPenaltyType] = useState<'MARKS' | 'TIME' | 'NONE'>('MARKS')
  const [hintPenalties, setHintPenalties] = useState<number[]>([])
  const [savingHintSettings, setSavingHintSettings] = useState(false)

  // Excel import state
  const [excelFile, setExcelFile] = useState<File | null>(null)
  const [importResult, setImportResult] = useState<any>(null)
  const [importing, setImporting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Publishing
  const [publishing, setPublishing] = useState(false)

  // Two-Step Delete Exam Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1)
  const [deleteInputText, setDeleteInputText] = useState('')
  const [deletingLoading, setDeletingLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const openDeleteModal = () => {
    setShowDeleteModal(true)
    setDeleteStep(1)
    setDeleteInputText('')
    setDeleteError(null)
  }

  const handleDeleteExam = async () => {
    if (deleteInputText.trim().toUpperCase() !== 'DELETE') return
    setDeletingLoading(true)
    setDeleteError(null)
    try {
      await api.delete(`/exams/${examId}`)
      router.push(EXAM_BASE)
    } catch (err: any) {
      setDeleteError(err?.response?.data?.message || 'Failed to delete exam')
    } finally {
      setDeletingLoading(false)
    }
  }

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { router.push('/login'); return }
    setUser(JSON.parse(stored))
    fetchExam()
  }, [examId])

  useEffect(() => {
    if (tab !== 'bank') return
    const t = setTimeout(() => { fetchBankQuestions() }, 300)
    return () => clearTimeout(t)
  }, [tab, bankType, bankSearch, bankDifficulty])

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
      const r = await api.get('/question-bank', {
        params: {
          type: bankType === 'ALL' || !bankType ? undefined : bankType,
          difficulty: bankDifficulty || undefined,
          search: bankSearch.trim() || undefined,
          qStatus: 'APPROVED',
          limit: 100,
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

  const selectedTotalMarks = useMemo(() => {
    let sum = 0
    selected.forEach(id => {
      const q = bankQuestions.find(bq => bq.id === id)
      const fallbackMarks = q?.type === 'PQ' ? 10 : 1
      sum += Number(customMarks[id]?.marks ?? defaultMarks ?? fallbackMarks)
    })
    return sum
  }, [selected, customMarks, defaultMarks, bankQuestions])

  const openPreCodeConfig = (q: any) => {
    setPreCodeModalQuestion(q)
    const existingMap = parseStarterMap(q.codeSnippet)
    const allowed = Array.isArray(q.allowedLanguages) && q.allowedLanguages.length > 0
      ? q.allowedLanguages
      : ALL_SUPPORTED_LANGS
    setPreCodeAllowedLangs(allowed)

    const initialMap: Record<string, string> = {}
    ALL_SUPPORTED_LANGS.forEach(lang => {
      if (existingMap[lang]?.trim()) {
        initialMap[lang] = existingMap[lang]
      } else if (existingMap._plain && (lang === 'Python' || lang === (q.allowedLanguages?.[0] || 'Python'))) {
        initialMap[lang] = existingMap._plain
      } else {
        initialMap[lang] = ADMIN_STARTERS[lang] || ''
      }
    })
    setPreCodeMap(initialMap)
    setPreCodeLanguage(allowed[0] || 'Python')
  }

  const savePreCodeConfig = async () => {
    if (!preCodeModalQuestion) return
    setSavingPreCode(true)
    try {
      const updatedSnippet = JSON.stringify(preCodeMap)
      await api.put(`/question-bank/${preCodeModalQuestion.id}`, {
        codeSnippet: updatedSnippet,
        allowedLanguages: preCodeAllowedLangs,
      })
      setBankQuestions(prev => prev.map(item =>
        item.id === preCodeModalQuestion.id
          ? { ...item, codeSnippet: updatedSnippet, allowedLanguages: preCodeAllowedLangs }
          : item
      ))
      setPreCodeModalQuestion(null)
      alert('Pre-defined code saved successfully for all languages!')
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save pre-defined code')
    } finally {
      setSavingPreCode(false)
    }
  }

  const openHintSettings = (eqOrQ: any, isBankQuestion = false) => {
    const existedEq = !isBankQuestion
      ? eqOrQ
      : (exam?.questions || []).find((eq: any) => eq.questionId === eqOrQ.id)

    const questionObj = existedEq?.question || eqOrQ
    const hintsCount = Array.isArray(questionObj?.hints) ? questionObj.hints.length : 0

    setHintModalEq(existedEq || { questionId: eqOrQ.id, question: questionObj })
    setHintSettingsEnabled(existedEq?.hintsEnabled ?? true)
    setHintPenaltyType(existedEq?.hintPenaltyType || 'MARKS')
    
    const existingPens = Array.isArray(existedEq?.hintPenalties) ? existedEq.hintPenalties : []
    const initialPens = Array.from({ length: hintsCount }).map((_, i) =>
      existingPens[i] !== undefined ? existingPens[i] : (i + 1)
    )
    setHintPenalties(initialPens)
  }

  const saveHintSettings = async () => {
    if (!hintModalEq) return
    setSavingHintSettings(true)
    try {
      await api.put(`/exams/${examId}/questions/${hintModalEq.questionId}/hint-settings`, {
        hintsEnabled: hintSettingsEnabled,
        hintPenaltyType,
        hintPenalties,
      })
      await fetchExam(true)
      setHintModalEq(null)
      alert('Hint penalties & settings saved successfully!')
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to save hint settings')
    } finally {
      setSavingHintSettings(false)
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
          const q = bankQuestions.find(bq => bq.id === id)
          const isCoding = q?.type === 'PQ'
          setCustomMarks(cm => ({
            ...cm,
            [id]: { marks: isCoding ? 10 : defaultMarks, negativeMarks: isCoding ? 0 : defaultNegMarks },
          }))
        }
      }
      return next
    })
  }

  const addSelected = async () => {
    if (!selected.size || adding) return
    const selectedList = bankQuestions.filter(q => selected.has(q.id))
    
    const mcqQuestionsPayload: any[] = []
    const codingQuestionsPayload: any[] = []

    selectedList.forEach(q => {
      const isCoding = q.type === 'PQ'
      const marks = customMarks[q.id]?.marks ?? (isCoding ? 10 : defaultMarks)
      const negativeMarks = customMarks[q.id]?.negativeMarks ?? (isCoding ? 0 : defaultNegMarks)
      const item = { questionId: q.id, marks, negativeMarks }
      if (isCoding) {
        codingQuestionsPayload.push(item)
      } else {
        mcqQuestionsPayload.push(item)
      }
    })

    setAdding(true)
    setError('')
    try {
      let addedCount = 0
      if (mcqQuestionsPayload.length > 0) {
        const r1 = await api.post(`/exams/${examId}/questions/mcq`, { questions: mcqQuestionsPayload })
        addedCount += r1.data?.added ?? mcqQuestionsPayload.length
      }
      if (codingQuestionsPayload.length > 0) {
        const r2 = await api.post(`/exams/${examId}/questions/coding`, { questions: codingQuestionsPayload })
        addedCount += r2.data?.added ?? codingQuestionsPayload.length
      }
      setSelected(new Set())
      await fetchExam(true)
      alert(`Successfully added ${addedCount} questions to the assessment!`)
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

  const renderTypeBadge = (type: string) => {
    switch (type) {
      case 'MCQ': return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30">MCQ</span>
      case 'FIB': return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">Fill Blank</span>
      case 'MQ': return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Matching</span>
      case 'JC': return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">Jumbled Code</span>
      case 'OP': return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">Output Prediction</span>
      case 'PQ': return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30">Coding</span>
      default: return <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-400 border border-slate-500/30">{type || 'QUESTION'}</span>
    }
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
                <span className="text-sm role-text-muted">🟦 Section A (Objectives): {mcqQuestions.length}</span>
                <span className="text-sm role-text-muted">💻 Section B (Coding): {codingQuestions.length}</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={() => router.push(`${examBase}/${examId}/assign`)} className="btn-secondary text-sm">
                👥 Assign Students
              </button>
              {exam?.status === 'DRAFT' && (
                <button onClick={publishExam} disabled={publishing} className="btn-success text-sm">
                  {publishing ? 'Publishing...' : '🚀 Publish Exam'}
                </button>
              )}
              <button
                onClick={openDeleteModal}
                className="px-3 py-2 rounded-xl text-sm font-semibold bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/30 transition-all flex items-center gap-1.5"
                title="Delete this entire exam with two-step confirmation"
              >
                <span>🗑️</span> Delete Test
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6 p-1 glass-subtle rounded-xl w-fit">
          {([
            ['bank', '📚 Add from Question Bank (All Types)'],
            ['excel-import', '📊 Excel Import (MCQ)'],
            ['manage', `⚙️ Existed Questions in Test (${mcqQuestions.length + codingQuestions.length})`],
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

        {/* Tab: Question Bank (All Types) */}
        {tab === 'bank' && (
          <div className="glass-card p-6">
            <p className="text-xs role-text-muted mb-4">
              Search and add questions of any type (MCQ, Fill in Blank, Matching, Jumbled Code, Output Prediction, Programming) to this test. Non-coding types are automatically organized in Section A, and Programming problems in Section B.
            </p>

            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 mb-6">
              {/* Type Filter */}
              <select
                className="input-field w-full lg:w-56 font-medium text-xs"
                value={bankType}
                onChange={e => setBankType(e.target.value)}
              >
                {QUESTION_TYPES.map(qt => (
                  <option key={qt.value} value={qt.value}>{qt.label}</option>
                ))}
              </select>

              <input
                className="input-field flex-1 text-xs"
                placeholder="Search by question text, topic, company..."
                value={bankSearch}
                onChange={e => setBankSearch(e.target.value)}
              />

              <select
                className="input-field w-full sm:w-40 text-xs"
                value={bankDifficulty}
                onChange={e => setBankDifficulty(e.target.value)}
              >
                <option value="">All Difficulties</option>
                {['VERY_EASY', 'EASY', 'MEDIUM', 'HARD', 'VERY_HARD'].map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Default Marks / Neg Marks Selector */}
              <div className="flex items-center gap-2 bg-[var(--bg-raised)] p-2 rounded-xl border border-[var(--border)] shrink-0">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-bold role-text-muted uppercase">Default M:</span>
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
                          const q = bankQuestions.find(bq => bq.id === id)
                          updated[id] = { marks: q?.type === 'PQ' ? (updated[id]?.marks ?? 10) : v, negativeMarks: updated[id]?.negativeMarks ?? defaultNegMarks }
                        })
                        return updated
                      })
                    }}
                  />
                </div>
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
              </div>

              {selected.size > 0 && (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent)]/40 shadow-sm">
                    <span className="text-xs font-bold text-[var(--accent-text)]">
                      Total: <span className="text-sm font-black">{selectedTotalMarks}</span> Marks
                    </span>
                    <span className="text-[10px] opacity-75 font-semibold text-[var(--accent-text)]">
                      ({selected.size} Q{selected.size > 1 ? 's' : ''})
                    </span>
                  </div>
                  <button onClick={addSelected} disabled={adding} className="btn-primary shrink-0 font-bold flex items-center gap-1.5 text-xs">
                    {adding ? 'Adding...' : `＋ Add ${selected.size} Selected (${selectedTotalMarks} M)`}
                  </button>
                </div>
              )}
            </div>

            {bankLoading ? (
              <div className="text-center py-10"><div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" /></div>
            ) : (
              <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
                {bankQuestions.map(q => {
                  const alreadyAdded = alreadyAddedIds.has(q.id)
                  const existedEq = (exam?.questions || []).find((eq: any) => eq.questionId === q.id)
                  const isSel = selected.has(q.id)
                  const isCoding = q.type === 'PQ'
                  const qMarks = customMarks[q.id]?.marks ?? (isCoding ? 10 : defaultMarks)
                  const qNeg = customMarks[q.id]?.negativeMarks ?? (isCoding ? 0 : defaultNegMarks)
                  const isEditingThisMarks = editingMarksId === q.id

                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border transition-all
                        ${alreadyAdded ? 'border-emerald-500/40 bg-emerald-500/5' :
                          isSel ? 'border-[var(--accent)] bg-[var(--accent-soft)]/20 shadow-sm' :
                          'border-[var(--border)] hover:border-[var(--border-strong)] bg-[var(--bg-raised)]/50'}`}
                    >
                      <div className="flex items-start gap-3">
                        {!alreadyAdded ? (
                          <div
                            onClick={() => toggleSelect(q.id)}
                            className={`w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 border-2 transition-all cursor-pointer
                              ${isSel ? 'bg-[var(--accent)] border-[var(--accent)]' : 'border-[var(--border)]'}`}
                          >
                            {isSel && <span className="text-white text-xs">✓</span>}
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded flex items-center justify-center shrink-0 mt-0.5 bg-emerald-500/20 border border-emerald-500 text-emerald-400 text-xs font-bold" title="Already added to this test">
                            ✓
                          </div>
                        )}

                        <div className="flex-1 min-w-0" onClick={() => !alreadyAdded && toggleSelect(q.id)}>
                          <p className="text-sm role-text-primary font-medium line-clamp-2 cursor-pointer">
                            {q.questionText || q.problemStatement}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            {renderTypeBadge(q.type)}
                            {q.questionNumber && (
                              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border)]">
                                {q.questionNumber}
                              </span>
                            )}
                            <span className="text-xs badge bg-[var(--bg-surface)]">{q.difficulty?.replace('_', ' ')}</span>
                            {q.topicNames && <span className="text-xs role-text-muted">🏷️ {q.topicNames}</span>}
                            {isCoding && hasPerLanguageStarters(q.codeSnippet) && (
                              <span className="text-xs badge bg-[var(--accent-soft)] text-[var(--accent-text)]">Starters</span>
                            )}
                            {alreadyAdded && (
                              <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                                <span>✓ In Test</span>
                                {existedEq && <span className="text-[11px] opacity-85">({existedEq.marks}M{existedEq.negativeMarks ? ` / -${existedEq.negativeMarks}` : ''})</span>}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Marks Config & Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0">
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
                                      [q.id]: { marks: v, negativeMarks: cm[q.id]?.negativeMarks ?? (isCoding ? 0 : defaultNegMarks) },
                                    }))
                                  }}
                                  className="w-12 px-1.5 py-0.5 text-xs rounded bg-[var(--bg-raised)] border border-[var(--border)] text-center font-bold"
                                />
                              </div>
                              {!isCoding && (
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

                          {alreadyAdded && (
                            <>
                              {isEditingThisMarks ? (
                                <div className="flex items-center gap-1.5 bg-[var(--bg-surface)] p-1 rounded-lg border border-[var(--accent)]" onClick={e => e.stopPropagation()}>
                                  <span className="text-[10px] font-bold role-text-muted">M:</span>
                                  <input
                                    type="number"
                                    min="0.5"
                                    step="0.5"
                                    value={editMarksVal}
                                    onChange={e => setEditMarksVal(parseFloat(e.target.value) || 0)}
                                    className="w-12 px-1 py-0.5 text-xs rounded bg-[var(--bg-raised)] border border-[var(--border)] font-bold text-center"
                                  />
                                  {!isCoding && (
                                    <>
                                      <span className="text-[10px] font-bold text-red-400">N:</span>
                                      <input
                                        type="number"
                                        min="0"
                                        step="0.25"
                                        value={editNegVal}
                                        onChange={e => setEditNegVal(parseFloat(e.target.value) || 0)}
                                        className="w-12 px-1 py-0.5 text-xs rounded bg-[var(--bg-raised)] border border-[var(--border)] font-bold text-center text-red-400"
                                      />
                                    </>
                                  )}
                                  <button
                                    onClick={() => saveUpdatedMarks(q.id)}
                                    disabled={savingMarks}
                                    className="px-2 py-0.5 rounded bg-emerald-500 text-white text-xs font-bold hover:bg-emerald-600"
                                  >
                                    {savingMarks ? '...' : 'Save'}
                                  </button>
                                  <button
                                    onClick={() => setEditingMarksId(null)}
                                    className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300 text-xs hover:bg-slate-600"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingMarksId(q.id)
                                    setEditMarksVal(Number(existedEq?.marks || (isCoding ? 10 : 1)))
                                    setEditNegVal(Number(existedEq?.negativeMarks || 0))
                                  }}
                                  className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-all flex items-center gap-1"
                                  title="Edit Marks for this question in the test"
                                >
                                  <span>✏️</span> Edit Marks
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  removeQuestion(q.id)
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 transition-all flex items-center gap-1"
                                title="Remove question from this exam"
                              >
                                <span>🗑️</span> Remove
                              </button>
                            </>
                          )}

                          {isCoding && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openHintSettings(q, true)
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-all flex items-center gap-1"
                                title="Configure sequential hints & penalties"
                              >
                                <span>💡</span> Hints {Array.isArray(q.hints) && q.hints.length > 0 ? `(${q.hints.length})` : ''}
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  openPreCodeConfig(q)
                                }}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-soft)] hover:bg-[var(--accent-soft)]/80 border border-[var(--accent)]/30 text-[var(--accent-text)] transition-all flex items-center gap-1"
                                title="Configure pre-defined starter code for all languages"
                              >
                                <span>⚙️</span> Pre-defined Code
                              </button>
                            </>
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
                  <p className="text-center py-8 role-text-muted">No questions found in the bank matching your criteria.</p>
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
                Objective & Concept Questions ({mcqQuestions.length})
                <span className="text-xs role-text-muted font-normal ml-1">
                  — Total: {mcqQuestions.reduce((s: number, q: any) => s + Number(q.marks), 0)} marks
                </span>
              </h3>
              {mcqQuestions.length === 0 ? (
                <p className="text-sm role-text-muted">No Section A questions added yet. Use "Add from Question Bank" to select questions.</p>
              ) : (
                <div className="space-y-2">
                  {mcqQuestions.map((eq: any, i: number) => {
                    const isEditing = editingMarksId === eq.questionId
                    return (
                      <div key={eq.id} className="flex flex-wrap items-center gap-3 p-3 bg-[var(--bg-raised)] rounded-xl border border-[var(--border)]">
                        <span className="text-xs role-text-muted w-6 text-center font-bold">{i + 1}</span>
                        {renderTypeBadge(eq.question?.type)}
                        {eq.question?.questionNumber && (
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border)]">
                            {eq.question?.questionNumber}
                          </span>
                        )}
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
                              className="text-xs text-amber-400 hover:text-amber-300 hover:underline px-1 font-semibold"
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
                          className="text-xs text-red-400 hover:text-red-300 shrink-0 font-semibold"
                        >
                          🗑️ Remove
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
                Programming / Coding Questions ({codingQuestions.length})
                <span className="text-xs role-text-muted font-normal ml-1">
                  — Total: {codingQuestions.reduce((s: number, q: any) => s + Number(q.marks), 0)} marks
                </span>
              </h3>
              {codingQuestions.length === 0 ? (
                <p className="text-sm role-text-muted">No coding questions added yet. Use "Add from Question Bank" to select programming problems.</p>
              ) : (
                <div className="space-y-2">
                  {codingQuestions.map((eq: any, i: number) => {
                    const isEditing = editingMarksId === eq.questionId
                    return (
                      <div key={eq.id} className="flex flex-wrap items-center gap-3 p-3 bg-[var(--bg-raised)] rounded-xl border border-[var(--border)]">
                        <span className="text-xs role-text-muted w-6 text-center font-bold">{i + 1}</span>
                        {renderTypeBadge(eq.question?.type)}
                        {eq.question?.questionNumber && (
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-surface)] border border-[var(--border)]">
                            {eq.question?.questionNumber}
                          </span>
                        )}
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
                              className="text-xs text-amber-400 hover:text-amber-300 hover:underline px-1 font-semibold"
                              title="Edit question marks"
                            >
                              ✏️ Edit
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => openHintSettings(eq)}
                          className="text-xs text-amber-400 hover:text-amber-300 hover:underline px-2 flex items-center gap-1 font-semibold"
                          title="Configure sequential hints & penalties"
                        >
                          <span>💡</span> Hints {Array.isArray(eq.question?.hints) && eq.question.hints.length > 0 ? `(${eq.question.hints.length})` : ''}
                        </button>

                        <button
                          type="button"
                          onClick={() => openPreCodeConfig(eq.question)}
                          className="text-xs text-[var(--accent-text)] hover:underline px-2 flex items-center gap-1 font-semibold"
                          title="Configure pre-defined starter code for all languages"
                        >
                          <span>⚙️</span> Pre-defined Code
                        </button>

                        <button
                          onClick={() => setPreviewQuestion(eq.question)}
                          className="text-xs text-[var(--accent-text)] hover:underline px-2"
                        >
                          👁️ Preview
                        </button>

                        <button
                          onClick={() => removeQuestion(eq.questionId)}
                          className="text-xs text-red-400 hover:text-red-300 shrink-0 font-semibold"
                        >
                          🗑️ Remove
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

        {/* Pre-defined Starter Code Modal */}
        {preCodeModalQuestion && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
              <div className="p-6 border-b border-[var(--border)] flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
                      {preCodeModalQuestion.questionNumber || 'CODING'}
                    </span>
                    <span className="text-xs badge bg-[var(--accent-soft)] text-[var(--accent-text)] font-semibold">
                      Pre-defined Starter Code
                    </span>
                  </div>
                  <h3 className="text-lg font-bold role-text-primary">
                    {preCodeModalQuestion.questionText || preCodeModalQuestion.problemStatement}
                  </h3>
                  <p className="text-xs role-text-muted mt-1">
                    Configure the default code template that appears when students open this question in the code editor for each available language.
                  </p>
                </div>
                <button
                  onClick={() => setPreCodeModalQuestion(null)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-[var(--bg-raised)] transition-all"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-4">
                {/* Language Tabs & Allowed Checkboxes */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--border)]">
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_SUPPORTED_LANGS.map(lang => {
                      const isAllowed = preCodeAllowedLangs.includes(lang)
                      const hasCode = !!preCodeMap[lang]?.trim()
                      const isActive = preCodeLanguage === lang
                      return (
                        <button
                          key={lang}
                          type="button"
                          onClick={() => setPreCodeLanguage(lang)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                            isActive
                              ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-md'
                              : 'bg-[var(--bg-raised)] border-[var(--border)] text-gray-300 hover:border-gray-400'
                          }`}
                        >
                          <span>{lang}</span>
                          {hasCode && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Has code template" />}
                        </button>
                      )
                    })}
                  </div>

                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-xs role-text-muted cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={preCodeAllowedLangs.includes(preCodeLanguage)}
                        onChange={e => {
                          if (e.target.checked) {
                            setPreCodeAllowedLangs(prev => Array.from(new Set([...prev, preCodeLanguage])))
                          } else {
                            if (preCodeAllowedLangs.length <= 1) {
                              alert('At least one language must remain allowed.')
                              return
                            }
                            setPreCodeAllowedLangs(prev => prev.filter(l => l !== preCodeLanguage))
                          }
                        }}
                        className="rounded border-[var(--border)] accent-[var(--accent)]"
                      />
                      <span className="font-medium">Enable {preCodeLanguage}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setPreCodeMap(prev => ({
                          ...prev,
                          [preCodeLanguage]: ADMIN_STARTERS[preCodeLanguage] || '',
                        }))
                      }}
                      className="text-[11px] text-amber-400 hover:underline font-semibold ml-2"
                    >
                      🔄 Reset to Default
                    </button>
                  </div>
                </div>

                {/* Code Editor / Area */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-gray-400 font-mono">
                      // {preCodeLanguage} Pre-defined Starter Code
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Students will see this when selecting {preCodeLanguage}
                    </span>
                  </div>
                  <div className="relative rounded-xl overflow-hidden border border-[var(--border)] bg-gray-950">
                    <textarea
                      value={preCodeMap[preCodeLanguage] || ''}
                      onChange={e => {
                        const val = e.target.value
                        setPreCodeMap(prev => ({ ...prev, [preCodeLanguage]: val }))
                      }}
                      rows={12}
                      className="w-full bg-transparent p-4 text-emerald-400 font-mono text-xs focus:outline-none resize-y selection:bg-emerald-500/30 leading-relaxed"
                      placeholder={`Write or paste ${preCodeLanguage} pre-defined starter code here...`}
                      spellCheck={false}
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[var(--bg-raised)]/50 border-t border-[var(--border)] flex items-center justify-between gap-3">
                <span className="text-xs role-text-muted">
                  Configuring <span className="font-bold text-[var(--accent-text)]">{preCodeAllowedLangs.length}</span> allowed language(s)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPreCodeModalQuestion(null)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={savePreCodeConfig}
                    disabled={savingPreCode}
                    className="btn-primary text-xs font-bold flex items-center gap-1.5"
                  >
                    {savingPreCode ? 'Saving...' : '💾 Save Pre-defined Code'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Hint Settings Modal */}
        {hintModalEq && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-8">
              <div className="p-6 border-b border-[var(--border)] flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[var(--bg-raised)] border border-[var(--border)]">
                      {hintModalEq.question?.questionNumber || 'PQ'}
                    </span>
                    <span className="text-xs badge bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold">
                      💡 Question Hints & Penalty Rules
                    </span>
                  </div>
                  <h3 className="text-lg font-bold role-text-primary">
                    {hintModalEq.question?.questionText || hintModalEq.question?.problemStatement}
                  </h3>
                  <p className="text-xs role-text-muted mt-1">
                    Configure sequential hints and the penalty applied when students unlock hints during the exam.
                  </p>
                </div>
                <button
                  onClick={() => setHintModalEq(null)}
                  className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-[var(--bg-raised)] transition-all"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-6">
                {(!hintModalEq.question?.hints || hintModalEq.question.hints.length === 0) ? (
                  <div className="p-6 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center space-y-2">
                    <p className="text-sm font-semibold text-amber-300">No Hints Defined</p>
                    <p className="text-xs role-text-muted max-w-md mx-auto">
                      This programming problem currently does not have any hints added in the Question Bank. You can edit the question in Question Bank to add sequential hints.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between p-4 bg-[var(--bg-raised)] rounded-xl border border-[var(--border)]">
                      <div>
                        <p className="text-sm font-bold role-text-primary">Enable Sequential Hints</p>
                        <p className="text-xs role-text-muted">Allow students to unlock hints one-by-one in the coding workspace</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hintSettingsEnabled}
                          onChange={e => setHintSettingsEnabled(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                      </label>
                    </div>

                    {hintSettingsEnabled && (
                      <div className="space-y-4">
                        {/* Penalty Type Selection */}
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider role-text-muted mb-2">
                            Select Penalty Type
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            <button
                              type="button"
                              onClick={() => setHintPenaltyType('MARKS')}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                hintPenaltyType === 'MARKS'
                                  ? 'bg-rose-500/10 border-rose-500 text-rose-300 shadow-sm'
                                  : 'bg-[var(--bg-raised)] border-[var(--border)] text-gray-400 hover:border-gray-500'
                              }`}
                            >
                              <div className="font-bold text-sm">🎯 Negative Marks</div>
                              <div className="text-[11px] opacity-80 mt-1">Deduct marks from question score per hint</div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setHintPenaltyType('TIME')}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                hintPenaltyType === 'TIME'
                                  ? 'bg-indigo-500/10 border-indigo-500 text-indigo-300 shadow-sm'
                                  : 'bg-[var(--bg-raised)] border-[var(--border)] text-gray-400 hover:border-gray-500'
                              }`}
                            >
                              <div className="font-bold text-sm">⏳ Time Penalty</div>
                              <div className="text-[11px] opacity-80 mt-1">Deduct time from total test duration</div>
                            </button>

                            <button
                              type="button"
                              onClick={() => setHintPenaltyType('NONE')}
                              className={`p-3 rounded-xl border text-left transition-all ${
                                hintPenaltyType === 'NONE'
                                  ? 'bg-emerald-500/10 border-emerald-500 text-emerald-300 shadow-sm'
                                  : 'bg-[var(--bg-raised)] border-[var(--border)] text-gray-400 hover:border-gray-500'
                              }`}
                            >
                              <div className="font-bold text-sm">✨ Free (No Penalty)</div>
                              <div className="text-[11px] opacity-80 mt-1">Students reveal hints without deduction</div>
                            </button>
                          </div>
                        </div>

                        {/* Per-Hint Penalty Configuration */}
                        {hintPenaltyType !== 'NONE' && (
                          <div className="space-y-3 pt-2">
                            <div className="flex items-center justify-between">
                              <label className="text-xs font-bold uppercase tracking-wider role-text-muted">
                                Configure {hintPenaltyType === 'MARKS' ? 'Marks to Deduct per Hint' : 'Minutes to Deduct per Hint'}
                              </label>
                              <div className="flex items-center gap-2">
                                <span className="text-[11px] role-text-muted">
                                  {hintPenaltyType === 'MARKS' ? 'Unit: Marks' : 'Unit: Minutes'}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-2.5 max-h-[30vh] overflow-y-auto pr-1">
                              {hintModalEq.question?.hints?.map((hintText: string, idx: number) => {
                                const currentPenalty = hintPenalties[idx] !== undefined ? hintPenalties[idx] : (hintPenaltyType === 'TIME' ? 2 : 1)
                                return (
                                  <div
                                    key={idx}
                                    className="p-3 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] flex items-center justify-between gap-4"
                                  >
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-bold">
                                          Hint {idx + 1}
                                        </span>
                                        <span className="text-xs role-text-muted line-clamp-1">
                                          {hintText}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      <span className="text-xs font-semibold role-text-muted">
                                        {hintPenaltyType === 'MARKS' ? 'Deduct Marks:' : 'Deduct (Mins):'}
                                      </span>
                                      <input
                                        type="number"
                                        min="0"
                                        step={hintPenaltyType === 'MARKS' ? '0.5' : '1'}
                                        value={currentPenalty}
                                        onChange={e => {
                                          const val = parseFloat(e.target.value) || 0
                                          setHintPenalties(prev => {
                                            const arr = [...prev]
                                            arr[idx] = val
                                            return arr
                                          })
                                        }}
                                        className="w-20 px-2 py-1 text-xs rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] font-bold text-center text-amber-400"
                                      />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="p-4 bg-[var(--bg-raised)]/50 border-t border-[var(--border)] flex items-center justify-between gap-3">
                <span className="text-xs role-text-muted">
                  {hintModalEq.question?.hints?.length || 0} Hint(s) configured in Question Bank
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHintModalEq(null)}
                    className="btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveHintSettings}
                    disabled={savingHintSettings}
                    className="btn-primary text-xs font-bold flex items-center gap-1.5"
                  >
                    {savingHintSettings ? 'Saving...' : '💾 Save Hint Settings'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TWO-STEP DELETE CONFIRMATION MODAL */}
        {showDeleteModal && exam && (
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
                  onClick={() => setShowDeleteModal(false)}
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
                      Exam: <span className="font-bold text-white">"{exam.title}"</span> (#{exam.id})
                    </p>
                    <p className="opacity-90 mt-0.5">
                      Status: <span className="font-semibold uppercase text-amber-300">{exam.status}</span>
                    </p>
                    <p className="opacity-90 mt-0.5">
                      Questions linked: <span className="font-semibold text-white">{(exam.questions || []).length}</span>
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
                      onClick={() => setShowDeleteModal(false)}
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
                    To confirm deletion of <strong className="text-white">"{exam.title}"</strong>, type <span className="font-mono font-bold bg-rose-500/20 px-1.5 py-0.5 rounded text-rose-300">DELETE</span> below:
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
