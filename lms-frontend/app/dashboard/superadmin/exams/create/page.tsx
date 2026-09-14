'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api } from '@/lib/api'
import { fromLocalDatetimeInput } from '@/lib/date-utils'

const steps = ['Details & Schedule', 'Settings', 'Section Durations', 'Review']

export default function CreateExamPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState<any>(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    durationMinutes: 60,
    passingMarks: 40,
    startAt: '',
    endAt: '',
    targetBranches: '',
    targetBatches: '',
    attemptLimit: 1,
    negativeMarking: false,
    negativeMarksValue: 0.25,
    tabSwitchMonitoring: true,
    maxTabSwitches: 3,
    shuffleQuestions: false,
    shuffleOptions: false,
    showCorrectAnswers: true,
    showExplanations: true,
    instructions: '',
    timingMode: 'TOTAL',
    sectionDurations: { A: 30, B: 30 },
    questionDurationSeconds: 60,
  })

  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { router.push('/login'); return }
    const u = JSON.parse(stored)
    if (u.role === 'STUDENT') { router.push('/dashboard/student'); return }
    setUser(u)
  }, [])

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))

  const createExam = async () => {
    setSaving(true)
    try {
      const branches = form.targetBranches ? form.targetBranches.split(',').map(s => s.trim()).filter(Boolean) : undefined
      const batches = form.targetBatches ? form.targetBatches.split(',').map(s => s.trim()).filter(Boolean) : undefined

      const payload = {
        ...form,
        startAt: fromLocalDatetimeInput(form.startAt),
        endAt: fromLocalDatetimeInput(form.endAt),
        targetBranches: branches,
        targetBatches: batches,
        sectionDurations: form.timingMode === 'SECTION' ? form.sectionDurations : undefined,
        questionDurationSeconds: form.timingMode === 'QUESTION' ? form.questionDurationSeconds : undefined,
      }
      const res = await api.post('/exams', payload)
      const examId = res.data.id
      router.push(`/dashboard/superadmin/exams/${examId}/questions`)
    } catch (e: any) {
      alert(e.response?.data?.message || 'Failed to create exam')
    } finally {
      setSaving(false)
    }
  }

  const examBase = '/dashboard/superadmin/exams'

  return (
    <div className="min-h-screen bg-mesh">
      <Sidebar role={user?.role || 'SUPERADMIN'} />
      <Navbar title="Create Exam" />
      <main className="page-content max-w-3xl">
        <button onClick={() => router.push(examBase)} className="btn-secondary mb-6 inline-flex items-center gap-2 text-sm">
          ← Back to Exams
        </button>

        {/* Stepper */}
        <div className="flex items-center gap-0 mb-8">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all
                  ${i === step ? 'bg-[var(--accent)] text-white' :
                    i < step ? 'bg-[var(--accent-soft)] text-[var(--accent-text)] cursor-pointer' :
                    'bg-[var(--bg-raised)] role-text-muted cursor-default'}`}
              >
                <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs
                  bg-white/20 font-bold">{i + 1}</span>
                {s}
              </button>
              {i < steps.length - 1 && (
                <div className={`h-px w-8 ${i < step ? 'bg-[var(--accent)]' : 'bg-[var(--border)]'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="glass-card p-8">
          {/* Step 0: Basic Info */}
          {step === 0 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold role-text-primary">Basic Information</h2>

              <div>
                <label className="block text-sm font-semibold role-text-primary mb-2">Exam Title *</label>
                <input
                  id="exam-title"
                  className="input-field"
                  placeholder="e.g. Java Programming Assessment – Batch 2026"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-semibold role-text-primary mb-2">Description</label>
                <textarea
                  id="exam-description"
                  className="input-field resize-none"
                  rows={3}
                  placeholder="Brief overview of this exam..."
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                />
              </div>

              <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-raised)] p-4 space-y-2">
                <p className="text-sm font-semibold role-text-primary">Exam structure</p>
                <p className="text-xs role-text-muted leading-relaxed">
                  After you create this exam, the Question Manager adds two sections only:
                  <strong className="role-text-primary"> Section A — MCQs</strong> and
                  <strong className="role-text-primary"> Section B — coding</strong>.
                  Coding questions include statement, input/output format, constraints, visible and hidden cases, marks, allowed languages, and per-language pre-code. There are no aptitude sections.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold role-text-primary mb-2">Instructions for Students</label>
                <textarea
                  id="exam-instructions"
                  className="input-field resize-none"
                  rows={5}
                  placeholder="Read all questions carefully. Each section must be completed. Section A: MCQ, Section B: Coding..."
                  value={form.instructions}
                  onChange={e => set('instructions', e.target.value)}
                />
              </div>

              {/* Timing Mode */}
              <div className="p-4 rounded-xl bg-[var(--bg-raised)] border border-[var(--border)] space-y-3">
                <label className="block text-sm font-semibold role-text-primary">Timing & Duration Mode</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    ['TOTAL', '⏱ Total Exam Duration', 'One continuous countdown for the whole exam'],
                    ['SECTION', '📑 Section-Wise Timing', 'Separate timers for Section A (MCQ) & Section B (Coding)'],
                    ['QUESTION', '⏳ Question-Wise Timing', 'Fixed countdown timer per question (e.g. 60s)'],
                  ].map(([mode, label, desc]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => set('timingMode', mode)}
                      className={`p-3 rounded-xl text-left border transition-all ${
                        form.timingMode === mode
                          ? 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-sm'
                          : 'border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]'
                      }`}
                    >
                      <p className="text-xs font-bold role-text-primary">{label}</p>
                      <p className="text-[10px] role-text-muted mt-1 leading-snug">{desc}</p>
                    </button>
                  ))}
                </div>

                {form.timingMode === 'TOTAL' && (
                  <div className="pt-2">
                    <label className="block text-xs font-semibold role-text-muted mb-1">Total Duration (minutes) *</label>
                    <input
                      id="exam-duration"
                      type="number" min={10} max={360}
                      className="input-field"
                      value={form.durationMinutes}
                      onChange={e => set('durationMinutes', parseInt(e.target.value) || 60)}
                    />
                  </div>
                )}

                {form.timingMode === 'SECTION' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="block text-xs font-semibold role-text-muted mb-1">Section A Duration (MCQs - mins)</label>
                      <input
                        type="number" min={5} max={180}
                        className="input-field"
                        value={form.sectionDurations.A || 30}
                        onChange={e => {
                          const a = parseInt(e.target.value) || 30
                          set('sectionDurations', { ...form.sectionDurations, A: a })
                          set('durationMinutes', a + (form.sectionDurations.B || 30))
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold role-text-muted mb-1">Section B Duration (Coding - mins)</label>
                      <input
                        type="number" min={5} max={240}
                        className="input-field"
                        value={form.sectionDurations.B || 30}
                        onChange={e => {
                          const b = parseInt(e.target.value) || 30
                          set('sectionDurations', { ...form.sectionDurations, B: b })
                          set('durationMinutes', (form.sectionDurations.A || 30) + b)
                        }}
                      />
                    </div>
                  </div>
                )}

                {form.timingMode === 'QUESTION' && (
                  <div className="pt-2">
                    <label className="block text-xs font-semibold role-text-muted mb-1">Time Per Question (Seconds)</label>
                    <input
                      type="number" min={15} max={600} step={5}
                      className="input-field"
                      value={form.questionDurationSeconds || 60}
                      onChange={e => set('questionDurationSeconds', parseInt(e.target.value) || 60)}
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold role-text-primary mb-2">Passing Marks *</label>
                  <input
                    id="exam-passing-marks"
                    type="number" min={0}
                    className="input-field"
                    value={form.passingMarks}
                    onChange={e => set('passingMarks', parseInt(e.target.value) || 0)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold role-text-primary mb-2">Target Batches / Years (Optional)</label>
                  <input
                    className="input-field"
                    placeholder="e.g. 2024, 2025, 2026"
                    value={form.targetBatches}
                    onChange={e => set('targetBatches', e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold role-text-primary mb-2">Target Branches (Optional)</label>
                <input
                  className="input-field"
                  placeholder="e.g. CSE, IT, ECE, MECH"
                  value={form.targetBranches}
                  onChange={e => set('targetBranches', e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold role-text-primary mb-2">Start Date & Time</label>
                  <input
                    id="exam-start-at"
                    type="datetime-local"
                    className="input-field"
                    value={form.startAt}
                    onChange={e => set('startAt', e.target.value)}
                  />
                  <p className="text-xs role-text-muted mt-1">Leave blank for immediate LIVE status</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold role-text-primary mb-2">End Date & Time</label>
                  <input
                    id="exam-end-at"
                    type="datetime-local"
                    className="input-field"
                    value={form.endAt}
                    onChange={e => set('endAt', e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Settings */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold role-text-primary">Exam Settings</h2>

              {/* Tab Switch Monitoring & Limit */}
              <div className="glass-subtle rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold role-text-primary text-sm">Tab-Switch Monitoring</p>
                    <p className="text-xs role-text-muted">Track when student leaves test tab & auto-submit after limit</p>
                  </div>
                  <button
                    id="toggle-tabSwitchMonitoring"
                    onClick={() => set('tabSwitchMonitoring', !form.tabSwitchMonitoring)}
                    className={`relative w-12 h-6 rounded-full transition-all ${form.tabSwitchMonitoring ? 'bg-[var(--accent)]' : 'bg-[var(--bg-hover)]'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.tabSwitchMonitoring ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>
                {form.tabSwitchMonitoring && (
                  <div>
                    <label className="text-xs role-text-muted">Max Allowed Tab Switches Before Auto-Submit</label>
                    <input
                      type="number" min={1} max={20}
                      className="input-field mt-1 w-32"
                      value={form.maxTabSwitches}
                      onChange={e => set('maxTabSwitches', parseInt(e.target.value) || 3)}
                    />
                  </div>
                )}
              </div>

              {/* Negative Marking */}
              <div className="glass-subtle rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold role-text-primary text-sm">Negative Marking</p>
                    <p className="text-xs role-text-muted">Deduct marks for wrong MCQ answers</p>
                  </div>
                  <button
                    id="toggle-negative-marking"
                    onClick={() => set('negativeMarking', !form.negativeMarking)}
                    className={`relative w-12 h-6 rounded-full transition-all ${form.negativeMarking ? 'bg-[var(--accent)]' : 'bg-[var(--bg-hover)]'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.negativeMarking ? 'left-6' : 'left-0.5'}`} />
                  </button>
                </div>
                {form.negativeMarking && (
                  <div>
                    <label className="text-xs role-text-muted">Deduction per wrong answer</label>
                    <input type="number" step={0.25} min={0} className="input-field mt-1" value={form.negativeMarksValue}
                      onChange={e => set('negativeMarksValue', parseFloat(e.target.value))} />
                  </div>
                )}
              </div>

              {/* Attempt Limit */}
              <div>
                <label className="block text-sm font-semibold role-text-primary mb-2">Attempt Limit</label>
                <select id="exam-attempt-limit" className="input-field" value={form.attemptLimit} onChange={e => set('attemptLimit', parseInt(e.target.value))}>
                  {[1, 2, 3].map(n => <option key={n} value={n}>{n} attempt{n > 1 ? 's' : ''}</option>)}
                </select>
              </div>

              {/* Toggle Options */}
              {([
                ['randomizeQuestions', 'Randomize Question Order', 'Shuffle questions for each student'],
                ['randomizeOptions', 'Randomize MCQ Options', 'Shuffle A/B/C/D options per student'],
                ['autoSubmit', 'Auto Submit on Timer Expiry', 'Automatically submit when time runs out'],
                ['showResults', 'Show Results to Students', 'Students can view their score after submission'],
                ['showCorrectAnswers', 'Show Correct Answers', 'Reveal correct answers in result page'],
                ['showExplanations', 'Show Explanations', 'Show question explanations in results'],
                ['rankingEnabled', 'Enable Ranking', 'Show student rank in results'],
              ] as [string, string, string][]).map(([field, label, desc]) => (
                <div key={field} className="flex items-center justify-between py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div>
                    <p className="text-sm font-medium role-text-primary">{label}</p>
                    <p className="text-xs role-text-muted">{desc}</p>
                  </div>
                  <button
                    id={`toggle-${field}`}
                    onClick={() => set(field, !(form as any)[field])}
                    className={`relative w-11 h-6 rounded-full transition-all shrink-0 ${(form as any)[field] ? 'bg-[var(--accent)]' : 'bg-[var(--bg-hover)]'}`}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${(form as any)[field] ? 'left-5' : 'left-0.5'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold role-text-primary">Review & Create</h2>
              <div className="bg-[var(--bg-raised)] rounded-xl p-5 space-y-3">
                {[
                  ['Title', form.title],
                  ['Timing Mode', form.timingMode === 'TOTAL' ? 'Total Exam Timer' : form.timingMode === 'SECTION' ? 'Section-Wise Timing' : 'Question-Wise Timing'],
                  ['Duration', form.timingMode === 'SECTION' ? `Section A: ${form.sectionDurations.A}m, Section B: ${form.sectionDurations.B}m` : form.timingMode === 'QUESTION' ? `${form.questionDurationSeconds}s / question` : `${form.durationMinutes} minutes`],
                  ['Passing Marks', String(form.passingMarks)],
                  ['Start', form.startAt ? new Date(form.startAt).toLocaleString() : 'Immediately (LIVE)'],
                  ['Target Batches', form.targetBatches || 'All Batches'],
                  ['Target Branches', form.targetBranches || 'All Branches'],
                  ['Tab-Switch Monitoring', form.tabSwitchMonitoring ? `Enabled (Max ${form.maxTabSwitches} switches)` : 'Disabled'],
                  ['Negative Marking', form.negativeMarking ? `Yes (−${form.negativeMarksValue} per wrong)` : 'No'],
                  ['Attempt Limit', String(form.attemptLimit)],
                  ['Show Results', form.showResults ? 'Yes' : 'No'],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between text-sm">
                    <span className="role-text-muted">{k}</span>
                    <span className="role-text-primary font-medium">{v}</span>
                  </div>
                ))}
              </div>
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm text-blue-400">
                💡 After creating, you'll be taken to the <strong>Question Manager</strong> to add MCQ and Coding questions to this exam.
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-8 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="btn-secondary"
            >
              ← Previous
            </button>
            {step < steps.length - 1 ? (
              <button onClick={() => setStep(s => s + 1)} className="btn-primary">
                Next →
              </button>
            ) : (
              <button onClick={handleCreate} disabled={saving} className="btn-success">
                {saving ? 'Creating...' : '🚀 Create Exam & Add Questions'}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
