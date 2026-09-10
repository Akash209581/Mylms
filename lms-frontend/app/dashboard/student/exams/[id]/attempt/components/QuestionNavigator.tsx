'use client'

interface Question {
  id: number
  type: string
  section: string
  marks: number
  sortOrder: number
}

interface QuestionNavigatorProps {
  questions: Question[]
  answers: Record<string, string | null>
  markedReview: number[]
  latestCoding: Record<number, any>
  currentCode: Record<number, string>
  currentId: number
  onJump: (id: number) => void
  isOpen: boolean
  onClose: () => void
}

export default function QuestionNavigator({
  questions,
  answers,
  markedReview,
  latestCoding,
  currentCode,
  currentId,
  onJump,
  isOpen,
  onClose,
}: QuestionNavigatorProps) {
  const mcqs = questions.filter((q) => q.section === 'A')
  const codings = questions.filter((q) => q.section === 'B')

  const isQuestionAnswered = (q: Question) => {
    if (q.section === 'A') {
      const a = answers[String(q.id)]
      return a !== undefined && a !== null && a !== ''
    }
    // Coding is answered if code exists in current state or latestCoding
    const c = currentCode[q.id]
    if (c && c.trim().length > 0) return true
    const saved = latestCoding[q.id]?.code
    return Boolean(saved && saved.trim().length > 0)
  }

  const getStatus = (q: Question) => {
    if (q.id === currentId) return 'current'
    if (markedReview.includes(q.id)) return 'review'
    if (isQuestionAnswered(q)) return 'answered'
    return 'unanswered'
  }

  const statusStyles: Record<string, string> = {
    current:
      'bg-indigo-600 text-white font-bold ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 shadow-md shadow-indigo-900/50 scale-105',
    answered:
      'bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-sm shadow-emerald-950/40',
    review:
      'bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold shadow-sm shadow-amber-950/40',
    unanswered:
      'bg-slate-800/80 hover:bg-slate-750 text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white',
  }

  const mcqAnsweredCount = mcqs.filter(isQuestionAnswered).length
  const codingAttemptedCount = codings.filter(isQuestionAnswered).length
  const totalAnswered = mcqAnsweredCount + codingAttemptedCount

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
        />
      )}

      <aside
        className={`fixed md:static top-14 bottom-0 left-0 w-72 bg-slate-900 border-r border-slate-800 z-40 flex flex-col transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-64'
        }`}
      >
        {/* Header */}
        <div className="p-3.5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">Question Palette</h2>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              <span className="text-emerald-400 font-bold">{totalAnswered}</span> of {questions.length} answered
            </p>
          </div>
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Questions Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Section A: MCQ */}
          {mcqs.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  Section A — MCQ
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-medium">
                  {mcqAnsweredCount}/{mcqs.length}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {mcqs.map((q, idx) => {
                  const status = getStatus(q)
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        onJump(q.id)
                        if (window.innerWidth < 768) onClose()
                      }}
                      className={`h-9 rounded-lg text-xs transition-all flex items-center justify-center ${statusStyles[status]}`}
                      title={`Question ${idx + 1} (${q.marks} Marks) — ${status}`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Section B: Coding */}
          {codings.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-400" />
                  Section B — Coding
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-medium">
                  {codingAttemptedCount}/{codings.length}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {codings.map((q, idx) => {
                  const status = getStatus(q)
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        onJump(q.id)
                        if (window.innerWidth < 768) onClose()
                      }}
                      className={`h-9 rounded-lg text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 ${statusStyles[status]}`}
                      title={`Coding Problem ${idx + 1} (${q.marks} Marks) — ${status}`}
                    >
                      <span>C{idx + 1}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Status Legend</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-3 h-3 rounded bg-indigo-600 ring-1 ring-indigo-400 shrink-0" />
              <span className="text-[11px]">Current</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-3 h-3 rounded bg-emerald-600 shrink-0" />
              <span className="text-[11px]">Answered</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-3 h-3 rounded bg-amber-400 shrink-0" />
              <span className="text-[11px]">Review</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700 shrink-0" />
              <span className="text-[11px]">Not Visited</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  )
}
