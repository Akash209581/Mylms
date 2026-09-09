'use client'
import { ReactNode, useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'

type Position = { pdfPage: number; videoSeconds: number }
type Patch = Partial<Position>

/** Mount with a lesson key so pending writes remain associated with their original lesson. */
export default function LessonMediaPosition({ lessonId, children }: {
  lessonId: number; children: (position: Position, record: (patch: Patch, flush?: boolean) => void) => ReactNode
}) {
  const [initial, setInitial] = useState<Position | null>(null), [error, setError] = useState('')
  const enabled = useRef(false), active = useRef(true)
  const pending = useRef<Patch>({}), chain = useRef<Promise<unknown>>(Promise.resolve())
  const latest = useRef<Patch>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  function flush() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const patch = pending.current
    if (!enabled.current || !Object.keys(patch).length) return
    pending.current = {}
    chain.current = chain.current.catch(() => {}).then(() => api.patch(`/learning-state/lessons/${lessonId}`, patch))
      .then(() => { if (active.current) setError('') })
      .catch(() => {
        pending.current = { ...patch, ...latest.current, ...pending.current }
        if (active.current) setError('Media position could not be saved. Retry to keep your place.')
      })
  }
  useEffect(() => {
    active.current = true
    api.get(`/learning-state/lessons/${lessonId}`).then(({ data }) => {
      if (!active.current) return
      enabled.current = true
      setInitial({ pdfPage: data.pdfPage || 1, videoSeconds: data.videoSeconds || 0 })
    }).catch(() => {
      if (!active.current) return
      setInitial({ pdfPage: 1, videoSeconds: 0 })
      setError('Saved media position could not be loaded. Reopen this lesson to retry.')
    })
    const hide = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', hide)
    return () => { active.current = false; document.removeEventListener('visibilitychange', hide); flush() }
  }, [lessonId])
  const record = (patch: Patch, immediate = false) => {
    if (!enabled.current) return
    latest.current = { ...latest.current, ...patch }
    pending.current = { ...pending.current, ...patch }
    if (immediate) flush()
    else if (!timer.current) timer.current = setTimeout(flush, 5000)
  }
  return <>{error && <p role="alert" className="mb-3 rounded-lg bg-red-950 p-3 text-red-200">{error}{enabled.current && <button className="ml-2 underline" onClick={flush}>Retry save</button>}</p>}
    {initial ? children(initial, record) : <p role="status" className="p-4 text-slate-300">Restoring your place…</p>}</>
}
