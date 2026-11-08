'use client'

import { useEffect, useState } from 'react'
import MarkdownRenderer from '@/components/editor/MarkdownRenderer'

interface Question {
  id: number
  type: string
  section: string
  marks: number
  negativeMarks: number
  questionText?: string
  problemStatement?: string
  options?: string[]
  codeSnippet?: string
  programmingLanguage?: string
  jumbledStatements?: string[]
  likesCount?: number
  matchingPairs?: Array<{ left?: string; right?: string }>
  leftItems?: string[]
  rightItems?: string[]
  extraRightMatches?: string[]
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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

function renderOptionContent(opt: string, isSelected?: boolean) {
  if (!opt) return null
  const trimmed = opt.trim()
  const isDirectImg =
    /^(https?:\/\/|data:image\/|\/uploads\/).+(\.(png|jpg|jpeg|gif|webp|svg)|;base64)/i.test(trimmed) ||
    /^\/uploads\/questions\/.+/i.test(trimmed) ||
    /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(trimmed)
  const isMarkdownImg = /^!\[.*?\]\(.*?\)$/.test(trimmed)

  if (isDirectImg) {
    const fullSrc = trimmed.startsWith('/uploads/') ? `${API_URL}${trimmed}` : trimmed
    return (
      <div className="space-y-1.5 py-1">
        <img
          src={fullSrc}
          alt="Option illustration"
          className="max-h-48 max-w-full rounded-xl object-contain border border-slate-700 bg-slate-950/80 p-2 shadow-inner"
          onError={(e: any) => {
            e.target.style.display = 'none'
            e.target.parentElement.innerHTML = `<span class="text-xs text-rose-400 font-mono break-all">[Image load error: ${trimmed}]</span>`
          }}
        />
      </div>
    )
  }

  if (isMarkdownImg || trimmed.includes('\n') || trimmed.includes('`') || trimmed.includes('**')) {
    return <MarkdownRenderer content={trimmed} className="text-sm font-medium" />
  }

  return (
    <span className={`text-sm sm:text-base leading-relaxed break-words ${isSelected ? 'text-slate-50 font-semibold' : 'text-slate-200 group-hover:text-white'}`}>
      {trimmed}
    </span>
  )
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
  const [isLiked, setIsLiked] = useState<boolean>(false)
  const [likeCount, setLikeCount] = useState<number>(question.likesCount || 0)
  const [jcOrder, setJcOrder] = useState<string[]>(question.jumbledStatements || [])
  const [matchingMap, setMatchingMap] = useState<Record<string, string>>({})
  const [activeLeft, setActiveLeft] = useState<string | null>(null)

  const isJC = question.type === 'JC' || (Array.isArray(question.jumbledStatements) && question.jumbledStatements.length > 0)
  const isMQ = question.type === 'MQ' || (Array.isArray(question.matchingPairs) && question.matchingPairs.length > 0) || (Array.isArray(question.leftItems) && question.leftItems.length > 0)

  useEffect(() => {
    try {
      const likedList = JSON.parse(localStorage.getItem('liked_questions') || '[]')
      setIsLiked(likedList.includes(question.id))
    } catch {}
    setLikeCount(question.likesCount || 0)

    // Jumbled Code restoration
    if (isJC) {
      if (selectedOption) {
        try {
          const parsed = JSON.parse(selectedOption)
          if (Array.isArray(parsed) && parsed.length > 0) {
            setJcOrder(parsed)
          } else {
            setJcOrder(question.jumbledStatements || [])
          }
        } catch {
          setJcOrder(question.jumbledStatements || [])
        }
      } else {
        setJcOrder(question.jumbledStatements || [])
      }
    }

    // Matching Question restoration
    if (isMQ) {
      if (selectedOption) {
        try {
          const parsed = JSON.parse(selectedOption)
          if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
            setMatchingMap(parsed)
          } else {
            setMatchingMap({})
          }
        } catch {
          setMatchingMap({})
        }
      } else {
        setMatchingMap({})
      }
    }
  }, [question.id, question.likesCount, question.jumbledStatements, isJC, isMQ, selectedOption])

