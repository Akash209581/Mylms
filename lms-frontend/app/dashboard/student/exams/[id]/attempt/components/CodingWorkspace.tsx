'use client'

import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import TestCasesPanel from './TestCasesPanel'
import MarkdownRenderer from '@/components/editor/MarkdownRenderer'
import { starterForLanguage, toRuntimeLang } from '@/lib/starter-code'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-[#1e1e1e] text-slate-400 text-xs font-mono">
      Initializing Monaco Editor...
    </div>
  ),
})

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
  questionText?: string
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

interface CodingWorkspaceProps {
  question: Question
  questionIndex: number
  totalQuestions: number
  code: string
  onCodeChange: (val: string) => void
  language: string
  onLanguageChange: (lang: string) => void
  codeResult?: any
  jobState?: any
  isRunning: boolean
  onRunCode: (stdin?: string) => void
  onSubmitCode: () => void
  isMarkedForReview: boolean
  onToggleReview: () => void
  onUnlockHint?: (questionId: number, hintIndex: number) => Promise<any>
}

const LANGUAGE_LABELS: Record<string, string> = {
  python: 'Python 3',
  javascript: 'JavaScript (Node 20)',
  c: 'C (GCC 13)',
  cpp: 'C++ (G++ 13)',
  java: 'Java (Temurin 17)',
}

const MONACO_LANG_MAP: Record<string, string> = {
  python: 'python',
  javascript: 'javascript',
  c: 'c',
  cpp: 'cpp',
  java: 'java',
}

