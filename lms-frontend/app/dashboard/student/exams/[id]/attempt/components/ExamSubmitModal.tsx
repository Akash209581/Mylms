'use client'

interface ExamSubmitModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirmSubmit: () => void
  isSubmitting: boolean
  totalQuestions: number
  mcqTotal: number
  mcqAnswered: number
  codingTotal: number
  codingAttempted: number
  markedReviewCount: number
}

export default function ExamSubmitModal({
  isOpen,
  onClose,
  onConfirmSubmit,
  isSubmitting,
  totalQuestions,
  mcqTotal,
  mcqAnswered,
  codingTotal,
  codingAttempted,
  markedReviewCount,
}: ExamSubmitModalProps) {
  if (!isOpen) return null

  const totalAnswered = mcqAnswered + codingAttempted
  const unansweredCount = totalQuestions - totalAnswered

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 text-slate-100 select-none">
        {/* Modal Icon & Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-2xl flex items-center justify-center mx-auto mb-3">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-slate-50">Submit Final Exam?</h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            This action cannot be undone. Once submitted, your scores and code will be submitted for final grading.
          </p>
        </div>

        {/* Audit / Summary Breakdown */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2.5 text-xs font-mono">
          {mcqTotal > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">MCQs Answered:</span>
              <span className="text-slate-100 font-bold">
                {mcqAnswered} / {mcqTotal}
              </span>
            </div>
          )}

          {codingTotal > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Coding Attempted:</span>
              <span className="text-slate-100 font-bold">
                {codingAttempted} / {codingTotal}
              </span>
            </div>
          )}

          {markedReviewCount > 0 && (
            <div className="flex items-center justify-between text-amber-300">
              <span>Marked for Review:</span>
              <span className="font-bold">{markedReviewCount}</span>
            </div>
          )}

          {unansweredCount > 0 && (
            <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-rose-400">
              <span className="font-sans font-medium">Unanswered Questions:</span>
              <span className="font-bold">{unansweredCount}</span>
            </div>
          )}
        </div>

        {unansweredCount > 0 && (
          <p className="text-[11px] text-amber-400/90 text-center">
            Notice: You still have {unansweredCount} unanswered question{unansweredCount > 1 ? 's' : ''}.
          </p>
        )}

        {/* Modal Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-200 font-semibold text-xs transition-all border border-slate-700 disabled:opacity-50"
          >
            Continue Exam
          </button>

          <button
            type="button"
            onClick={onConfirmSubmit}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs transition-all shadow-md shadow-rose-950/50 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin text-sm">⚙</span>
                <span>Submitting...</span>
              </>
            ) : (
              <span>✓ Confirm & Submit</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
