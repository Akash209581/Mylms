'use client'

import { useEffect, useState, useRef } from 'react'

interface ExamTimerProps {
  deadlineAt: string
  serverTime: string
  remainingSeconds?: number
  onExpire: () => void
}

export default function ExamTimer({ deadlineAt, serverTime, remainingSeconds, onExpire }: ExamTimerProps) {
  const [remaining, setRemaining] = useState(() =>
    typeof remainingSeconds === 'number'
      ? remainingSeconds
      : Math.max(0, Math.floor((new Date(deadlineAt).getTime() - Date.now()) / 1000)),
  )
  const offsetRef = useRef(Date.now() - new Date(serverTime).getTime())

  useEffect(() => {
    offsetRef.current = Date.now() - new Date(serverTime).getTime()
    if (typeof remainingSeconds === 'number') setRemaining(remainingSeconds)
  }, [serverTime, deadlineAt, remainingSeconds])

  useEffect(() => {
    const deadline = new Date(deadlineAt).getTime()
    const tick = () => {
      const now = Date.now() - offsetRef.current
      const left = Math.max(0, Math.floor((deadline - now) / 1000))
      setRemaining(left)
      if (left === 0) onExpire()
    }
    tick()
    const intervalId = setInterval(tick, 1000)
    return () => clearInterval(intervalId)
  }, [deadlineAt, serverTime, onExpire])

  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60
  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const isCritical = remaining > 0 && remaining < 120
  const isWarning = remaining >= 120 && remaining < 600

  const tone = isCritical
    ? 'bg-red-950/80 border-red-500/80 text-red-300 animate-pulse'
    : isWarning
      ? 'bg-amber-950/70 border-amber-500/60 text-amber-300'
      : 'bg-[var(--bg-raised)] border-[var(--border)] text-[var(--text-primary)]'

  return (
    <div
      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono font-bold text-sm tracking-wider border ${tone}`}
      title="Exam time remaining"
      data-testid="exam-timer"
    >
      <span aria-hidden>⏱</span>
      <span>{timeString}</span>
    </div>
  )
}
