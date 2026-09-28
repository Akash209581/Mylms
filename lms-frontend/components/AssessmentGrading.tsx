'use client'
import { useEffect, useState } from 'react'
import { CheckCircle2, ClipboardCheck, Eye, Inbox, Loader2, RefreshCw, Save, Send } from 'lucide-react'
import { api } from '@/lib/api'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { EmptyState, Loading, PageHeader, StatusBadge } from '@/components/ui'

export default function AssessmentGrading({ role }: { role: string }) {
  const [lessons, setLessons] = useState<any[]>([]), [attempts, setAttempts] = useState<any[]>([]), [selected, setSelected] = useState<any>(null)
  const [lessonId, setLessonId] = useState(''), [marks, setMarks] = useState<Record<number, string>>({}), [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState(''), [status, setStatus] = useState('')

  async function load() {
    setError(''); setLoading(true)
    try { setLessons((await api.get('/assessments/managed-lessons')).data) }
    catch { setError('Assessments could not be loaded.') }
    finally { setLoading(false) }
  }
  useEffect(() => { void load() }, [])

  async function choose(id: string) {
    setLessonId(id); setSelected(null); setAttempts([]); setError(''); setStatus(''); setBusy(true)
    try { if (id) setAttempts((await api.get(`/assessments/lessons/${id}/attempts`)).data) }
    catch { setError('Attempts could not be loaded.') }
    finally { setBusy(false) }
  }

  async function open(id: number) {
    setBusy(true); setError(''); setStatus('')
    try {
      const data = (await api.get(`/assessments/attempts/${id}`)).data
      setSelected(data); setFeedback(data.feedback || '')
      setMarks(Object.fromEntries(data.questions.map((question: any) => [question.id, String(data.grading?.find((grade: any) => grade.questionId === question.id)?.marks ?? '')])))
    } catch { setError('This attempt could not be opened.') }
    finally { setBusy(false) }
  }

  async function grade(release: boolean) {
    if (selected.questions.some((question: any) => marks[question.id] === '' || !Number.isInteger(Number(marks[question.id])) || Number(marks[question.id]) < 0 || Number(marks[question.id]) > question.marks)) { setError('Enter a valid whole-number mark for every question.'); return }
    setBusy(true); setError('')
    try {
      const response = await api.post(`/assessments/attempts/${selected.id}/grade`, { grades: selected.questions.map((question: any) => ({ questionId: question.id, marks: Number(marks[question.id]) })), feedback, release })
      setSelected(response.data)
      setStatus(release ? 'Result released to the student.' : 'Grades saved. The result stays hidden from the student until released.')
      setAttempts(previous => previous.map(a => a.id === response.data.id ? { ...a, state: response.data.state } : a))
    } catch (failure: any) { setError(failure.response?.data?.message || 'Grades could not be saved.') }
    finally { setBusy(false) }
  }

  const locked = selected && ['IN_PROGRESS', 'RELEASED'].includes(selected.state)
  const total = selected ? selected.questions.reduce((sum: number, q: any) => sum + (Number(marks[q.id]) || 0), 0) : 0
  const max = selected ? selected.questions.reduce((sum: number, q: any) => sum + Number(q.marks || 0), 0) : 0

  return (
    <div className="min-h-screen bg-mesh">
      <Sidebar role={role.toUpperCase()} />
      <Navbar title="Assessment Grading" />
      <main className="page-content">
        <PageHeader
          eyebrow="Evaluation"
          title="Assessment grading"
          description="Review submitted work and release results for the courses you manage. Released grades cannot be edited."
          actions={<button className="ui-btn ui-btn-secondary" onClick={load} disabled={loading}><RefreshCw aria-hidden="true" /> Refresh</button>}
        />

        {error && <div role="alert" className="ui-alert is-danger mb-5">{error}</div>}
        {status && <div role="status" className="ui-alert is-success mb-5"><CheckCircle2 aria-hidden="true" />{status}</div>}

        {loading ? <Loading label="Loading assessments" /> : !lessons.length ? (
          <EmptyState icon={ClipboardCheck} title="Nothing to grade">No assessment lessons exist in the courses you manage yet.</EmptyState>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] items-start">
            <aside className="ui-card ui-card-pad lg:sticky lg:top-24">
              <div className="ui-field">
                <label className="ui-label" htmlFor="grading-lesson">Assessment</label>
                <select id="grading-lesson" className="ui-select" value={lessonId} disabled={busy} onChange={event => void choose(event.target.value)}>
                  <option value="">Select an assessment</option>
                  {lessons.map(lesson => <option key={lesson.lesson_id} value={lesson.lesson_id}>{lesson.courseTitle} · {lesson.lesson_title}</option>)}
                </select>
              </div>

              {lessonId && (
                <div className="mt-5">
                  <p className="ui-label mb-2">Attempts {attempts.length > 0 && <span className="role-text-muted font-normal">({attempts.length})</span>}</p>
                  {busy && !attempts.length ? <div className="py-6 grid place-items-center"><div className="ui-spinner" /></div> : attempts.length ? (
                    <ul className="grid gap-1.5" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {attempts.map(attempt => (
                        <li key={attempt.id}>
                          <button
                            disabled={busy}
                            onClick={() => void open(attempt.id)}
                            aria-current={selected?.id === attempt.id ? 'true' : undefined}
                            className={`w-full flex items-center justify-between gap-2 p-3 rounded-lg border text-left transition-colors ${selected?.id === attempt.id ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:bg-[var(--bg-raised)]'}`}
                          >
                            <span className="min-w-0">
                              <span className="block text-sm font-semibold role-text-primary">Student #{attempt.studentId}</span>
                              <span className="block text-xs role-text-muted">Attempt {attempt.attemptNumber}</span>
                            </span>
                            <StatusBadge status={attempt.state === 'RELEASED' ? 'PUBLISHED' : attempt.state === 'GRADED' ? 'SUBMITTED' : attempt.state} label={String(attempt.state).replace(/_/g, ' ').toLowerCase()} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm role-text-muted">No attempts have been started.</p>}
                </div>
              )}
            </aside>

            <section className="min-w-0">
              {!selected ? (
                <EmptyState icon={Inbox} title="Select an attempt">Choose an assessment and a student attempt to start grading.</EmptyState>
              ) : (
                <div className="grid gap-4">
                  <div className="ui-card ui-card-pad ui-card-accent flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold tracking-[0.12em] uppercase text-[var(--gold)]">Student #{selected.studentId}</p>
                      <h2 className="font-display text-2xl font-semibold role-text-primary">{selected.title}</h2>
                    </div>
                    <div className="text-right">
                      <p className="text-xs role-text-muted">Total awarded</p>
                      <p className="font-display text-3xl font-semibold role-text-primary ui-num">{total}<span className="text-base role-text-muted"> / {max}</span></p>
                    </div>
                  </div>

                  {selected.state === 'IN_PROGRESS' && <div className="ui-alert is-warning"><Eye aria-hidden="true" />The student is still working. Grading opens after submission or timeout.</div>}
                  {selected.state === 'RELEASED' && <div className="ui-alert is-success"><CheckCircle2 aria-hidden="true" />This result has been released and can no longer be edited.</div>}

                  {selected.questions.map((question: any, index: number) => (
                    <article key={question.id} className="ui-card ui-card-pad">
                      <div className="flex items-start justify-between gap-4">
                        <h3 className="text-xs font-semibold tracking-[0.12em] uppercase role-text-muted">Question {index + 1}</h3>
                        <span className="ui-badge is-neutral no-dot">{question.marks} marks</span>
                      </div>
                      <p className="whitespace-pre-wrap role-text-primary mt-2 leading-7">{question.text}</p>
                      <div className="mt-4 p-4 rounded-lg border border-[var(--border)] bg-[var(--bg-raised)]">
                        <p className="ui-label mb-1">Student response</p>
                        <p className={`whitespace-pre-wrap text-sm leading-6 ${selected.answers[question.id] ? 'role-text-secondary' : 'role-text-muted italic'}`}>{selected.answers[question.id] || 'No answer submitted'}</p>
                      </div>
                      <div className="ui-field mt-4 max-w-[220px]">
                        <label className="ui-label" htmlFor={`mark-${question.id}`}>Marks awarded (0–{question.marks})</label>
                        <input id={`mark-${question.id}`} type="number" step="1" min="0" max={question.marks} value={marks[question.id] || ''} disabled={busy || locked} onChange={event => setMarks(previous => ({ ...previous, [question.id]: event.target.value }))} className="ui-input" />
                      </div>
                    </article>
                  ))}

                  <div className="ui-card ui-card-pad grid gap-4">
                    <div className="ui-field">
                      <label className="ui-label" htmlFor="grade-feedback">Feedback for the student</label>
                      <textarea id="grade-feedback" maxLength={20000} value={feedback} disabled={busy || locked} onChange={event => setFeedback(event.target.value)} className="ui-textarea" rows={4} />
                    </div>
                    {!locked && (
                      <div className="flex flex-wrap justify-end gap-2">
                        <button disabled={busy} className="ui-btn ui-btn-secondary" onClick={() => void grade(false)}>{busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />} Save draft</button>
                        <button disabled={busy} className="ui-btn ui-btn-primary" onClick={() => void grade(true)}><Send aria-hidden="true" /> Release result</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
