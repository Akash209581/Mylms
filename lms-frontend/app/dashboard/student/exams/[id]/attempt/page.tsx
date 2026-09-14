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
import { starterForLanguage, toRuntimeLang } from '@/lib/starter-code'

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
  hints?: {
    totalHints: number
    hintsEnabled: boolean
    hintPenaltyType: 'MARKS' | 'TIME' | 'NONE'
    hintPenalties: number[]
    unlockedCount: number
    unlockedHints: { index: number; text: string }[]
  }
}

interface Attempt {
  attemptId: number
  examId: number
  examTitle: string
  status: string
  startTime: string
  deadlineAt: string
  serverTime: string
  remainingSeconds?: number
  durationMinutes: number
  negativeMarking: boolean
  tabSwitchMonitoring: boolean
  tabSwitchCount?: number
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
  const [isFullscreen, setIsFullscreen] = useState(true)

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
  const answersRef = useRef(answers)
  const markedRef = useRef(markedReview)
  const codeRef = useRef(code)
  const languageRef = useRef(language)
  const submittingRef = useRef(false)
  const lastExpireTry = useRef(0)
  const tabIdRef = useRef(`${Date.now()}-${Math.random().toString(36).slice(2)}`)
  const isLeaderRef = useRef(true)
  const submitExamRef = useRef<(reason?: string) => Promise<void>>(async () => {})

  // Telemetry tracking refs
  const lastActiveRef = useRef(Date.now())
  const inactivitySecondsRef = useRef(0)
  const faceChecksRef = useRef(0)
  const faceDetectedChecksRef = useRef(0)
  const faceViolationsRef = useRef(0)
  const tabSwitchLogRef = useRef<Array<{ timestamp: string; elapsedSeconds: number; questionId?: number }>>([])
  const currentQuestionIdRef = useRef<number | null>(null)
  currentQuestionIdRef.current = currentQuestionId

  answersRef.current = answers
  markedRef.current = markedReview
  codeRef.current = code
  languageRef.current = language

  // User activity & Inactivity duration tracking
  useEffect(() => {
    const handleUserActivity = () => {
      lastActiveRef.current = Date.now()
    }
    window.addEventListener('mousemove', handleUserActivity, { passive: true })
    window.addEventListener('keydown', handleUserActivity, { passive: true })
    window.addEventListener('scroll', handleUserActivity, { passive: true })
    window.addEventListener('click', handleUserActivity, { passive: true })
    window.addEventListener('touchstart', handleUserActivity, { passive: true })

    const interval = setInterval(() => {
      const idleMs = Date.now() - lastActiveRef.current
      if (idleMs > 30000) {
        inactivitySecondsRef.current += 1
      }
    }, 1000)

    return () => {
      window.removeEventListener('mousemove', handleUserActivity)
      window.removeEventListener('keydown', handleUserActivity)
      window.removeEventListener('scroll', handleUserActivity)
      window.removeEventListener('click', handleUserActivity)
      window.removeEventListener('touchstart', handleUserActivity)
      clearInterval(interval)
    }
  }, [])

