'use client'
import { useEffect, useState } from 'react'
import { api } from '@/lib/api'

export default function LessonBookmarks({ courseId, lessons, onSelect }: {
  courseId: string; lessons: { id: number; title: string }[]; onSelect: (index: number) => void
}) {
  const [ids, setIds] = useState<number[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    api.get(`/learning-state/courses/${courseId}/lessons`).then(({ data }) => {
      if (active) setIds(data.filter((row: { bookmarked: boolean }) => row.bookmarked).map((row: { lessonId: number }) => row.lessonId))
    }).catch(() => { if (active) setError('Bookmarks could not be loaded.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [courseId, revision])
  useEffect(() => {
    const reload = () => setRevision(value => value + 1)
    window.addEventListener('lesson-bookmark-changed', reload)
    return () => window.removeEventListener('lesson-bookmark-changed', reload)
  }, [])
  return <section aria-label="Bookmarked lessons" className="mb-6 rounded-xl border border-slate-700 p-3">
    <h3 className="font-bold text-slate-100">Bookmarked lessons</h3>
    {error ? <p role="alert" className="mt-2 text-sm text-red-200">{error}<button className="ml-2 underline" onClick={() => setRevision(value => value + 1)}>Retry</button></p>
      : loading ? <p role="status" className="mt-2 text-sm text-slate-300">Loading bookmarks…</p>
      : ids.length ? <ul>{lessons.map((lesson, index) => ids.includes(lesson.id) && <li key={lesson.id}><button className="mt-2 text-left text-sm text-indigo-200 underline" onClick={() => onSelect(index)}>{lesson.title}</button></li>)}</ul>
      : <p className="mt-2 text-sm text-slate-300">Bookmark a lesson beside your notes to find it here.</p>}
  </section>
}