export default function CodingWorkspace({
  question,
  questionIndex,
  totalQuestions,
  code,
  onCodeChange,
  language,
  onLanguageChange,
  codeResult,
  jobState,
  isRunning,
  onRunCode,
  onSubmitCode,
  isMarkedForReview,
  onToggleReview,
  onUnlockHint,
}: CodingWorkspaceProps) {
  const [activeLeftTab, setActiveLeftTab] = useState<'problem' | 'constraints' | 'hints'>('problem')
  const [consoleHeight, setConsoleHeight] = useState(260)
  const [leftWidth, setLeftWidth] = useState(480)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [confirmUnlockHintIndex, setConfirmUnlockHintIndex] = useState<number | null>(null)
  const [unlockingHint, setUnlockingHint] = useState(false)
  const dragH = useRef(false)
  const dragV = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      if (dragH.current) {
        const w = e.clientX - rect.left
        setLeftWidth(Math.min(Math.max(280, w), Math.max(320, rect.width - 360)))
      }
      if (dragV.current) {
        const h = rect.bottom - e.clientY
        setConsoleHeight(Math.min(Math.max(120, h), Math.max(180, rect.height - 160)))
      }
    }
    const onUp = () => {
      dragH.current = false
      dragV.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to Run Code
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        if (!isRunning) onRunCode()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isRunning, onRunCode])

  const allowedLangs = (question.allowedLanguages?.length
    ? question.allowedLanguages
    : ['python', 'javascript', 'c', 'cpp', 'java']
  ).map((lang) => toRuntimeLang(lang))

  const handleResetCode = () => {
    if (confirm('Reset your code to the original starter template? Current edits will be replaced.')) {
      onCodeChange(starterForLanguage(question.codeSnippet, language))
    }
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  return (
    <div
      ref={containerRef}
      className={`flex-1 flex flex-col md:flex-row overflow-hidden bg-[var(--bg-base)] ${
        isFullscreen ? 'fixed inset-0 top-14 z-40' : ''
      }`}
    >
      {/* ── LEFT PANEL: Problem Statement & Details ── */}
      <div
        className="w-full md:w-[var(--lw)] flex flex-col border-r border-[var(--border)] bg-[var(--bg-surface)] overflow-hidden shrink-0 md:h-full"
        style={{ ['--lw' as string]: `${leftWidth}px` } as React.CSSProperties}
      >
        {/* Panel Header / Tabs */}
        <div className="h-10 px-4 bg-[var(--bg-raised)] border-b border-[var(--border)] flex items-center justify-between gap-2 shrink-0 select-none">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveLeftTab('problem')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                activeLeftTab === 'problem'
                  ? 'bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)]'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Problem Statement
            </button>
            {question.constraints && (
              <button
                onClick={() => setActiveLeftTab('constraints')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeLeftTab === 'constraints'
                    ? 'bg-slate-800 text-slate-100 border border-slate-700'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Constraints
              </button>
            )}
            {question.hints && question.hints.hintsEnabled && question.hints.totalHints > 0 && (
              <button
                onClick={() => setActiveLeftTab('hints')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  activeLeftTab === 'hints'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-[var(--text-muted)] hover:text-amber-300'
                }`}
              >
                <span>💡 Hints</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/25 font-mono font-bold text-amber-300">
                  {question.hints.unlockedCount}/{question.hints.totalHints}
                </span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onToggleReview}
              className={`text-xs px-2.5 py-1 rounded-md border font-semibold transition-all flex items-center gap-1 ${
                isMarkedForReview
                  ? 'bg-amber-400/15 border-amber-400 text-amber-300'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-amber-300'
              }`}
            >
              <span>{isMarkedForReview ? '🔖' : '⚐'}</span>
              <span className="hidden sm:inline">{isMarkedForReview ? 'Marked' : 'Review'}</span>
            </button>
          </div>
        </div>

        {/* Panel Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Title & Metadata */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-600 dark:text-purple-300">
                Problem {questionIndex + 1}
              </span>
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300">
                {question.marks} Marks
              </span>
            </div>
            <h2 className="text-lg font-bold text-[var(--text-primary)] leading-snug">
              {question.questionText?.trim() || question.problemStatement?.split('\n')[0] || `Coding Problem ${questionIndex + 1}`}
            </h2>
          </div>

          {/* Question & Problem Statement Text */}
          <div className="space-y-4">
            {(() => {
              const qText = question.questionText?.trim() || ''
              const pStmt = question.problemStatement?.trim() || ''
              const isQTextShortTitle = qText.length < 80 && !qText.includes('\n') && Boolean(pStmt)
              const showQTextSnippet = qText && pStmt && qText !== pStmt && !isQTextShortTitle

              return (
                <>
                  {showQTextSnippet && (
                    <div className="text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-raised)] border border-[var(--border)] p-3.5 rounded-xl">
                      <MarkdownRenderer content={qText} />
                    </div>
                  )}
                  <div className="text-sm text-[var(--text-primary)] leading-relaxed font-sans">
                    <MarkdownRenderer content={pStmt || qText || 'Problem statement unavailable.'} />
                  </div>
                </>
              )
            })()}
          </div>

          {/* Input & Output Format */}
          {(question.inputFormat || question.outputFormat) && (
            <div className="space-y-4 pt-4 border-t border-[var(--border)]">
              {question.inputFormat && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Input Format
                  </h3>
                  <div className="p-3 bg-[var(--bg-raised)] rounded-xl border border-[var(--border)] text-xs font-mono text-[var(--text-primary)]">
                    {question.inputFormat}
                  </div>
                </div>
              )}

              {question.outputFormat && (
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
                    Output Format
                  </h3>
                  <div className="p-3 bg-[var(--bg-raised)] rounded-xl border border-[var(--border)] text-xs font-mono text-[var(--accent-text)]">
                    {question.outputFormat}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Examples */}
          {question.sampleTestCases && question.sampleTestCases.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-[var(--border)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Examples
              </h3>
              {question.sampleTestCases.map((tc, idx) => (
                <div key={idx} className="p-3.5 bg-[var(--bg-raised)] rounded-xl border border-[var(--border)] space-y-2 text-xs font-mono">
                  <p className="font-bold text-[var(--text-secondary)] font-sans text-xs">Example {idx + 1}:</p>
                  <div>
                    <span className="text-[var(--text-muted)] block mb-0.5">Input:</span>
                    <pre className="p-2 bg-[var(--bg-surface)] rounded text-[var(--text-primary)] whitespace-pre-wrap border border-[var(--border)]">
                      {tc.input}
                    </pre>
                  </div>
                  <div>
                    <span className="text-[var(--text-muted)] block mb-0.5">Output:</span>
                    <pre className="p-2 bg-[var(--bg-surface)] rounded text-[var(--accent-text)] whitespace-pre-wrap border border-[var(--border)]">
                      {tc.output}
                    </pre>
                  </div>
                  {tc.explanation && (
                    <div>
                      <span className="text-slate-500 block mb-0.5 font-sans">Explanation:</span>
                      <p className="text-slate-300 font-sans text-xs">{tc.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Constraints */}
          {question.constraints && activeLeftTab !== 'hints' && (
            <div className="space-y-2 pt-4 border-t border-[var(--border)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Constraints
              </h3>
              <div className="p-3 bg-[var(--bg-raised)] rounded-xl border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)] whitespace-pre-wrap">
                {question.constraints}
              </div>
            </div>
          )}

          {/* Sequential Hints Panel */}
          {activeLeftTab === 'hints' && question.hints && (
            <div className="space-y-4 pt-4 border-t border-[var(--border)] animate-in fade-in duration-200">
              {/* Header explanation banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/25">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-base">💡</span>
                  <h3 className="text-sm font-bold text-amber-400">Sequential Problem Hints</h3>
                </div>
                <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-1">
                  <p>Hints must be unlocked sequentially (Hint 1 → Hint 2 → ...).</p>
                  {question.hints.hintPenaltyType === 'MARKS' && (
                    <p className="font-semibold text-rose-400">
                      ⚠️ Note: Unlocking hints will deduct marks from your final score for this problem.
                    </p>
                  )}
                  {question.hints.hintPenaltyType === 'TIME' && (
                    <p className="font-semibold text-indigo-300">
                      ⏳ Note: Unlocking hints will deduct minutes immediately from your total exam timer.
                    </p>
                  )}
                  {question.hints.hintPenaltyType === 'NONE' && (
                    <p className="font-semibold text-emerald-400">
                      ✨ Unlocking hints is free for this problem.
                    </p>
                  )}
                </div>
              </div>

              {/* Hints List */}
              <div className="space-y-3">
                {Array.from({ length: question.hints.totalHints }).map((_, idx) => {
                  const unlockedObj = question.hints?.unlockedHints?.find(h => h.index === idx)
                  const isUnlocked = Boolean(unlockedObj)
                  const isNext = idx === (question.hints?.unlockedCount || 0)
                  const penalty = question.hints?.hintPenalties?.[idx] !== undefined
                    ? question.hints.hintPenalties[idx]
                    : (question.hints?.hintPenaltyType === 'TIME' ? 2 : 1)

                  if (isUnlocked) {
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-[var(--bg-raised)] border border-amber-500/30 space-y-2 shadow-sm animate-in fade-in"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-xs font-bold uppercase">
                              Hint {idx + 1}
                            </span>
                            <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                              ✓ Unlocked
                            </span>
                          </div>
                          {question.hints?.hintPenaltyType === 'MARKS' && penalty > 0 && (
                            <span className="text-[11px] font-mono text-rose-400 font-bold">
                              -{penalty} Marks
                            </span>
                          )}
                          {question.hints?.hintPenaltyType === 'TIME' && penalty > 0 && (
                            <span className="text-[11px] font-mono text-indigo-300 font-bold">
                              -{penalty} Mins
                            </span>
                          )}
                        </div>
                        <div className="pt-1 text-sm text-[var(--text-primary)] leading-relaxed">
                          <MarkdownRenderer content={unlockedObj?.text || ''} />
                        </div>
                      </div>
                    )
                  }

                  if (isNext) {
                    return (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-amber-500/5 border-2 border-dashed border-amber-500/40 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-xs font-bold uppercase">
                            Hint {idx + 1} (Available to Unlock)
                          </span>
                          {question.hints?.hintPenaltyType === 'MARKS' && (
                            <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                              -{penalty} Marks Penalty
                            </span>
                          )}
                          {question.hints?.hintPenaltyType === 'TIME' && (
                            <span className="text-xs font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                              -{penalty} Mins Exam Timer Penalty
                            </span>
                          )}
                          {question.hints?.hintPenaltyType === 'NONE' && (
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              Free Hint
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                          Click below to reveal this hint. {question.hints?.hintPenaltyType === 'MARKS' ? `This will deduct ${penalty} mark(s) from this question's score.` : question.hints?.hintPenaltyType === 'TIME' ? `This will deduct ${penalty} minute(s) from your exam timer immediately.` : 'No penalties will be applied.'}
                        </p>

                        <button
                          type="button"
                          onClick={() => setConfirmUnlockHintIndex(idx)}
                          className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 active:scale-[0.99] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                        >
                          <span>🔓</span> Reveal Hint {idx + 1}
                        </button>
                      </div>
                    )
                  }

                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-[var(--bg-raised)]/40 border border-[var(--border)] opacity-60 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400 text-sm">🔒</span>
                        <span className="text-xs font-bold text-gray-400">Hint {idx + 1}</span>
                      </div>
                      <span className="text-[11px] text-gray-500 font-medium">
                        Unlock Hint {idx} first
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        className="hidden md:block w-1.5 cursor-col-resize bg-[var(--border)] hover:bg-[var(--accent)] shrink-0 z-10"
        onMouseDown={() => {
          dragH.current = true
          document.body.style.cursor = 'col-resize'
          document.body.style.userSelect = 'none'
        }}
        title="Drag to resize"
      />

      {/* ── RIGHT PANEL: Monaco Editor + Console ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[var(--bg-base)]">
        {/* Editor Toolbar */}
        <div className="h-10 px-4 bg-[var(--bg-surface)] border-b border-[var(--border)] flex items-center justify-between gap-3 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--text-muted)] font-medium hidden sm:inline">Language:</span>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              disabled={isRunning}
              className="bg-[var(--bg-raised)] border border-[var(--border)] text-xs font-semibold text-[var(--accent-text)] px-2.5 py-1 rounded-md cursor-pointer disabled:opacity-50"
            >
              {allowedLangs.map((l) => (
                <option key={l} value={l} className="bg-slate-900 text-slate-100">
                  {LANGUAGE_LABELS[l] || l}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetCode}
              disabled={isRunning}
              className="px-2.5 py-1 rounded text-xs font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-raised)] transition-colors"
              title="Reset code to starter template"
            >
              Reset
            </button>
            <button
              onClick={toggleFullscreen}
              className="px-2.5 py-1 rounded text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors flex items-center gap-1"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Coding'}
            >
              <span>{isFullscreen ? '⤦' : '⤢'}</span>
              <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
            </button>
          </div>
        </div>

        {/* Monaco Editor Canvas */}
        <div className="flex-1 min-h-[220px] relative overflow-hidden bg-[#1e1e1e]">
          <MonacoEditor
            height="100%"
            language={MONACO_LANG_MAP[language] || 'python'}
            theme="vs-dark"
            value={code}
            onChange={(val) => onCodeChange(val || '')}
            onMount={(editor, monaco) => {
              // Block paste command in Monaco (Ctrl+V / Cmd+V)
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
                // Paste disabled in exam mode
              })
              editor.onKeyDown((e) => {
                if ((e.ctrlKey || e.metaKey) && (e.code === 'KeyV' || e.keyCode === monaco.KeyCode.KeyV)) {
                  e.preventDefault()
                  e.stopPropagation()
                }
              })
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "Consolas, 'Courier New', monospace",
              fontLigatures: false,
              formatOnType: false,
              formatOnPaste: false,
              cursorBlinking: 'solid',
              cursorSmoothCaretAnimation: 'off',
              smoothScrolling: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              insertSpaces: true,
              padding: { top: 12, bottom: 12 },
              lineNumbers: 'on',
              glyphMargin: false,
              folding: true,
              lineDecorationsWidth: 6,
              lineNumbersMinChars: 3,
              contextmenu: false,
            }}
          />
        </div>

        <div
          className="h-1.5 cursor-row-resize bg-[var(--border)] hover:bg-[var(--accent)] shrink-0"
          onMouseDown={() => {
            dragV.current = true
            document.body.style.cursor = 'row-resize'
            document.body.style.userSelect = 'none'
          }}
          title="Drag to resize console"
        />

        {/* Test Cases / Results Console Panel */}
        <div style={{ height: `${consoleHeight}px` }} className="shrink-0 flex flex-col overflow-hidden">
          <TestCasesPanel
            sampleTestCases={question.sampleTestCases}
            codeResult={codeResult}
            jobState={jobState}
            isRunning={isRunning}
            onRunCode={onRunCode}
            onSubmitCode={onSubmitCode}
          />
        </div>
      </div>

      {/* Confirmation Modal to Reveal Hint */}
      {confirmUnlockHintIndex !== null && question.hints && (() => {
        const hintIdx = confirmUnlockHintIndex
        const penalty = question.hints.hintPenalties?.[hintIdx] !== undefined
          ? question.hints.hintPenalties[hintIdx]
          : (question.hints.hintPenaltyType === 'TIME' ? 2 : 1)

        const handleConfirm = async () => {
          if (!onUnlockHint) return
          setUnlockingHint(true)
          try {
            await onUnlockHint(question.id, hintIdx)
            setConfirmUnlockHintIndex(null)
          } catch {
            // error handled in parent
          } finally {
            setUnlockingHint(false)
          }
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[var(--bg-surface)] border border-[var(--border)] max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3 pb-2 border-b border-[var(--border)]">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl font-bold">
                  💡
                </div>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Reveal Hint {hintIdx + 1}?
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    Sequential hint for {question.questionText?.trim() || `Problem ${questionIndex + 1}`}
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2 text-xs">
                {question.hints.hintPenaltyType === 'MARKS' && (
                  <p className="text-rose-400 font-semibold leading-relaxed">
                    ⚠️ Revealing this hint will permanently deduct <strong className="underline font-bold text-rose-300">{penalty} Mark(s)</strong> from your score on this question.
                  </p>
                )}
                {question.hints.hintPenaltyType === 'TIME' && (
                  <p className="text-indigo-300 font-semibold leading-relaxed">
                    ⏳ Revealing this hint will immediately deduct <strong className="underline font-bold text-white">{penalty} Minute(s)</strong> from your total exam timer.
                  </p>
                )}
                {question.hints.hintPenaltyType === 'NONE' && (
                  <p className="text-emerald-400 font-semibold leading-relaxed">
                    ✨ This hint is free. No marks or time will be deducted.
                  </p>
                )}
                <p className="text-[var(--text-muted)] text-[11px]">
                  This action cannot be undone once confirmed.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={unlockingHint}
                  onClick={() => setConfirmUnlockHintIndex(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-[var(--bg-raised)] hover:bg-[var(--bg-surface)] border border-[var(--border)] text-[var(--text-secondary)] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={unlockingHint}
                  onClick={handleConfirm}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-all flex items-center gap-1.5"
                >
                  {unlockingHint ? 'Unlocking...' : `Confirm & Reveal Hint`}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
