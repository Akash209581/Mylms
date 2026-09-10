'use client'

import ExamTimer from './ExamTimer'

interface ExamHeaderProps {
  examTitle: string
  currentIndex: number
  totalQuestions: number
  currentSection: string
  currentType: string
  // Coding language selector in header
  isCoding: boolean
  language?: string
  allowedLanguages?: string[]
  onLanguageChange?: (lang: string) => void
  isLanguageDisabled?: boolean
  // Timer props
  deadlineAt: string
  serverTime: string
  onExpire: () => void
  // Tab monitoring
  tabWarnings: number
  // Navigation & Actions
  onToggleNavigator: () => void
  isNavigatorOpen: boolean
  answeredCount: number
  onSubmitExamClick: () => void
}

const LANGUAGE_LABELS: Record<string, string> = {
  python: 'Python 3',
  javascript: 'JavaScript (Node 20)',
  c: 'C (GCC 13)',
  cpp: 'C++ (G++ 13)',
  java: 'Java (Temurin 17)',
}

export default function ExamHeader({
  examTitle,
  currentIndex,
  totalQuestions,
  currentSection,
  currentType,
  isCoding,
  language = 'python',
  allowedLanguages = ['python', 'javascript', 'c', 'cpp', 'java'],
  onLanguageChange,
  isLanguageDisabled = false,
  deadlineAt,
  serverTime,
  onExpire,
  tabWarnings,
  onToggleNavigator,
  isNavigatorOpen,
  answeredCount,
  onSubmitExamClick,
}: ExamHeaderProps) {
  return (
    <header className="h-14 bg-slate-900/95 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between gap-3 shrink-0 z-30 select-none backdrop-blur-md">
      {/* ── Left: Exam / Problem Identity ── */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleNavigator}
          className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all flex items-center gap-1.5 shrink-0 ${
            isNavigatorOpen
              ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300'
              : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:text-white hover:border-slate-600'
          }`}
          title="Toggle Questions Panel"
        >
          <span className="text-sm">☰</span>
          <span className="hidden sm:inline">Questions</span>
          <span className="bg-slate-700/80 text-slate-200 text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold">
            {answeredCount}/{totalQuestions}
          </span>
        </button>

        <div className="h-4 w-px bg-slate-800 hidden sm:block shrink-0" />

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-bold text-slate-100 truncate max-w-[200px] sm:max-w-xs md:max-w-md" title={examTitle}>
              {examTitle}
            </h1>
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${
                currentSection === 'A'
                  ? 'bg-blue-500/15 border-blue-500/30 text-blue-300'
                  : 'bg-purple-500/15 border-purple-500/30 text-purple-300'
              }`}
            >
              Sec {currentSection} {isCoding ? '· Code' : '· MCQ'}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            {isCoding ? 'Problem' : 'Question'} <span className="text-slate-200 font-semibold">{currentIndex + 1}</span> of {totalQuestions}
          </p>
        </div>
      </div>

      {/* ── Center: Language Selector (When in Coding Mode) ── */}
      {isCoding && onLanguageChange && (
        <div className="hidden md:flex items-center gap-2 bg-slate-950/60 border border-slate-800 px-3 py-1 rounded-lg">
          <span className="text-xs text-slate-400 font-medium">Language:</span>
          <select
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
            disabled={isLanguageDisabled}
            className="bg-transparent text-xs font-semibold text-indigo-300 hover:text-indigo-200 focus:outline-none cursor-pointer disabled:opacity-50"
          >
            {allowedLanguages.map((l) => (
              <option key={l} value={l} className="bg-slate-900 text-slate-200">
                {LANGUAGE_LABELS[l] || l}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ── Right: Timer & Submit Actions ── */}
      <div className="flex items-center gap-2.5 shrink-0">
        {tabWarnings > 0 && (
          <div
            className={`hidden sm:flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border ${
              tabWarnings >= 3
                ? 'text-rose-300 bg-rose-500/15 border-rose-500/30'
                : 'text-amber-300 bg-amber-500/15 border-amber-500/30'
            }`}
            title={tabWarnings >= 3
              ? 'Third tab switch — exam is being submitted'
              : `You switched tabs ${tabWarnings} time${tabWarnings === 1 ? '' : 's'}. Auto-submit at 3.`}
          >
            <span>⚠️</span>
            <span>Tab switch: {tabWarnings}/3</span>
          </div>
        )}

        <ExamTimer deadlineAt={deadlineAt} serverTime={serverTime} onExpire={onExpire} />

        <button
          onClick={onSubmitExamClick}
          className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs md:text-sm font-bold tracking-wide transition-all shadow-sm shadow-rose-950/40 flex items-center gap-1.5"
        >
          <span>Submit Exam</span>
        </button>
      </div>
    </header>
  )
}
