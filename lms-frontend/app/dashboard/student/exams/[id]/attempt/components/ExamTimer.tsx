'use client'

import { useEffect, useState, useRef } from 'react'

interface ExamTimerProps {
  deadlineAt: string
  serverTime: string
  onExpire: () => void
}

export default function ExamTimer({ deadlineAt, serverTime, onExpire }: ExamTimerProps) {
  const [remaining, setRemaining] = useState(0)
  const expiredRef = useRef(false)

  useEffect(() => {
    const serverOffset = Date.now() - new Date(serverTime).getTime()
    const deadline = new Date(deadlineAt).getTime()

    const tick = () => {
      const now = Date.now() - serverOffset
      const left = Math.max(0, Math.floor((deadline - now) / 1000))
      setRemaining(left)
      if (left === 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpire()
      }
    }

    tick()
    const intervalId = setInterval(tick, 1000)
    return () => clearInterval(intervalId)
  }, [deadlineAt, serverTime, onExpire])

  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = remaining % 60

  const timeString = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  // 3-State Timer
  const isCritical = remaining > 0 && remaining < 120 // < 2 mins
  const isWarning = remaining >= 120 && remaining < 600 // < 10 mins

  if (isCritical) {
    return (
      <div
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono font-bold text-sm tracking-wider bg-red-950/80 border border-red-500/80 text-red-300 animate-pulse shadow-sm shadow-red-900/50"
        title="Critical: Less than 2 minutes remaining!"
      >
        <span className="text-red-400 text-base">⚠️</span>
        <span>{timeString}</span>
      </div>
    )
  }

  if (isWarning) {
    return (
      <div
        className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono font-bold text-sm tracking-wider bg-amber-950/70 border border-amber-500/60 text-amber-300 shadow-sm"
        title="Warning: Less than 10 minutes remaining"
      >
        <span className="text-amber-400 text-base">⏱</span>
        <span>{timeString}</span>
      </div>
    )
  }

  return (
    <div
      className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono font-semibold text-sm tracking-wider bg-slate-800/90 border border-slate-700 text-slate-100 shadow-sm"
      title="Exam time remaining"
    >
      <span className="text-indigo-400 text-base">⏱</span>
      <span>{timeString}</span>
    </div>
  )
}
