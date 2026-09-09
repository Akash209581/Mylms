'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import { api } from '@/lib/api'

// Monaco Editor loaded lazily to avoid SSR issues
const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false, loading: () => (
  <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-gray-400 text-sm">Loading editor...</div>
)})

// ─── Types ──────────────────────────────────────────────────────────────────
interface Question {
  id: number; type: string; section: string; marks: number; negativeMarks: number
  questionText?: string; options?: string[]; sortOrder: number
  problemStatement?: string; inputFormat?: string; outputFormat?: string
  constraints?: string; allowedLanguages?: string[]; codeSnippet?: string
  sampleTestCases?: { input: string; output: string; explanation?: string }[]
}

interface Attempt {
  attemptId: number; examId: number; examTitle: string; status: string
  startTime: string; deadlineAt: string; serverTime: string
  durationMinutes: number; negativeMarking: boolean; tabSwitchMonitoring: boolean
  totalMarks: number; passingMarks: number
  mcqAnswers: Record<string, string | null>
  markedReview: number[]
  questions: Question[]
  latestCoding: Record<number, { code: string; language: string; status: string; score: number }>
}

// ─── Timer Component ─────────────────────────────────────────────────────────
function ExamTimer({ deadlineAt, serverTime, onExpire }: { deadlineAt: string; serverTime: string; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(0)
  const expiredRef = useRef(false)

  useEffect(() => {
    const serverOffset = Date.now() - new Date(serverTime).getTime()
    const deadline = new Date(deadlineAt).getTime()
    const tick = () => {
      const now = Date.now() - serverOffset
      const left = Math.max(0, Math.floor((deadline - now) / 1000))
      setRemaining(left)
      if (left === 0 && !expiredRef.current) { expiredRef.current = true; onExpire() }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [deadlineAt, serverTime])

  const h = Math.floor(remaining / 3600)
  const m = Math.floor((remaining % 3600) / 60)
  const s = remaining % 60
  const isUrgent = remaining < 300 // last 5 minutes

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-bold text-lg
      ${isUrgent ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-[var(--bg-raised)] role-text-primary'}`}>
      <span>⏱</span>
      <span>{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</span>
    </div>
  )
}

// ─── Question Palette ────────────────────────────────────────────────────────
function QuestionPalette({ questions, answers, markedReview, currentId, onJump }: {
  questions: Question[]; answers: Record<string, string | null>; markedReview: number[]
  currentId: number; onJump: (id: number) => void
}) {
  const mcqs = questions.filter(q => q.section === 'A')
  const codings = questions.filter(q => q.section === 'B')

  const getStatus = (q: Question) => {
    if (q.id === currentId) return 'current'
    if (markedReview.includes(q.id)) return 'review'
    if (answers[String(q.id)] !== undefined && answers[String(q.id)] !== null) return 'answered'
    return 'unanswered'
  }

  const paletteDot = (status: string) => ({
    current:    'bg-[var(--accent)] text-white ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--bg-base)]',
    answered:   'bg-green-500 text-white',
    review:     'bg-yellow-500 text-black',
    unanswered: 'bg-[var(--bg-hover)] role-text-muted',
  })[status]

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-bold role-text-muted mb-2 uppercase tracking-wider">Section A — MCQ</p>
        <div className="flex flex-wrap gap-1.5">
          {mcqs.map((q, i) => (
            <button key={q.id} onClick={() => onJump(q.id)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${paletteDot(getStatus(q))}`}>
              {i + 1}
            </button>
          ))}
        </div>
      </div>
      {codings.length > 0 && (
        <div>
          <p className="text-xs font-bold role-text-muted mb-2 uppercase tracking-wider">Section B — Coding</p>
          <div className="flex flex-wrap gap-1.5">
            {codings.map((q, i) => (
              <button key={q.id} onClick={() => onJump(q.id)}
                className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${paletteDot(getStatus(q))}`}>
                C{i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-1 pt-2 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        {[
          ['bg-green-500', 'Answered'],
          ['bg-[var(--accent)]', 'Current'],
          ['bg-yellow-500', 'Marked for Review'],
          ['bg-[var(--bg-hover)]', 'Not Answered'],
        ].map(([color, label]) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded ${color}`} />
            <span className="text-xs role-text-muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── MCQ Question ────────────────────────────────────────────────────────────
function McqQuestion({ question, selected, onSelect }: {
  question: Question; selected: string | null; onSelect: (opt: string) => void
}) {
  const opts = ['A', 'B', 'C', 'D']
  return (
    <div className="space-y-4">
      <div className="p-4 bg-[var(--bg-raised)] rounded-xl">
        <p className="text-sm font-semibold role-text-primary leading-relaxed">{question.questionText}</p>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-xs badge bg-blue-500/20 text-blue-400">MCQ</span>
          <span className="text-xs role-text-muted">{question.marks} marks</span>
          {question.negativeMarks > 0 && <span className="text-xs text-red-400">-{question.negativeMarks} wrong</span>}
        </div>
      </div>
      <div className="space-y-2">
        {question.options?.map((opt, i) => (
          <button
            key={i}
            onClick={() => onSelect(opts[i])}
            className={`w-full text-left p-4 rounded-xl border transition-all text-sm
              ${selected === opts[i]
                ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)] font-semibold'
                : 'border-[var(--border)] hover:border-[var(--border-strong)] role-text-primary'}`}
          >
            <span className={`inline-flex w-7 h-7 rounded-lg items-center justify-center mr-3 text-xs font-bold shrink-0
              ${selected === opts[i] ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-hover)] role-text-muted'}`}>
              {opts[i]}
            </span>
            {opt}
          </button>
        ))}
      </div>
      {selected && (
        <button onClick={() => onSelect(null as any)} className="text-xs role-text-muted hover:text-red-400 transition-colors">
          ✕ Clear Selection
        </button>
      )}
    </div>
  )
}

// ─── Main Exam Attempt Page ───────────────────────────────────────────────────
export default function ExamAttemptPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const examId = params?.id as string
  const attemptId = searchParams?.get('attemptId')

  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentQuestionId, setCurrentQuestionId] = useState<number | null>(null)
  const [answers, setAnswers] = useState<Record<string, string | null>>({})
  const [markedReview, setMarkedReview] = useState<number[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [tabWarnings, setTabWarnings] = useState(0)

  // Coding state
  const [code, setCode] = useState<Record<number, string>>({})
  const [language, setLanguage] = useState<Record<number, string>>({})
  const [codeResult, setCodeResult] = useState<Record<number, any>>({})
  const [running, setRunning] = useState<Record<number, boolean>>({})

  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!attemptId) { router.push(`/dashboard/student/exams/${examId}`); return }
    fetchAttempt()
  }, [attemptId])

  // Tab switch monitoring
  useEffect(() => {
    if (!attempt?.tabSwitchMonitoring) return
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setTabWarnings(w => w + 1)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [attempt?.tabSwitchMonitoring])

  const fetchAttempt = async () => {
    const r = await api.get(`/student/exams/attempts/${attemptId}`)
    const data: Attempt = r.data
    setAttempt(data)
    setAnswers(data.mcqAnswers || {})
    setMarkedReview(data.markedReview || [])
    if (data.questions.length > 0 && !currentQuestionId) {
      setCurrentQuestionId(data.questions[0].id)
    }
    // Load saved coding
    if (data.latestCoding) {
      const codes: Record<number, string> = {}
      const langs: Record<number, string> = {}
      for (const [qId, sub] of Object.entries(data.latestCoding)) {
        codes[Number(qId)] = sub.code
        langs[Number(qId)] = sub.language
      }
      setCode(codes)
      setLanguage(langs)
    }
    setLoading(false)
  }

  const autoSave = useCallback((newAnswers: Record<string, string | null>, newMarked: number[]) => {
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      await api.patch(`/student/exams/attempts/${attemptId}/answers`, {
        answers: newAnswers, markedReview: newMarked
      })
    }, 800)
  }, [attemptId])

  const selectAnswer = (questionId: number, opt: string | null) => {
    const newAnswers = { ...answers, [String(questionId)]: opt }
    setAnswers(newAnswers)
    autoSave(newAnswers, markedReview)
  }

  const toggleReview = (questionId: number) => {
    const newMarked = markedReview.includes(questionId)
      ? markedReview.filter(id => id !== questionId)
      : [...markedReview, questionId]
    setMarkedReview(newMarked)
    autoSave(answers, newMarked)
  }

  const runCode = async (questionId: number, isFinal: boolean) => {
    const c = code[questionId] || ''
    const lang = language[questionId] || 'python'
    if (!c.trim()) return
    setRunning(r => ({ ...r, [questionId]: true }))
    try {
      const r = await api.post(`/student/exams/attempts/${attemptId}/code`, {
        questionId, language: lang, code: c, isFinal
      })
      setCodeResult(prev => ({ ...prev, [questionId]: r.data }))
    } catch (e: any) {
      setCodeResult(prev => ({ ...prev, [questionId]: { error: e.response?.data?.message || 'Error' } }))
    }
    setRunning(r => ({ ...r, [questionId]: false }))
  }

  const submitExam = async () => {
    setSubmitting(true)
    // Final-submit all coding questions
    const codingQs = attempt?.questions.filter(q => q.section === 'B') || []
    for (const q of codingQs) {
      if (code[q.id]) await runCode(q.id, true).catch(() => {})
    }
    await api.post(`/student/exams/attempts/${attemptId}/submit`)
    router.push(`/dashboard/student/exams/${examId}/result?attemptId=${attemptId}`)
  }

  const handleExpire = () => {
    if (!submitting) submitExam()
  }

  const currentQuestion = attempt?.questions.find(q => q.id === currentQuestionId)
  const currentIndex = attempt?.questions.findIndex(q => q.id === currentQuestionId) ?? -1
  const totalQuestions = attempt?.questions.length ?? 0

  const navigatePrev = () => {
    if (currentIndex > 0) setCurrentQuestionId(attempt!.questions[currentIndex - 1].id)
  }
  const navigateNext = () => {
    if (currentIndex < totalQuestions - 1) setCurrentQuestionId(attempt!.questions[currentIndex + 1].id)
  }

  const answeredCount = Object.values(answers).filter(v => v !== null && v !== undefined).length
  const codingAttempted = Object.keys(code).filter(qId => {
    const q = attempt?.questions.find(q => q.id === Number(qId))
    return q?.section === 'B' && code[Number(qId)]?.trim()
  }).length

  if (loading) return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400 text-sm">Loading exam...</p>
      </div>
    </div>
  )

  if (!attempt || attempt.status !== 'IN_PROGRESS') return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <p className="text-gray-400">This exam is no longer active.</p>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a0a0f', fontFamily: "'Inter', sans-serif" }}>
      {/* ── Top Bar ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-3 border-b sticky top-0 z-50"
        style={{ background: 'rgba(15,15,25,0.95)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(12px)' }}>
        <div>
          <p className="text-white font-bold text-sm truncate max-w-sm">{attempt.examTitle}</p>
          <p className="text-gray-500 text-xs">Q{currentIndex + 1} / {totalQuestions}</p>
        </div>
        <div className="flex items-center gap-3">
          {tabWarnings > 0 && (
            <div className="text-xs text-red-400 bg-red-500/10 px-3 py-1 rounded-lg">
              ⚠ Tab switched {tabWarnings}×
            </div>
          )}
          <ExamTimer deadlineAt={attempt.deadlineAt} serverTime={attempt.serverTime} onExpire={handleExpire} />
          <button onClick={() => setShowSubmitModal(true)} className="btn-danger text-sm px-4 py-2">
            Submit Exam
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* ── Left Panel: Question ─────────────────────────────────────── */}
        <main className="flex-1 overflow-y-auto p-6">
          {currentQuestion && (
            <div>
              {/* Question Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className={`badge text-xs font-bold ${currentQuestion.section === 'A' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}>
                    Section {currentQuestion.section}
                  </span>
                  <span className="text-xs text-gray-500">Question {currentIndex + 1}</span>
                </div>
                <button
                  onClick={() => toggleReview(currentQuestion.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all font-semibold
                    ${markedReview.includes(currentQuestion.id)
                      ? 'border-yellow-500 bg-yellow-500/15 text-yellow-400'
                      : 'border-gray-600 text-gray-500 hover:border-yellow-500 hover:text-yellow-400'}`}
                >
                  {markedReview.includes(currentQuestion.id) ? '🔖 Marked for Review' : '🔖 Mark for Review'}
                </button>
              </div>

              {/* MCQ */}
              {currentQuestion.section === 'A' && (
                <McqQuestion
                  question={currentQuestion}
                  selected={answers[String(currentQuestion.id)] || null}
                  onSelect={opt => selectAnswer(currentQuestion.id, opt)}
                />
              )}

              {/* Coding */}
              {currentQuestion.section === 'B' && (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-900/80 rounded-xl border border-gray-700">
                    <h3 className="text-sm font-bold text-white mb-2">{currentQuestion.problemStatement}</h3>
                    {currentQuestion.inputFormat && (
                      <div className="mt-3"><p className="text-xs text-gray-400 font-semibold mb-1">Input Format:</p>
                        <p className="text-xs text-gray-300 font-mono">{currentQuestion.inputFormat}</p></div>
                    )}
                    {currentQuestion.outputFormat && (
                      <div className="mt-2"><p className="text-xs text-gray-400 font-semibold mb-1">Output Format:</p>
                        <p className="text-xs text-gray-300 font-mono">{currentQuestion.outputFormat}</p></div>
                    )}
                    {currentQuestion.constraints && (
                      <div className="mt-2"><p className="text-xs text-gray-400 font-semibold mb-1">Constraints:</p>
                        <p className="text-xs text-gray-300 font-mono">{currentQuestion.constraints}</p></div>
                    )}
                    {(currentQuestion.sampleTestCases?.length ?? 0) > 0 && (
                      <div className="mt-3 space-y-2">
                        <p className="text-xs text-gray-400 font-semibold">Sample Test Cases:</p>
                        {currentQuestion.sampleTestCases?.map((tc, i) => (
                          <div key={i} className="grid grid-cols-2 gap-2 text-xs">
                            <div className="p-2 bg-gray-800 rounded font-mono">
                              <p className="text-gray-500 mb-1">Input:</p>
                              <p className="text-green-400">{tc.input}</p>
                            </div>
                            <div className="p-2 bg-gray-800 rounded font-mono">
                              <p className="text-gray-500 mb-1">Output:</p>
                              <p className="text-blue-400">{tc.output}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Language Selector */}
                  <div className="flex items-center gap-3">
                    <select
                      className="text-sm px-3 py-2 rounded-lg border border-gray-700 bg-gray-900 text-white"
                      value={language[currentQuestion.id] || 'python'}
                      onChange={e => setLanguage(prev => ({ ...prev, [currentQuestion.id]: e.target.value }))}
                    >
                      {(currentQuestion.allowedLanguages || ['python', 'javascript', 'c', 'java']).map(l => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => runCode(currentQuestion.id, false)}
                      disabled={running[currentQuestion.id]}
                      className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm font-semibold transition-all disabled:opacity-50"
                    >
                      {running[currentQuestion.id] ? '⏳ Running...' : '▶ Run Code'}
                    </button>
                    <span className="text-xs text-gray-500">{currentQuestion.marks} marks</span>
                  </div>

                  {/* Monaco Editor */}
                  <div className="h-72 rounded-xl overflow-hidden border border-gray-700">
                    <MonacoEditor
                      height="100%"
                      language={language[currentQuestion.id] || 'python'}
                      theme="vs-dark"
                      value={code[currentQuestion.id] || currentQuestion.codeSnippet || ''}
                      onChange={v => setCode(prev => ({ ...prev, [currentQuestion.id]: v || '' }))}
                      options={{ minimap: { enabled: false }, fontSize: 14, scrollBeyondLastLine: false, padding: { top: 12 } }}
                    />
                  </div>

                  {/* Code Result */}
                  {codeResult[currentQuestion.id] && (
                    <div className="p-4 bg-gray-900 rounded-xl border border-gray-700 text-xs font-mono space-y-2">
                      {codeResult[currentQuestion.id].error ? (
                        <p className="text-red-400">{codeResult[currentQuestion.id].error}</p>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <span className={`font-bold ${codeResult[currentQuestion.id].passedPublic === codeResult[currentQuestion.id].totalPublic ? 'text-green-400' : 'text-yellow-400'}`}>
                              {codeResult[currentQuestion.id].passedPublic}/{codeResult[currentQuestion.id].totalPublic} public test cases passed
                            </span>
                          </div>
                          {codeResult[currentQuestion.id].publicResults?.map((r: any, i: number) => (
                            <div key={i} className={`p-2 rounded ${r.passed ? 'bg-green-900/30 border border-green-700/30' : 'bg-red-900/30 border border-red-700/30'}`}>
                              <span className={r.passed ? 'text-green-400' : 'text-red-400'}>
                                Test {i + 1}: {r.passed ? '✓ Passed' : '✗ Failed'}
                              </span>
                              {!r.passed && r.expected && (
                                <div className="mt-1 text-gray-400">
                                  <p>Expected: <span className="text-blue-400">{r.expected}</span></p>
                                  <p>Got: <span className="text-red-400">{r.actual}</span></p>
                                </div>
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Navigation */}
              <div className="flex justify-between mt-8 pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <button onClick={navigatePrev} disabled={currentIndex === 0} className="btn-secondary text-sm">
                  ← Previous
                </button>
                <button onClick={navigateNext} disabled={currentIndex === totalQuestions - 1} className="btn-primary text-sm">
                  Next →
                </button>
              </div>
            </div>
          )}
        </main>

        {/* ── Right Panel: Palette ─────────────────────────────────────── */}
        <aside className="w-64 border-l overflow-y-auto p-4 shrink-0"
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(10,10,20,0.8)' }}>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 font-semibold mb-1">PROGRESS</p>
              <div className="space-y-1 text-xs text-gray-400">
                <p>MCQ answered: <span className="text-white font-bold">{answeredCount}</span></p>
                <p>Coding attempted: <span className="text-white font-bold">{codingAttempted}</span></p>
                <p>Marked review: <span className="text-yellow-400 font-bold">{markedReview.length}</span></p>
              </div>
            </div>
            <QuestionPalette
              questions={attempt.questions}
              answers={answers}
              markedReview={markedReview}
              currentId={currentQuestionId!}
              onJump={setCurrentQuestionId}
            />
          </div>
        </aside>
      </div>

      {/* ── Submit Confirmation Modal ────────────────────────────────────── */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#1a1a2e] rounded-2xl p-8 max-w-md w-full mx-4 border border-white/10 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">⚠️</div>
              <h2 className="text-xl font-bold text-white">Submit Exam?</h2>
              <p className="text-gray-400 text-sm mt-2">This action cannot be undone. Make sure you've reviewed all questions.</p>
            </div>
            <div className="bg-[var(--bg-raised)] rounded-xl p-4 mb-6 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">MCQ Answered</span><span className="text-white font-bold">{answeredCount} / {attempt.questions.filter(q => q.section === 'A').length}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Coding Attempted</span><span className="text-white font-bold">{codingAttempted} / {attempt.questions.filter(q => q.section === 'B').length}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Marked for Review</span><span className="text-yellow-400 font-bold">{markedReview.length}</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSubmitModal(false)} disabled={submitting} className="btn-secondary flex-1">
                Continue Exam
              </button>
              <button onClick={submitExam} disabled={submitting} className="btn-danger flex-1">
                {submitting ? 'Submitting...' : '✓ Submit Final'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
