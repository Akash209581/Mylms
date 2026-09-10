'use client'

import { useEffect } from 'react'

interface Question {
  id: number
  type: string
  section: string
  marks: number
  negativeMarks: number
  questionText?: string
  options?: string[]
}

interface McqWorkspaceProps {
  question: Question
  questionIndex: number
  totalQuestions: number
  selectedOption: string | null
  onSelectOption: (option: string | null) => void
  isMarkedForReview: boolean
  onToggleReview: () => void
}

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function McqWorkspace({
  question,
  questionIndex,
  totalQuestions,
  selectedOption,
  onSelectOption,
  isMarkedForReview,
  onToggleReview,
}: McqWorkspaceProps) {
  // Keyboard shortcut listener (1-4 or A-D)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is in an input or textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return

      const key = e.key.toUpperCase()
      const indexByKey = ['1', '2', '3', '4'].indexOf(key)
      if (indexByKey !== -1 && question.options && question.options[indexByKey]) {
        onSelectOption(OPTION_KEYS[indexByKey])
      } else if (OPTION_KEYS.includes(key)) {
        const optIndex = OPTION_KEYS.indexOf(key)
        if (question.options && question.options[optIndex]) {
          onSelectOption(key)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [question, onSelectOption])

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6">
      {/* ── Question Header & Metadata ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-bold text-slate-100">
            Question {questionIndex + 1}
          </span>
          <span className="text-slate-500 text-xs">/ {totalQuestions}</span>
          <span className="h-3 w-px bg-slate-800" />
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300">
            Section {question.section} — Multiple Choice
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
              +{question.marks} Mark{question.marks > 1 ? 's' : ''}
            </span>
            {question.negativeMarks > 0 && (
              <span className="font-semibold text-rose-400 bg-rose-950/40 border border-rose-500/30 px-2 py-0.5 rounded">
                -{question.negativeMarks} Neg
              </span>
            )}
          </div>

          <button
            onClick={onToggleReview}
            className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all flex items-center gap-1.5 ${
              isMarkedForReview
                ? 'bg-amber-400/15 border-amber-400 text-amber-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-amber-300 hover:border-amber-400/50'
            }`}
          >
            <span>{isMarkedForReview ? '🔖' : '⚐'}</span>
            <span>{isMarkedForReview ? 'Marked' : 'Review Later'}</span>
          </button>
        </div>
      </div>

      {/* ── Question Statement ── */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm mb-6">
        <p className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed whitespace-pre-line">
          {question.questionText}
        </p>
      </div>

      {/* ── Options List ── */}
      <div className="space-y-3">
        {question.options?.map((optionText, idx) => {
          const letter = OPTION_KEYS[idx]
          const isSelected = selectedOption === letter

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectOption(letter)}
              className={`w-full text-left p-4 sm:p-4.5 rounded-xl border transition-all flex items-start gap-4 group select-none ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-950/30 ring-2 ring-indigo-500/40 shadow-sm shadow-indigo-950/50'
                  : 'border-slate-800 bg-slate-900/60 hover:bg-slate-850 hover:border-slate-700'
              }`}
            >
              {/* Radio Circle & Key Badge */}
              <div className="pt-0.5 shrink-0 flex items-center gap-2">
                <span
                  className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-indigo-400 bg-indigo-500 text-white'
                      : 'border-slate-600 bg-slate-800 group-hover:border-slate-400'
                  }`}
                >
                  {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                </span>
                <span
                  className={`w-6 h-6 rounded-md text-xs font-bold font-mono flex items-center justify-center ${
                    isSelected
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {letter}
                </span>
              </div>

              {/* Option Text */}
              <span
                className={`text-sm sm:text-base leading-relaxed flex-1 ${
                  isSelected
                    ? 'text-slate-50 font-semibold'
                    : 'text-slate-200 group-hover:text-white'
                }`}
              >
                {optionText}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Clear Selection Option ── */}
      {selectedOption && (
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => onSelectOption(null)}
            className="text-xs font-medium text-slate-400 hover:text-rose-400 transition-colors py-1 px-2.5 rounded hover:bg-rose-950/20"
          >
            ✕ Clear Selection
          </button>
        </div>
      )}
    </div>
  )
}
