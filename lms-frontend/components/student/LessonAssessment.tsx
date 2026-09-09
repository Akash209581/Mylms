'use client'
import { useEffect, useRef, useState } from 'react'
import { api } from '@/lib/api'
type Attempt = { id: number; state: string; title: string; attemptNumber: number; deadlineAt: string; serverTime: string;
  questions: { id: number; type: string; text: string; options: string[]; marks: number }[];
  answers: Record<string,string>; score: number | null; totalMarks: number; passed: boolean | null; feedback: string }

export default function LessonAssessment({ lessonId }: { lessonId: number }) {
  const [attempt, setAttempt] = useState<Attempt | null>(null), [history, setHistory] = useState<{ id: number; attemptNumber: number; state: string }[]>([])
  const [answers, setAnswers] = useState<Record<string,string>>({}), [error, setError] = useState(''), [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false), [remaining, setRemaining] = useState(0)
  const latest = useRef(answers), queue = useRef<Promise<unknown>>(Promise.resolve()), version = useRef(0), offset = useRef(0)
  const current = useRef<Attempt | null>(null)
  function accept(data: Attempt, restore = false) {
    current.current = data; setAttempt(data)
    offset.current = new Date(data.serverTime).getTime() - Date.now()
    if (restore) { latest.current = data.answers; setAnswers(data.answers) }
  }
  async function loadHistory() {
    try { const response = await api.get(`/assessments/lessons/${lessonId}/attempts`); setHistory(response.data) }
    catch { setError('Assessment attempts could not be loaded. Please retry.') }
  }
  useEffect(() => { void loadHistory() }, [lessonId])
  async function open(id?: number) {
    setBusy(true); setError('')
    try { const response = id ? await api.get(`/assessments/attempts/${id}`) : await api.post(`/assessments/lessons/${lessonId}/start`); accept(response.data,true); await loadHistory() }
    catch (failure: any) { setError(failure.response?.data?.message || 'The assessment could not be opened.') }
    finally { setBusy(false) }
  }
  function save(submit = false) {
    const selected = current.current
    if (!selected || selected.state !== 'IN_PROGRESS') return Promise.resolve()
    const snapshot = latest.current, revision = version.current
    if (submit) setBusy(true)
    setStatus(submit ? 'Submitting…' : 'Saving…')
    queue.current = queue.current.catch(() => {}).then(async () => {
      // A preceding submission or timeout may already have ended this attempt.
      if (current.current?.state !== 'IN_PROGRESS' || current.current.id !== selected.id) return
      const body = { answers: Object.entries(snapshot).map(([questionId,value]) => ({ questionId: Number(questionId), value })) }
      const response = submit ? await api.post(`/assessments/attempts/${selected.id}/submit`,body) : await api.patch(`/assessments/attempts/${selected.id}/answers`,body)
      accept(response.data)
      if (revision === version.current) setStatus(response.data.state === 'IN_PROGRESS' ? 'Answers saved' : 'Submitted')
      setError('')
      if (response.data.state !== 'IN_PROGRESS') await loadHistory()
    }).catch((failure: any) => { setError(failure.response?.data?.message || 'Answers could not be saved. Your edits are still here; retry saving.'); setStatus('Unsaved changes') })
      .finally(() => { if (submit) setBusy(false) })
    return queue.current
  }
  useEffect(() => {
    if (attempt?.state !== 'IN_PROGRESS') return
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((new Date(attempt.deadlineAt).getTime() - Date.now() - offset.current) / 1000))
      setRemaining(seconds)
      if (!seconds) void save(true)
    }
    tick(); const timer = setInterval(tick, 1000)
    return () => clearInterval(timer)
  }, [attempt?.id, attempt?.state, attempt?.deadlineAt])
  useEffect(() => {
    if (attempt?.state !== 'IN_PROGRESS' || !version.current) return
    const timer = setTimeout(() => void save(), 800)
    return () => clearTimeout(timer)
  }, [answers, attempt?.id, attempt?.state])
  useEffect(() => () => { void save() }, [])
  return <section aria-label="Lesson assessment" className="rounded-2xl border border-slate-700 bg-slate-900 p-5 text-slate-100">
    <h3 className="text-2xl font-bold">Assessment</h3>
    {error && <p role="alert" className="my-3 text-red-200">{error}</p>}
    <div className="my-4 flex flex-wrap gap-3"><button disabled={busy} onClick={() => void open()} className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Start or resume attempt</button>
      <button disabled={busy} onClick={() => void loadHistory()} className="rounded-lg border border-slate-500 px-4 py-2">Refresh attempts</button>
      {history.map(row => <button key={row.id} disabled={busy} onClick={() => void open(row.id)} className="rounded-lg border border-slate-500 px-4 py-2">Attempt {row.attemptNumber}: {row.state.toLowerCase().replace('_',' ')}</button>)}</div>
    {attempt && <>
      <h4 className="text-lg font-bold">{attempt.title} · Attempt {attempt.attemptNumber}</h4>
      {attempt.state === 'IN_PROGRESS' ? <p className="my-3">Time remaining: {Math.floor(remaining/60)}:{String(remaining%60).padStart(2,'0')}. Answers save automatically. The server enforces the deadline.</p>
        : attempt.state === 'RELEASED' ? <p role="status" className="my-3">Score: {attempt.score}/{attempt.totalMarks} · {attempt.passed ? 'Passed — you can now mark this lesson complete.' : 'Not passed'}{attempt.feedback && <span className="block whitespace-pre-wrap">{attempt.feedback}</span>}</p>
        : <p role="status" className="my-3">Submitted. Your instructor will review and release the result.</p>}
      {attempt.questions.map((question,index) => <fieldset disabled={attempt.state !== 'IN_PROGRESS' || busy} key={question.id} className="my-5 rounded-lg border border-slate-600 p-4">
        <legend className="px-2 font-semibold">Question {index+1} · {question.marks} marks</legend><p className="mb-3 whitespace-pre-wrap">{question.text}</p>
        {question.type === 'MCQ' ? question.options.map((option,index) => <label key={index} className="my-2 flex gap-3"><input type="radio" name={`question-${question.id}`} value={option} checked={answers[question.id] === option} onChange={() => { const next={...latest.current,[question.id]:option}; latest.current=next; version.current++; setAnswers(next); setStatus('Unsaved changes') }} /><span>{option}</span></label>)
          : <label className="block">Your answer<textarea maxLength={20000} rows={5} value={answers[question.id] || ''} onChange={event => { const next={...latest.current,[question.id]:event.target.value}; latest.current=next; version.current++; setAnswers(next); setStatus('Unsaved changes') }} className="mt-2 w-full rounded border border-slate-500 bg-slate-950 p-3" /></label>}
      </fieldset>)}
      {attempt.state === 'IN_PROGRESS' && <div className="flex flex-wrap items-center gap-4"><button disabled={busy} onClick={() => void save()} className="rounded-lg border border-slate-500 px-4 py-2">Save answers</button><button disabled={busy} onClick={() => void save(true)} className="rounded-lg bg-indigo-600 px-4 py-2 text-white">Submit assessment</button><span role="status">{status}</span></div>}
    </>}
  </section>
}
