'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { api, API_URL } from '@/lib/api'
import { io } from 'socket.io-client'

import ExamHeader from './components/ExamHeader'
import QuestionNavigator from './components/QuestionNavigator'
import McqWorkspace from './components/McqWorkspace'
import CodingWorkspace from './components/CodingWorkspace'
import ExamSubmitModal from './components/ExamSubmitModal'

// ─── Types ──────────────────────────────────────────────────────────────────
interface SampleTestCase {
  input: string
  output: string
  explanation?: string
}

interface Question {
  id: number
  type: string
  section: string
  marks: number
  negativeMarks: number
  questionText?: string
  options?: string[]
  sortOrder: number
  problemStatement?: string
  inputFormat?: string
  outputFormat?: string
  constraints?: string
  allowedLanguages?: string[]
  codeSnippet?: string
  sampleTestCases?: SampleTestCase[]
}

interface Attempt {
  attemptId: number
  examId: number
  examTitle: string
  status: string
  startTime: string
  deadlineAt: string
  serverTime: string
  durationMinutes: number
  negativeMarking: boolean
  tabSwitchMonitoring: boolean
  totalMarks: number
  passingMarks: number
  mcqAnswers: Record<string, string | null>
  markedReview: number[]
  questions: Question[]
  latestCoding: Record<number, { code: string; language: string; status: string; score: number }>
}

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
  const [isNavigatorOpen, setIsNavigatorOpen] = useState(false)

  // Coding State
  const [code, setCode] = useState<Record<number, string>>({})
  const [language, setLanguage] = useState<Record<number, string>>({})
  const [codeResult, setCodeResult] = useState<Record<number, any>>({})
  const [running, setRunning] = useState<Record<number, boolean>>({})
  const [jobStates, setJobStates] = useState<Record<number, {
    jobId: string
    status: string
    position?: number
    currentCase?: number
    totalCases?: number
    executionType: 'RUN' | 'SUBMIT'
  }>>({})

  const saveTimer = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!attemptId) {
      router.push(`/dashboard/student/exams/${examId}`)
      return
    }
    fetchAttempt()
  }, [attemptId])

  // Tab switch monitoring
  useEffect(() => {
    if (!attempt?.tabSwitchMonitoring) return
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        setTabWarnings((w) => w + 1)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [attempt?.tabSwitchMonitoring])

  const fetchAttempt = async () => {
    try {
      const r = await api.get(`/student/exams/attempts/${attemptId}`)
      const data: Attempt = r.data
      setAttempt(data)
      setAnswers(data.mcqAnswers || {})
      setMarkedReview(data.markedReview || [])

      if (data.questions.length > 0 && !currentQuestionId) {
        setCurrentQuestionId(data.questions[0].id)
      }

      // Load saved coding responses and initialize default templates
      const codes: Record<number, string> = {}
      const langs: Record<number, string> = {}

      data.questions.forEach((q) => {
        if (q.section === 'B') {
          if (data.latestCoding && data.latestCoding[q.id]) {
            codes[q.id] = data.latestCoding[q.id].code
            langs[q.id] = data.latestCoding[q.id].language || 'python'
          } else {
            codes[q.id] = q.codeSnippet || ''
            langs[q.id] = (q.allowedLanguages && q.allowedLanguages[0]) || 'python'
          }
        }
      })

      setCode(codes)
      setLanguage(langs)
      setLoading(false)
    } catch (err) {
      console.error('Failed to load attempt:', err)
      setLoading(false)
    }
  }

  // Auto-save MCQ answers and review marks
  const autoSave = useCallback(
    (newAnswers: Record<string, string | null>, newMarked: number[]) => {
      clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(async () => {
        try {
          await api.patch(`/student/exams/attempts/${attemptId}/answers`, {
            answers: newAnswers,
            markedReview: newMarked,
          })
        } catch (e) {
          console.warn('Autosave failed:', e)
        }
      }, 600)
    },
    [attemptId]
  )

  const selectAnswer = (questionId: number, opt: string | null) => {
    const newAnswers = { ...answers, [String(questionId)]: opt }
    setAnswers(newAnswers)
    autoSave(newAnswers, markedReview)
  }

  const toggleReview = (questionId: number) => {
    const newMarked = markedReview.includes(questionId)
      ? markedReview.filter((id) => id !== questionId)
      : [...markedReview, questionId]
    setMarkedReview(newMarked)
    autoSave(answers, newMarked)
  }

  // Update Code in memory (preserves code on question switch)
  const handleCodeChange = (questionId: number, newCode: string) => {
    setCode((prev) => ({ ...prev, [questionId]: newCode }))
  }

  const handleLanguageChange = (questionId: number, newLang: string) => {
    setLanguage((prev) => ({ ...prev, [questionId]: newLang }))
  }

  // Run Code or Submit Code
  const runCode = async (questionId: number, isFinal: boolean) => {
    const c = code[questionId] || ''
    const lang = language[questionId] || 'python'
    if (!c.trim()) return

    setRunning((r) => ({ ...r, [questionId]: true }))
    setCodeResult((prev) => {
      const copy = { ...prev }
      delete copy[questionId]
      return copy
    })

    try {
      const r = await api.post(`/student/exams/attempts/${attemptId}/code`, {
        questionId,
        language: lang,
        code: c,
        isFinal,
      })
      const { jobId, position, status, executionType } = r.data

      setJobStates((prev) => ({
        ...prev,
        [questionId]: {
          jobId,
          status: status || 'QUEUED',
          position: position || 1,
          executionType: executionType || (isFinal ? 'SUBMIT' : 'RUN'),
          currentCase: 0,
          totalCases: 0,
        },
      }))

      // Connect to Socket.IO gateway for real-time live events
      let socket: any = null
      try {
        socket = io(`${API_URL}/code-execution`, {
          transports: ['websocket', 'polling'],
          withCredentials: true,
        })
        socket.emit('join_job', { jobId })

        socket.on('queue_status', (data: any) => {
          if (data.jobId === jobId) {
            setJobStates((prev) => ({
              ...prev,
              [questionId]: {
                ...prev[questionId],
                status: 'QUEUED',
                position: data.position,
              },
            }))
          }
        })

        socket.on('job_progress', (data: any) => {
          if (data.jobId === jobId) {
            setJobStates((prev) => ({
              ...prev,
              [questionId]: {
                ...prev[questionId],
                status: 'RUNNING',
                currentCase: data.currentCase,
                totalCases: data.totalCases,
              },
            }))
          }
        })

        socket.on('job_completed', (data: any) => {
          if (data.jobId === jobId) {
            setCodeResult((prev) => ({ ...prev, [questionId]: data.result }))
            setRunning((r) => ({ ...r, [questionId]: false }))
            setJobStates((prev) => {
              const copy = { ...prev }
              delete copy[questionId]
              return copy
            })
            if (socket) socket.disconnect()
          }
        })

        socket.on('job_failed', (data: any) => {
          if (data.jobId === jobId) {
            setCodeResult((prev) => ({ ...prev, [questionId]: { error: data.error } }))
            setRunning((r) => ({ ...r, [questionId]: false }))
            setJobStates((prev) => {
              const copy = { ...prev }
              delete copy[questionId]
              return copy
            })
            if (socket) socket.disconnect()
          }
        })
      } catch (sockErr) {
        console.warn('Socket error, relying on polling fallback:', sockErr)
      }

      // Fast Resilient Polling Fallback
      const pollTimer = setInterval(async () => {
        try {
          const pollRes = await api.get(`/student/exams/attempts/${attemptId}/code/jobs/${jobId}`)
          const data = pollRes.data
          if (!data) return

          if (data.status === 'QUEUED') {
            setJobStates((prev) => ({
              ...prev,
              [questionId]: {
                ...prev[questionId],
                status: 'QUEUED',
                position: data.position ?? prev[questionId]?.position,
              },
            }))
          } else if (data.status === 'RUNNING') {
            setJobStates((prev) => ({
              ...prev,
              [questionId]: {
                ...prev[questionId],
                status: 'RUNNING',
              },
            }))
          } else if (
            data.result ||
            ['ACCEPTED', 'PARTIAL', 'WRONG_ANSWER', 'COMPILATION_ERROR', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'SYSTEM_ERROR'].includes(data.status)
          ) {
            clearInterval(pollTimer)
            if (socket) socket.disconnect()
            setCodeResult((prev) => ({ ...prev, [questionId]: data.result || { status: data.status, error: data.error } }))
            setRunning((r) => ({ ...r, [questionId]: false }))
            setJobStates((prev) => {
              const copy = { ...prev }
              delete copy[questionId]
              return copy
            })
          }
        } catch {
          // Keep polling
        }
      }, 1000)

      setTimeout(() => {
        clearInterval(pollTimer)
        if (socket) socket.disconnect()
        setRunning((r) => ({ ...r, [questionId]: false }))
      }, 90000)
    } catch (e: any) {
      setCodeResult((prev) => ({
        ...prev,
        [questionId]: { error: e.response?.data?.message || 'Failed to submit code for execution' },
      }))
      setRunning((r) => ({ ...r, [questionId]: false }))
    }
  }

  // Final Exam Submission
  const submitExam = async () => {
    setSubmitting(true)
    try {
      const codingQs = attempt?.questions.filter((q) => q.section === 'B') || []
      for (const q of codingQs) {
        if (code[q.id]?.trim()) {
          await runCode(q.id, true).catch(() => {})
        }
      }
      await api.post(`/student/exams/attempts/${attemptId}/submit`)
      router.push(`/dashboard/student/exams/${examId}/result?attemptId=${attemptId}`)
    } catch (err) {
      console.error('Failed to submit exam:', err)
      setSubmitting(false)
    }
  }

  const handleExpire = () => {
    if (!submitting) submitExam()
  }

  const currentQuestion = attempt?.questions.find((q) => q.id === currentQuestionId)
  const currentIndex = attempt?.questions.findIndex((q) => q.id === currentQuestionId) ?? -1
  const totalQuestions = attempt?.questions.length ?? 0

  const navigatePrev = () => {
    if (currentIndex > 0) {
      setCurrentQuestionId(attempt!.questions[currentIndex - 1].id)
    }
  }

  const navigateNext = () => {
    if (currentIndex < totalQuestions - 1) {
      setCurrentQuestionId(attempt!.questions[currentIndex + 1].id)
    }
  }

  // Answer statistics
  const mcqs = attempt?.questions.filter((q) => q.section === 'A') || []
  const codings = attempt?.questions.filter((q) => q.section === 'B') || []
  const mcqAnswered = Object.values(answers).filter((v) => v !== null && v !== undefined && v !== '').length
  const codingAttempted = Object.keys(code).filter((qId) => {
    const q = attempt?.questions.find((question) => question.id === Number(qId))
    return q?.section === 'B' && code[Number(qId)]?.trim()
  }).length

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm font-medium">Preparing examination workspace...</p>
        </div>
      </div>
    )
  }

  if (!attempt || attempt.status !== 'IN_PROGRESS') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md text-center space-y-4">
          <div className="text-3xl">📋</div>
          <h2 className="text-lg font-bold text-slate-100">Exam Not Active</h2>
          <p className="text-slate-400 text-xs">
            This examination attempt is no longer in progress or has already been submitted.
          </p>
          <button
            onClick={() => router.push('/dashboard/student/exams')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
          >
            Return to Exams
          </button>
        </div>
      </div>
    )
  }

  const isCodingQuestion = currentQuestion?.section === 'B'

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* ── 1. Top Exam Header ── */}
      <ExamHeader
        examTitle={attempt.examTitle}
        currentIndex={currentIndex}
        totalQuestions={totalQuestions}
        currentSection={currentQuestion?.section || 'A'}
        currentType={currentQuestion?.type || 'MCQ'}
        isCoding={isCodingQuestion}
        language={currentQuestion ? language[currentQuestion.id] : 'python'}
        allowedLanguages={currentQuestion?.allowedLanguages}
        onLanguageChange={(lang) => currentQuestion && handleLanguageChange(currentQuestion.id, lang)}
        isLanguageDisabled={currentQuestion ? running[currentQuestion.id] : false}
        deadlineAt={attempt.deadlineAt}
        serverTime={attempt.serverTime}
        onExpire={handleExpire}
        tabWarnings={tabWarnings}
        onToggleNavigator={() => setIsNavigatorOpen(!isNavigatorOpen)}
        isNavigatorOpen={isNavigatorOpen}
        answeredCount={mcqAnswered + codingAttempted}
        onSubmitExamClick={() => setShowSubmitModal(true)}
      />

      {/* ── 2. Middle Main Workspace ── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Question Navigator Palette */}
        <QuestionNavigator
          questions={attempt.questions}
          answers={answers}
          markedReview={markedReview}
          latestCoding={attempt.latestCoding || {}}
          currentCode={code}
          currentId={currentQuestionId!}
          onJump={setCurrentQuestionId}
          isOpen={isNavigatorOpen}
          onClose={() => setIsNavigatorOpen(false)}
        />

        {/* Question Workspace Area */}
        <main className="flex-1 flex flex-col overflow-hidden bg-slate-950">
          {currentQuestion && (
            <>
              {currentQuestion.section === 'A' ? (
                /* MCQ WORKSPACE */
                <div className="flex-1 overflow-y-auto">
                  <McqWorkspace
                    question={currentQuestion}
                    questionIndex={currentIndex}
                    totalQuestions={totalQuestions}
                    selectedOption={answers[String(currentQuestion.id)] || null}
                    onSelectOption={(opt) => selectAnswer(currentQuestion.id, opt)}
                    isMarkedForReview={markedReview.includes(currentQuestion.id)}
                    onToggleReview={() => toggleReview(currentQuestion.id)}
                  />
                </div>
              ) : (
                /* LEETCODE-STYLE CODING WORKSPACE */
                <CodingWorkspace
                  question={currentQuestion}
                  questionIndex={currentIndex}
                  totalQuestions={totalQuestions}
                  code={code[currentQuestion.id] || ''}
                  onCodeChange={(val) => handleCodeChange(currentQuestion.id, val)}
                  language={language[currentQuestion.id] || 'python'}
                  onLanguageChange={(val) => handleLanguageChange(currentQuestion.id, val)}
                  codeResult={codeResult[currentQuestion.id]}
                  jobState={jobStates[currentQuestion.id]}
                  isRunning={running[currentQuestion.id] || false}
                  onRunCode={() => runCode(currentQuestion.id, false)}
                  onSubmitCode={() => runCode(currentQuestion.id, true)}
                  isMarkedForReview={markedReview.includes(currentQuestion.id)}
                  onToggleReview={() => toggleReview(currentQuestion.id)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* ── 3. Bottom Navigation Dock ── */}
      <footer className="h-12 bg-slate-900 border-t border-slate-800 px-4 sm:px-6 flex items-center justify-between shrink-0 z-20">
        <button
          onClick={navigatePrev}
          disabled={currentIndex <= 0}
          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-200 border border-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1"
        >
          <span>←</span>
          <span className="hidden sm:inline">Previous</span>
        </button>

        <div className="flex items-center gap-2">
          {currentQuestion && (
            <button
              onClick={() => toggleReview(currentQuestion.id)}
              className={`text-xs px-3 py-1 rounded-md font-semibold transition-all border flex items-center gap-1.5 ${
                markedReview.includes(currentQuestion.id)
                  ? 'bg-amber-400/15 border-amber-400 text-amber-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>{markedReview.includes(currentQuestion.id) ? '🔖' : '⚐'}</span>
              <span className="hidden sm:inline">
                {markedReview.includes(currentQuestion.id) ? 'Marked for Review' : 'Mark for Review'}
              </span>
            </button>
          )}
        </div>

        <button
          onClick={navigateNext}
          disabled={currentIndex >= totalQuestions - 1}
          className="px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white shadow-sm shadow-indigo-950/40 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center gap-1"
        >
          <span className="hidden sm:inline">Next</span>
          <span>→</span>
        </button>
      </footer>

      {/* ── 4. Pre-Submit Audit Modal ── */}
      <ExamSubmitModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirmSubmit={submitExam}
        isSubmitting={submitting}
        totalQuestions={totalQuestions}
        mcqTotal={mcqs.length}
        mcqAnswered={mcqAnswered}
        codingTotal={codings.length}
        codingAttempted={codingAttempted}
        markedReviewCount={markedReview.length}
      />
    </div>
  )
}