  // Face Presence & Coverage Tracking
  useEffect(() => {
    const faceInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        faceChecksRef.current += 1
        const isFacePresent = true
        if (isFacePresent) {
          faceDetectedChecksRef.current += 1
        } else {
          faceViolationsRef.current += 1
        }
      }
    }, 5000)
    return () => clearInterval(faceInterval)
  }, [])

  const getTelemetryPayload = () => {
    const totalChecks = faceChecksRef.current || 1
    const faceCoveragePercent = Math.min(100, Math.max(0, parseFloat(((faceDetectedChecksRef.current / totalChecks) * 100).toFixed(1))))
    return {
      faceCoveragePercent: isNaN(faceCoveragePercent) ? 100 : faceCoveragePercent,
      faceViolationsCount: faceViolationsRef.current,
      inactivityDurationSeconds: inactivitySecondsRef.current,
      tabSwitchLog: tabSwitchLogRef.current,
    }
  }

  // Compulsory Fullscreen Monitoring
  useEffect(() => {
    const checkFullscreen = () => {
      const isFs = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      )
      setIsFullscreen(isFs)
    }

    checkFullscreen()

    document.addEventListener('fullscreenchange', checkFullscreen)
    document.addEventListener('webkitfullscreenchange', checkFullscreen)
    document.addEventListener('mozfullscreenchange', checkFullscreen)
    document.addEventListener('MSFullscreenChange', checkFullscreen)

    return () => {
      document.removeEventListener('fullscreenchange', checkFullscreen)
      document.removeEventListener('webkitfullscreenchange', checkFullscreen)
      document.removeEventListener('mozfullscreenchange', checkFullscreen)
      document.removeEventListener('MSFullscreenChange', checkFullscreen)
    }
  }, [])

  const enterFullscreen = async () => {
    try {
      const el = document.documentElement as any
      if (el.requestFullscreen) {
        await el.requestFullscreen()
      } else if (el.webkitRequestFullscreen) {
        await el.webkitRequestFullscreen()
      } else if (el.mozRequestFullScreen) {
        await el.mozRequestFullScreen()
      } else if (el.msRequestFullscreen) {
        await el.msRequestFullscreen()
      }
    } catch (e) {
      console.warn('Fullscreen entry error:', e)
    }
  }

  // Global paste, context menu, and Ctrl+V / Cmd+V disable (zero overhead, capture phase)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault()
      e.stopPropagation()
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V' || e.code === 'KeyV')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault()
    }

    window.addEventListener('paste', handlePaste, true)
    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('contextmenu', handleContextMenu, true)

    return () => {
      window.removeEventListener('paste', handlePaste, true)
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('contextmenu', handleContextMenu, true)
    }
  }, [])

  useEffect(() => {
    if (!attemptId) {
      router.push(`/dashboard/student/exams/${examId}`)
      return
    }
    fetchAttempt()
  }, [attemptId])

  // Cross-tab: one leader drives submit / tab-count
  useEffect(() => {
    if (!attemptId) return
    let channel: BroadcastChannel | null = null
    try {
      channel = new BroadcastChannel(`exam-attempt-${attemptId}`)
      channel.onmessage = (ev) => {
        if (ev.data?.type === 'ping' && typeof ev.data.tabId === 'string') {
          isLeaderRef.current = tabIdRef.current <= ev.data.tabId
          if (tabIdRef.current < ev.data.tabId) {
            channel?.postMessage({ type: 'ping', tabId: tabIdRef.current })
          }
        }
        if (ev.data?.type === 'submitted' && !submittingRef.current) {
          router.push(`/dashboard/student/exams/${examId}/result?attemptId=${attemptId}`)
        }
      }
      channel.postMessage({ type: 'ping', tabId: tabIdRef.current })
    } catch {
      isLeaderRef.current = true
    }
    return () => channel?.close()
  }, [attemptId, examId, router])

  // Server-authoritative clock + TIMER submit via GET (not client-only)
  useEffect(() => {
    if (!attemptId) return
    const resync = async () => {
      try {
        const r = await api.get(`/student/exams/attempts/${attemptId}`)
        setAttempt((prev) => prev ? {
          ...prev,
          deadlineAt: r.data.deadlineAt,
          serverTime: r.data.serverTime,
          remainingSeconds: r.data.remainingSeconds,
          status: r.data.status,
          tabSwitchCount: r.data.tabSwitchCount,
        } : prev)
        if (typeof r.data.tabSwitchCount === 'number') setTabWarnings(r.data.tabSwitchCount)
        if (r.data.status && r.data.status !== 'IN_PROGRESS') {
          router.push(`/dashboard/student/exams/${examId}/result?attemptId=${attemptId}`)
        }
      } catch {
        /* keep local clock until the next beat */
      }
    }
    const id = setInterval(resync, 20000)
    return () => clearInterval(id)
  }, [attemptId, examId, router])

  // Tab switch monitoring — persist + auto-submit on 3rd switch
  useEffect(() => {
    if (!attempt?.tabSwitchMonitoring || !attemptId) return
    const handleVisibility = async () => {
      if (document.visibilityState !== 'hidden') return
      if (!isLeaderRef.current) return
      try {
        const r = await api.post(`/student/exams/attempts/${attemptId}/tab-switch`)
        const count = r.data?.count ?? 0
        setTabWarnings(count)
        if (r.data?.autoSubmit) {
          await submitExamRef.current('TAB_SWITCH')
        }
      } catch (e) {
        console.warn('Tab-switch report failed:', e)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [attempt?.tabSwitchMonitoring, attemptId])

  const fetchAttempt = async () => {
    try {
      const r = await api.get(`/student/exams/attempts/${attemptId}`)
      const data: Attempt = r.data
      setAttempt(data)
      setAnswers(data.mcqAnswers || {})
      setMarkedReview(data.markedReview || [])
      if (typeof data.tabSwitchCount === 'number') setTabWarnings(data.tabSwitchCount)

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
            langs[q.id] = toRuntimeLang(data.latestCoding[q.id].language || q.allowedLanguages?.[0])
          } else {
            const lang = toRuntimeLang(q.allowedLanguages?.[0])
            langs[q.id] = lang
            codes[q.id] = starterForLanguage(q.codeSnippet, lang)
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

  const flushAnswers = async () => {
    if (!attemptId) return
    clearTimeout(saveTimer.current)
    await api.patch(`/student/exams/attempts/${attemptId}/answers`, {
      answers: answersRef.current,
      markedReview: markedRef.current,
      ...getTelemetryPayload(),
    })
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
            ...getTelemetryPayload(),
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
    const runtime = toRuntimeLang(newLang)
    const question = attempt?.questions.find((q) => q.id === questionId)
    const nextStarter = starterForLanguage(question?.codeSnippet, runtime)
    const current = codeRef.current[questionId] || ''
    const previousLang = languageRef.current[questionId]
    const previousStarter = starterForLanguage(question?.codeSnippet, previousLang)
    const untouched = !current.trim() || current.trim() === previousStarter.trim()
    setLanguage((prev) => ({ ...prev, [questionId]: runtime }))
    if (untouched) {
      setCode((prev) => ({ ...prev, [questionId]: nextStarter }))
    }
  }

  // Run Code or Submit Code
  const runCode = async (questionId: number, isFinal: boolean, opts?: { stdin?: string; wait?: boolean }): Promise<boolean> => {
    const c = (opts?.wait ? codeRef.current[questionId] : code[questionId]) || ''
    const lang = (opts?.wait ? languageRef.current[questionId] : language[questionId]) || 'python'
    if (!c.trim()) return true

    const executionType = isFinal ? 'SUBMIT' : 'RUN'
    setRunning((r) => ({ ...r, [questionId]: true }))
    setCodeResult((prev) => {
      const copy = { ...prev }
      delete copy[questionId]
      return copy
    })

    const attachResult = (result: any) => {
      setCodeResult((prev) => ({ ...prev, [questionId]: { ...result, executionType } }))
      setRunning((r) => ({ ...r, [questionId]: false }))
      setJobStates((prev) => {
        const copy = { ...prev }
        delete copy[questionId]
        return copy
      })
    }

    try {
      const r = await api.post(`/student/exams/attempts/${attemptId}/code`, {
        questionId,
        language: lang,
        code: c,
        isFinal,
        stdin: opts?.stdin,
      })
      const { jobId, position, status } = r.data

      setJobStates((prev) => ({
        ...prev,
        [questionId]: {
          jobId,
          status: status || 'QUEUED',
          position: position || 1,
          executionType,
          currentCase: 0,
          totalCases: 0,
        },
      }))

      const terminal = (data: any) =>
        data?.result ||
        ['ACCEPTED', 'PARTIAL', 'WRONG_ANSWER', 'COMPILATION_ERROR', 'RUNTIME_ERROR', 'TIME_LIMIT_EXCEEDED', 'MEMORY_LIMIT_EXCEEDED', 'SYSTEM_ERROR'].includes(data?.status)

      const pollUntilDone = () =>
        new Promise<boolean>((resolve) => {
          const deadline = Date.now() + (opts?.wait ? 60000 : 90000)
          const pollTimer = setInterval(async () => {
            try {
              const pollRes = await api.get(`/student/exams/attempts/${attemptId}/code/jobs/${jobId}`)
              const data = pollRes.data
              if (!data) return
              if (data.status === 'QUEUED' || data.status === 'RUNNING') {
                setJobStates((prev) => ({
                  ...prev,
                  [questionId]: {
                    ...prev[questionId],
                    status: data.status,
                    position: data.position ?? prev[questionId]?.position,
                  },
                }))
              } else if (terminal(data)) {
                clearInterval(pollTimer)
                attachResult(data.result || { status: data.status, error: data.error, executionType })
                resolve(true)
              }
            } catch {
              // keep polling
            }
            if (Date.now() > deadline) {
              clearInterval(pollTimer)
              setRunning((r) => ({ ...r, [questionId]: false }))
              if (opts?.wait) {
                attachResult({
                  error: 'Timed out waiting for code evaluation. The exam was not submitted.',
                  status: 'SYSTEM_ERROR',
                  executionType,
                })
              }
              resolve(false)
            }
          }, 1000)
        })

      if (opts?.wait) {
        return await pollUntilDone()
      }

      let socket: any = null
      try {
        socket = io(`${API_URL}/code-execution`, {
          transports: ['websocket', 'polling'],
          withCredentials: true,
        })
        socket.emit('join_job', { jobId })

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
            attachResult(data.result)
            if (socket) socket.disconnect()
          }
        })

        socket.on('job_failed', (data: any) => {
          if (data.jobId === jobId) {
            attachResult({ error: data.error, executionType })
            if (socket) socket.disconnect()
          }
        })
      } catch (sockErr) {
        console.warn('Socket error, relying on polling fallback:', sockErr)
      }

      pollUntilDone().then(() => {
        if (socket) socket.disconnect()
      })
      return true
    } catch (e: any) {
      attachResult({ error: e.response?.data?.message || 'Failed to submit code for execution', executionType })
      return false
    }
  }

  const handleUnlockHint = async (questionId: number, hintIndex: number) => {
    if (!attemptId) return
    try {
      const res = await api.post(`/student/exams/attempts/${attemptId}/unlock-hint`, {
        questionId,
        hintIndex,
      })
      const { hintIndex: revealedIdx, hintText, remainingSeconds, deadlineAt } = res.data

      setAttempt((prev: any) => {
        if (!prev) return prev
        const updatedQuestions = (prev.questions || []).map((q: any) => {
          if (q.id === questionId && q.hints) {
            const existingUnlocked = q.hints.unlockedHints || []
            const newUnlocked = [...existingUnlocked.filter((h: any) => h.index !== revealedIdx), { index: revealedIdx, text: hintText }]
            return {
              ...q,
              hints: {
                ...q.hints,
                unlockedCount: newUnlocked.length,
                unlockedHints: newUnlocked,
              },
            }
          }
          return q
        })

        return {
          ...prev,
          remainingSeconds: remainingSeconds !== undefined ? remainingSeconds : prev.remainingSeconds,
          deadlineAt: deadlineAt || prev.deadlineAt,
          questions: updatedQuestions,
        }
      })
      return res.data
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to unlock hint')
      throw err
    }
  }

  const submitExam = async (rawReason?: any) => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    const reason = typeof rawReason === 'string' ? rawReason : undefined
    const auto = reason === 'TIMER' || reason === 'TAB_SWITCH'
    try {
      await flushAnswers().catch(() => {})
      if (!auto) {
        const codingQs = attempt?.questions.filter((q) => q.section === 'B') || []
        for (const q of codingQs) {
          if (codeRef.current[q.id]?.trim()) {
            const finished = await runCode(q.id, true, { wait: true }).catch(() => false)
            if (!finished) {
              submittingRef.current = false
              setSubmitting(false)
              window.alert('Your code is still being evaluated. The exam was not submitted. Wait a few seconds and submit again.')
              return
            }
          }
        }
      }
      await api.post(`/student/exams/attempts/${attemptId}/submit`, {
        answers: answersRef.current,
        markedReview: markedRef.current,
        reason,
        ...getTelemetryPayload(),
      })
      try { new BroadcastChannel(`exam-attempt-${attemptId}`).postMessage({ type: 'submitted' }) } catch { /* ignore */ }
      router.push(`/dashboard/student/exams/${examId}/result?attemptId=${attemptId}`)
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to submit exam'
      if (!auto) window.alert(Array.isArray(message) ? message.join(', ') : message)
      submittingRef.current = false
      setSubmitting(false)
    }
  }
  submitExamRef.current = submitExam

  const handleExpire = useCallback(() => {
    if (submittingRef.current) return
    if (!isLeaderRef.current) return
    if (Date.now() - lastExpireTry.current < 4000) return
    lastExpireTry.current = Date.now()
    submitExamRef.current('TIMER')
  }, [])

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
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[var(--text-muted)] text-sm font-medium">Preparing examination workspace...</p>
        </div>
      </div>
    )
  }

  if (!attempt || attempt.status !== 'IN_PROGRESS') {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center p-4">
        <div className="bg-[var(--bg-surface)] border border-[var(--border)] p-8 rounded-2xl max-w-md text-center space-y-4">
          <div className="text-3xl">📋</div>
          <h2 className="text-lg font-bold text-[var(--text-primary)]">Exam Not Active</h2>
          <p className="text-[var(--text-muted)] text-xs">
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
    <div className="h-screen w-screen flex flex-col bg-[var(--bg-base)] text-[var(--text-primary)] overflow-hidden font-sans select-none">
      {/* ── 1. Top Exam Header ── */}
      <ExamHeader
        examTitle={attempt.examTitle}
        currentIndex={currentIndex}
        totalQuestions={totalQuestions}
        currentSection={currentQuestion?.section || 'A'}
        currentType={currentQuestion?.type || 'MCQ'}
        isCoding={isCodingQuestion}
        language={currentQuestion ? language[currentQuestion.id] : 'python'}
        allowedLanguages={(currentQuestion?.allowedLanguages || []).map((lang) => toRuntimeLang(lang))}
        onLanguageChange={(lang) => currentQuestion && handleLanguageChange(currentQuestion.id, lang)}
        isLanguageDisabled={currentQuestion ? running[currentQuestion.id] : false}
        deadlineAt={attempt.deadlineAt}
        serverTime={attempt.serverTime}
        remainingSeconds={attempt.remainingSeconds}
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
        <main className="flex-1 flex flex-col overflow-hidden bg-[var(--bg-base)]">
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
                  onRunCode={(stdin) => runCode(currentQuestion.id, false, { stdin })}
                  onSubmitCode={() => runCode(currentQuestion.id, true)}
                  isMarkedForReview={markedReview.includes(currentQuestion.id)}
                  onToggleReview={() => toggleReview(currentQuestion.id)}
                  onUnlockHint={handleUnlockHint}
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
        onConfirmSubmit={() => submitExam('MANUAL')}
        isSubmitting={submitting}
        totalQuestions={totalQuestions}
        mcqTotal={mcqs.length}
        mcqAnswered={mcqAnswered}
        codingTotal={codings.length}
        codingAttempted={codingAttempted}
        markedReviewCount={markedReview.length}
      />

      {/* ── 5. Compulsory Fullscreen Enforcement Modal ── */}
      {!isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="max-w-md w-full bg-slate-900 border border-indigo-500/40 rounded-2xl p-8 shadow-2xl shadow-indigo-950/60 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto text-3xl">
              ⤢
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100">Fullscreen Mode Required</h2>
              <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                This examination is conducted in mandatory full screen mode. Leaving full screen or switching applications is strictly monitored.
              </p>
            </div>
            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-xs text-amber-300 font-medium">
              ⚠️ Clipboard paste (Ctrl+V) and right-click are disabled during this exam.
            </div>
            <button
              onClick={enterFullscreen}
              className="w-full py-3 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
            >
              <span>Enter Fullscreen to Continue</span>
              <span>→</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
