'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { api } from '@/lib/api'

export default function AssessmentGrading({ role }: { role: string }) {
  const [lessons,setLessons] = useState<any[]>([]), [attempts,setAttempts] = useState<any[]>([]), [selected,setSelected] = useState<any>(null)
  const [lessonId,setLessonId] = useState(''), [marks,setMarks] = useState<Record<number,string>>({}), [feedback,setFeedback] = useState('')
  const [loading,setLoading] = useState(true), [busy,setBusy] = useState(false), [error,setError] = useState(''), [status,setStatus] = useState('')
  async function load() {
    setError(''); setLoading(true)
    try { setLessons((await api.get('/assessments/managed-lessons')).data) }
    catch { setError('Assessments could not be loaded.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])
  async function choose(id: string) {
    setLessonId(id); setSelected(null); setAttempts([]); setError(''); setBusy(true)
    try { if (id) setAttempts((await api.get(`/assessments/lessons/${id}/attempts`)).data) }
    catch { setError('Attempts could not be loaded.') }
    finally { setBusy(false) }
  }
  async function open(id: number) {
    setBusy(true); setError(''); setStatus('')
    try {
      const data = (await api.get(`/assessments/attempts/${id}`)).data
      setSelected(data); setFeedback(data.feedback || '')
      setMarks(Object.fromEntries(data.questions.map((question:any) => [question.id,String(data.grading?.find((grade:any) => grade.questionId === question.id)?.marks ?? '')])))
    } catch { setError('This attempt could not be opened.') }
    finally { setBusy(false) }
  }
  async function grade(release: boolean) {
    if (selected.questions.some((question:any) => marks[question.id] === '' || !Number.isInteger(Number(marks[question.id])) || Number(marks[question.id]) < 0 || Number(marks[question.id]) > question.marks)) { setError('Enter a valid mark for every question.'); return }
    setBusy(true); setError('')
    try {
      const response = await api.post(`/assessments/attempts/${selected.id}/grade`,{ grades:selected.questions.map((question:any) => ({questionId:question.id,marks:Number(marks[question.id])})),feedback,release })
      setSelected(response.data); setStatus(release ? 'Result released to the student.' : 'Grades saved. The result remains hidden from the student.')
    } catch (failure:any) { setError(failure.response?.data?.message || 'Grades could not be saved.') }
    finally { setBusy(false) }
  }
  return <main className="mx-auto max-w-5xl space-y-5 p-6 text-[var(--text-primary)]"><Link href={`/dashboard/${role}`}>← Dashboard</Link><h1 className="text-3xl font-bold">Assessment grading</h1><p>Review submitted work and release results for courses you manage. Released grades cannot be edited.</p>
    {error && <p role="alert">{error}<button className="ml-3 underline" onClick={load}>Reload</button></p>}
    {status && <p role="status">{status}</p>}
    {loading ? <p role="status">Loading assessments…</p> : <label className="block">Assessment lesson<select className="ml-3 rounded border p-2" value={lessonId} disabled={busy} onChange={event => void choose(event.target.value)}><option value="">Select a lesson</option>{lessons.map(lesson => <option key={lesson.lesson_id} value={lesson.lesson_id}>{lesson.courseTitle} · {lesson.lesson_title}</option>)}</select></label>}
    {!loading && !lessons.length && <p>No assessment lessons are available in your managed courses.</p>}
    <div className="flex flex-wrap gap-3">{attempts.map(attempt => <button disabled={busy} className="rounded border p-3" key={attempt.id} onClick={() => void open(attempt.id)}>Student #{attempt.studentId} · Attempt {attempt.attemptNumber} · {attempt.state}</button>)}</div>
    {lessonId && !busy && !attempts.length && <p>No attempts have been started.</p>}
    {selected && <section className="space-y-4"><h2 className="text-xl font-bold">{selected.title} · Student #{selected.studentId}</h2>
      {selected.questions.map((question:any,index:number) => <div key={question.id} className="rounded-xl border p-4"><h3 className="font-bold">Question {index+1}</h3><p className="whitespace-pre-wrap">{question.text}</p><p className="my-3 whitespace-pre-wrap">Student response: {selected.answers[question.id] || '(No answer)'}</p><label>Marks (maximum {question.marks})<input type="number" step="1" min="0" max={question.marks} value={marks[question.id] || ''} disabled={busy || ['IN_PROGRESS','RELEASED'].includes(selected.state)} onChange={event => setMarks(previous => ({...previous,[question.id]:event.target.value}))} className="ml-3 w-24 rounded border p-2" /></label></div>)}
      <label className="block">Feedback<textarea maxLength={20000} value={feedback} disabled={busy || ['IN_PROGRESS','RELEASED'].includes(selected.state)} onChange={event => setFeedback(event.target.value)} className="mt-2 w-full rounded border p-3" rows={4} /></label>
      {!['IN_PROGRESS','RELEASED'].includes(selected.state) && <div className="flex gap-3"><button disabled={busy} className="rounded border p-3" onClick={() => void grade(false)}>Save grades</button><button disabled={busy} className="rounded bg-indigo-600 p-3 text-white" onClick={() => void grade(true)}>Release result</button></div>}
      {selected.state === 'IN_PROGRESS' && <p>The student is still working. Grading becomes available after submission or timeout.</p>}
    </section>}
  </main>
}
