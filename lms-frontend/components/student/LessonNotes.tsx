'use client'

import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'

type Entry = { note: string; savedNote: string; bookmarked: boolean }

/** Keep drafts across lesson changes; only acknowledge writes after the server succeeds. */
export default function LessonNotes({ lessonId }: { lessonId: number }) {
  const [entries, setEntries] = useState<Record<number, Entry>>({})
  const [errors, setErrors] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState<Record<number, boolean>>({})
  const [retry, setRetry] = useState(0)
  const inFlight = useRef(new Set<number>())
  const entry = entries[lessonId]
  const dirty = Object.values(entries).some(value => value.note !== value.savedNote)

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  useEffect(() => {
    let cancelled = false
    setErrors(previous => ({ ...previous, [lessonId]: '' }))
    api.get(`/learning-state/lessons/${lessonId}`).then(({ data }) => {
      if (cancelled) return
      setEntries(previous => ({ ...previous, [lessonId]: previous[lessonId] || {
        note: data.note, savedNote: data.note, bookmarked: data.bookmarked,
      } }))
    }).catch(() => {
      if (!cancelled) setErrors(previous => ({ ...previous, [lessonId]: 'Your notes and bookmark could not be loaded.' }))
    })
    return () => { cancelled = true }
  }, [lessonId, retry])

  async function save(patch: { note?: string; bookmarked?: boolean }) {
    if (inFlight.current.has(lessonId)) return
    inFlight.current.add(lessonId)
    setBusy(previous => ({ ...previous, [lessonId]: true }))
    setErrors(previous => ({ ...previous, [lessonId]: '' }))
    try {
      await api.patch(`/learning-state/lessons/${lessonId}`, patch)
      if (patch.bookmarked !== undefined) window.dispatchEvent(new Event('lesson-bookmark-changed'))
      setEntries(previous => ({ ...previous, [lessonId]: {
        ...previous[lessonId],
        ...(patch.note !== undefined ? { savedNote: patch.note } : {}),
        ...(patch.bookmarked !== undefined ? { bookmarked: patch.bookmarked } : {}),
      } }))
    } catch {
      setErrors(previous => ({ ...previous, [lessonId]: 'Changes could not be saved. Your draft is still here; please try again.' }))
    } finally {
      inFlight.current.delete(lessonId)
      setBusy(previous => ({ ...previous, [lessonId]: false }))
    }
  }

  return <section aria-label="Personal lesson notes" className="mt-6 rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-100">
    <h3 className="text-lg font-bold">My notes</h3>
    {errors[lessonId] && <p role="alert" className="my-3 text-red-200">{errors[lessonId]}</p>}
    {!entry ? errors[lessonId]
      ? <button onClick={() => setRetry(value => value + 1)} className="mt-3 rounded-lg border border-slate-500 px-4 py-2">Retry loading notes</button>
      : <p role="status">Loading notes…</p>
      : <>
        <label htmlFor="lesson-note" className="mt-3 block text-sm">Private note for this lesson</label>
        <textarea id="lesson-note" value={entry.note} maxLength={20000} rows={5}
          onChange={event => { const note = event.target.value; setEntries(previous => ({ ...previous, [lessonId]: { ...previous[lessonId], note } })) }}
          className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-400" />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button disabled={busy[lessonId] || entry.note === entry.savedNote} onClick={() => void save({ note: entry.note })}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-white disabled:opacity-50">Save note</button>
          <button disabled={busy[lessonId]} aria-pressed={entry.bookmarked} onClick={() => void save({ bookmarked: !entry.bookmarked })}
            className="rounded-lg border border-slate-500 px-4 py-2 disabled:opacity-50">{entry.bookmarked ? 'Remove bookmark' : 'Bookmark lesson'}</button>
          <span role="status" className="text-sm text-slate-300">{busy[lessonId] ? 'Saving…' : entry.note !== entry.savedNote ? 'Unsaved changes' : 'Up to date'}</span>
        </div>
      </>}
  </section>
}
