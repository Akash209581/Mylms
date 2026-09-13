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
}: CodingWorkspaceProps) {
  const [activeLeftTab, setActiveLeftTab] = useState<'problem' | 'constraints'>('problem')
  const [consoleHeight, setConsoleHeight] = useState(260)
  const [leftWidth, setLeftWidth] = useState(480)
  const [isFullscreen, setIsFullscreen] = useState(false)
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
          {question.constraints && (
            <div className="space-y-2 pt-4 border-t border-[var(--border)]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Constraints
              </h3>
              <div className="p-3 bg-[var(--bg-raised)] rounded-xl border border-[var(--border)] text-xs font-mono text-[var(--text-secondary)] whitespace-pre-wrap">
                {question.constraints}
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
    </div>
  )
}
