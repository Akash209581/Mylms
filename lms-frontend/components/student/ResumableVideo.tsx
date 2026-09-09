'use client'
import { useRef } from 'react'

export default function ResumableVideo({ src, initialSeconds = 0, onPosition }: {
  src: string; initialSeconds?: number; onPosition?: (seconds: number, flush?: boolean) => void
}) {
  const ready = useRef(false)
  return <video src={src} controls className="w-full rounded-3xl glass-card border-none shadow-2xl ring-1 ring-white/10" preload="metadata"
    onLoadedMetadata={event => {
      const video = event.currentTarget
      if (Number.isFinite(video.duration)) video.currentTime = Math.max(0, Math.min(initialSeconds, video.duration))
      ready.current = true
    }}
    onTimeUpdate={event => { if (ready.current) onPosition?.(Math.min(604800, Math.max(0, event.currentTarget.currentTime))) }}
    onPause={event => { if (ready.current) onPosition?.(Math.min(604800, Math.max(0, event.currentTarget.currentTime)), true) }}
    onSeeked={event => { if (ready.current) onPosition?.(Math.min(604800, Math.max(0, event.currentTarget.currentTime)), true) }}
    onEnded={event => onPosition?.(Math.min(604800, Math.max(0, event.currentTarget.currentTime)), true)} />
}