  const toggleLike = async () => {
    const nextLiked = !isLiked
    setIsLiked(nextLiked)
    setLikeCount(prev => Math.max(0, prev + (nextLiked ? 1 : -1)))
    try {
      const likedList = JSON.parse(localStorage.getItem('liked_questions') || '[]')
      const updated = nextLiked
        ? Array.from(new Set([...likedList, question.id]))
        : likedList.filter((id: number) => id !== question.id)
      localStorage.setItem('liked_questions', JSON.stringify(updated))
      await fetch(`${API_URL}/question-bank/${question.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liked: nextLiked }),
        credentials: 'include',
      })
    } catch (err) {
      console.warn('Failed to update like status:', err)
    }
  }

  // Keyboard shortcut listener for standard MCQ (1-4 or A-D)
  useEffect(() => {
    if (isJC || isMQ) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return

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
  }, [question, onSelectOption, isJC, isMQ])

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
            Section {question.section} — {isJC ? 'Jumbled Code' : isMQ ? 'Match the Following' : 'Multiple Choice'}
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
            type="button"
            onClick={toggleLike}
            className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all flex items-center gap-1.5 ${
              isLiked
                ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 shadow-sm'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-rose-300 hover:border-rose-400/50'
            }`}
            title="Like this question if you find it interesting"
          >
            <span>{isLiked ? '❤️' : '🤍'}</span>
            <span>{isLiked ? 'Liked' : 'Like'}</span>
            {likeCount > 0 && <span className="font-mono text-[11px] opacity-80 font-bold">({likeCount})</span>}
          </button>

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
        {(() => {
          const title = question.questionText?.trim() || ''
          const body = question.problemStatement?.trim() || ''
          const showTitle = !!title && !!body && title !== body
          const statement = body || title
          return (
            <>
              {showTitle && (
                <h2 className="text-sm font-semibold text-slate-400 mb-3">{title}</h2>
              )}
              {statement ? (
                <MarkdownRenderer
                  content={statement}
                  className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed"
                />
              ) : (
                <p className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed">Question unavailable</p>
              )}
            </>
          )
        })()}
      </div>

      {/* ── Pseudocode / Code Snippet Block ── */}
      {question.codeSnippet && (
        <div className="mb-6 rounded-2xl overflow-hidden border border-slate-700/80 bg-slate-950/95 shadow-lg">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm">💻</span>
              <span className="text-xs font-mono font-bold text-indigo-300">Pseudocode / Code Snippet</span>
            </div>
            {question.programmingLanguage && (
              <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                {question.programmingLanguage}
              </span>
            )}
          </div>
          <div className="p-4 overflow-x-auto font-mono text-sm">
            <MarkdownRenderer content={`\`\`\`${question.programmingLanguage?.toLowerCase() || 'text'}\n${question.codeSnippet}\n\`\`\``} />
          </div>
        </div>
      )}

      {/* ── 1. Jumbled Code (JC) Interactive Drag & Drop Area ── */}
      {isJC && (
        <div className="mb-6 p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div>
              <span className="text-xs font-mono font-bold text-amber-300 flex items-center gap-1.5">
                <span>🔀</span> Arrange Code Statements in Correct Logical Sequence
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">Drag statements using the grip handle (⋮⋮) or use ▲ / ▼ to reorder.</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const initial = question.jumbledStatements || []
                  setJcOrder(initial)
                  onSelectOption(JSON.stringify(initial))
                }}
                className="text-[11px] font-semibold text-slate-400 hover:text-amber-300 px-2 py-1 rounded bg-slate-800 border border-slate-700 hover:border-amber-500/40 transition-all flex items-center gap-1"
                title="Reset statements to original arrangement"
              >
                <span>↺</span> Reset Order
              </button>
              <span className="text-[10px] text-indigo-300 bg-indigo-950/60 border border-indigo-500/30 px-2.5 py-1 rounded-full font-mono font-bold">
                {jcOrder.length} Statements
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {jcOrder.map((stmt, i) => (
              <div
                key={i}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', String(i))
                  e.currentTarget.classList.add('opacity-40')
                }}
                onDragEnd={(e) => {
                  e.currentTarget.classList.remove('opacity-40')
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10)
                  if (isNaN(fromIdx) || fromIdx === i) return
                  const items = [...jcOrder]
                  const [moved] = items.splice(fromIdx, 1)
                  items.splice(i, 0, moved)
                  setJcOrder(items)
                  onSelectOption(JSON.stringify(items))
                }}
                className="flex gap-2.5 items-center p-3 rounded-xl bg-slate-950/70 border border-slate-800 hover:border-indigo-500/60 transition-all cursor-move group select-none"
              >
                <div className="flex items-center gap-1 text-slate-500 group-hover:text-indigo-400 shrink-0">
                  <span className="text-sm font-bold cursor-grab active:cursor-grabbing">⋮⋮</span>
                  <div className="w-6 h-6 rounded-md bg-indigo-950 border border-indigo-500/30 text-indigo-300 flex items-center justify-center text-xs font-bold font-mono">
                    {i + 1}
                  </div>
                </div>
                <div className="flex-1 min-w-0 font-mono text-xs sm:text-sm text-slate-200 whitespace-pre-wrap">
                  {stmt}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => {
                      if (i === 0) return
                      const items = [...jcOrder]
                      ;[items[i - 1], items[i]] = [items[i], items[i - 1]]
                      setJcOrder(items)
                      onSelectOption(JSON.stringify(items))
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 transition-all text-xs border border-transparent hover:border-slate-700"
                    title="Move Up"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    disabled={i === jcOrder.length - 1}
                    onClick={() => {
                      if (i >= jcOrder.length - 1) return
                      const items = [...jcOrder]
                      ;[items[i + 1], items[i]] = [items[i], items[i + 1]]
                      setJcOrder(items)
                      onSelectOption(JSON.stringify(items))
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 transition-all text-xs border border-transparent hover:border-slate-700"
                    title="Move Down"
                  >
                    ▼
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Current Program Assembly Preview */}
          <div className="pt-3 border-t border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                💻 Assembled Code Preview
              </span>
              <span className="text-[10px] text-emerald-400 font-mono font-medium">Auto-saved to response</span>
            </div>
            <pre className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-slate-300 overflow-x-auto whitespace-pre leading-relaxed">
              {jcOrder.map((line, idx) => `${String(idx + 1).padStart(2, ' ')} | ${line}`).join('\n')}
            </pre>
          </div>
        </div>
      )}

      {/* ── 2. Matching Question (MQ) Interactive Workspace ── */}
      {isMQ && (
        <div className="mb-6 p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
          {(() => {
            const leftItems: string[] = question.leftItems || (question.matchingPairs || []).map((p: any) => p.left)
            const rightOptions: string[] = question.rightItems || [
              ...(question.matchingPairs || []).map((p: any) => p.right),
              ...(question.extraRightMatches || []),
            ].filter(Boolean)

            const matchedCount = leftItems.filter((l) => Boolean(matchingMap[l])).length

            const handleMatchChange = (leftItem: string, chosenRight: string) => {
              const updated = { ...matchingMap }
              if (!chosenRight) {
                delete updated[leftItem]
              } else {
                updated[leftItem] = chosenRight
              }
              setMatchingMap(updated)
              onSelectOption(Object.keys(updated).length > 0 ? JSON.stringify(updated) : null)
            }

            const resetMatches = () => {
              setMatchingMap({})
              onSelectOption(null)
            }

            return (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-xs font-mono font-bold text-purple-300 flex items-center gap-1.5">
                      <span>🔗</span> Match Each Item in Column A with its Correct Pair in Column B
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">Select a matching option from the dropdown or click choices below.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {matchedCount > 0 && (
                      <button
                        type="button"
                        onClick={resetMatches}
                        className="text-[11px] font-semibold text-slate-400 hover:text-rose-300 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 hover:border-rose-500/40 transition-all"
                      >
                        ✕ Clear All
                      </button>
                    )}
                    <span
                      className={`text-[10px] px-2.5 py-1 rounded-full font-mono font-bold border ${
                        matchedCount === leftItems.length && leftItems.length > 0
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                      }`}
                    >
                      Matched {matchedCount} / {leftItems.length}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                  {/* Column A (Left items with selector) */}
                  <div className="lg:col-span-7 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                      Column A (Items to Match)
                    </h4>
                    {leftItems.map((left, idx) => {
                      const currentChosen = matchingMap[left] || ''
                      const isMatched = Boolean(currentChosen)

                      return (
                        <div
                          key={idx}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isMatched
                              ? 'bg-slate-950/80 border-indigo-500/50 shadow-sm'
                              : 'bg-slate-950/50 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 mb-2.5">
                            <span className="w-5 h-5 rounded-md bg-indigo-950 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <div className="flex-1 text-sm text-slate-100 font-medium whitespace-pre-wrap leading-snug">
                              {left}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400 font-mono">Matches ➔</span>
                            <select
                              value={currentChosen}
                              onChange={(e) => handleMatchChange(left, e.target.value)}
                              className="input-field flex-1 text-xs py-1.5 font-medium bg-slate-900 border-slate-700 text-slate-200 focus:border-indigo-500"
                            >
                              <option value="">-- Choose matching option --</option>
                              {rightOptions.map((r, rIdx) => {
                                const letter = OPTION_KEYS[rIdx] || String(rIdx + 1)
                                return (
                                  <option key={rIdx} value={r}>
                                    {letter}. {r.length > 50 ? `${r.slice(0, 48)}...` : r}
                                  </option>
                                )
                              })}
                            </select>
                            {isMatched && (
                              <button
                                type="button"
                                onClick={() => handleMatchChange(left, '')}
                                className="text-xs text-slate-400 hover:text-rose-400 p-1"
                                title="Unpair"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Column B (Reference choices) */}
                  <div className="lg:col-span-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">
                      Column B (Choices)
                    </h4>
                    <div className="space-y-2">
                      {rightOptions.map((right, rIdx) => {
                        const letter = OPTION_KEYS[rIdx] || String(rIdx + 1)
                        const assignedLeft = Object.entries(matchingMap).find(([, val]) => val === right)?.[0]
                        const isAssigned = Boolean(assignedLeft)

                        return (
                          <div
                            key={rIdx}
                            className={`p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${
                              isAssigned
                                ? 'bg-indigo-950/20 border-indigo-500/30 text-slate-200'
                                : 'bg-slate-950/40 border-slate-800 text-slate-300'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold shrink-0 text-[11px] ${
                                isAssigned
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {letter}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="whitespace-pre-wrap">{right}</p>
                              {isAssigned && assignedLeft && (
                                <p className="text-[10px] text-indigo-400 mt-1 font-mono font-semibold">
                                  ✓ Linked to Item #{leftItems.indexOf(assignedLeft) + 1}
                                </p>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* ── 3. Multiple Choice Question Options (Only if standard MCQ) ── */}
      {!isJC && !isMQ && (
        <div className="space-y-3">
          {question.options?.map((optionText: string, idx: number) => {
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

                {/* Option Text / Visual */}
                <div className="flex-1 min-w-0">
                  {renderOptionContent(optionText, isSelected)}
                </div>
              </button>
            )
          })}
        </div>
      )}

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
