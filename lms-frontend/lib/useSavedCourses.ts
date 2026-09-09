'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'

export type SavedCourse = { courseId: number; saved: boolean; savedAt: string | null; course: { id: number; title: string; thumbnail?: string; category?: string; level?: string } }
export function useSavedCourses() {
  const [courses, setCourses] = useState<SavedCourse[]>([])
  const [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [busy, setBusy] = useState<number[]>([])
  const pending = useRef(new Set<number>())
  const reload = useCallback(async () => {
    setLoading(true); setError('')
    try { const result = await api.get('/learning-state/courses'); setCourses(result.data.filter((row: SavedCourse) => row.saved)) }
    catch { setError('Saved courses could not be loaded. Please try again.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void reload() }, [reload])
  async function toggle(courseId: number, saved: boolean) {
    if (pending.current.has(courseId)) return
    pending.current.add(courseId); setBusy(Array.from(pending.current)); setError('')
    try {
      const result = await api.patch(`/learning-state/courses/${courseId}`, { saved })
      setCourses(previous => [...previous.filter(row => row.courseId !== courseId), ...(result.data.saved ? [result.data] : [])])
    } catch { setError('Your saved-course preference could not be updated. Please try again.') }
    finally { pending.current.delete(courseId); setBusy(Array.from(pending.current)) }
  }
  return { courses, loading, error, busy, reload, toggle }
}
