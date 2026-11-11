'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, SkipBack, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { api } from '@/lib/api'
import { CodeTrace, parseCodeTrace, pythonTraceProgram } from '@/lib/code-trace'

export default function CodeVisualizer({ code, language, stdin }: { code: string; language: string; stdin: string }) {
  const [trace, setTrace] = useState<CodeTrace | null>(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(900)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const revision = useRef(0)
  const activeLine = useRef<HTMLDivElement>(null)
  useEffect(() => {
    revision.current++
    setTrace(null); setIndex(0); setPlaying(false); setBusy(false); setError('')
    return () => { revision.current++ }
  }, [code, language, stdin])
  useEffect(() => {
    if (!playing || !trace) return
    if (index >= trace.steps.length - 1) { setPlaying(false); return }
    const timer = setTimeout(() => setIndex(i => i + 1), speed)
    return () => clearTimeout(timer)
  }, [playing, index, speed, trace])
  useEffect(() => { activeLine.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }) }, [index])
  async function visualize() {
    const request = ++revision.current
    setBusy(true); setError(''); setTrace(null); setPlaying(false); setIndex(0)
    try {
      let { data } = await api.post('/compiler/run', { language: 'python', code: pythonTraceProgram(code), stdin })
      for (let i = 0; ['QUEUED', 'RUNNING'].includes(data.status) && i < 30; i++) {
        await new Promise(resolve => setTimeout(resolve, 600))
        if (request !== revision.current) return
        data = (await api.get(`/compiler/status/${data.jobId}`)).data
      }
      if (request !== revision.current) return
      if (!data.stdout) throw new Error(data.stderr || data.error || 'The trace could not finish. Try a smaller input or retry.')
      setTrace(parseCodeTrace(data.stdout))
    } catch (failure: any) {
      if (request === revision.current) setError(failure.response?.data?.message || failure.message || 'Visualization failed. Please retry.')
    } finally { if (request === revision.current) setBusy(false) }
  }
  const step = trace?.steps[index]
  const previous = trace?.steps[index - 1]
  const button = 'rounded-lg border border-[var(--border)] px-3 py-2 disabled:opacity-40 hover:bg-indigo-500/10 transition-colors'
  return <section aria-label="Code visualization" className="space-y-4 text-[var(--text-primary)]">
    <div className="rounded-2xl border border-indigo-400/30 bg-gradient-to-br from-indigo-500/15 to-cyan-500/5 p-4">
      <div className="flex items-center gap-2 text-indigo-400"><Sparkles size={18} /><h2 className="font-bold text-lg">See your code think</h2></div>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">Follow execution one line at a time. Watch values change and see how your output takes shape.</p>
      {language !== 'python' ? <p className="mt-3 text-sm">Visualization currently supports Python. Select Python in the editor to explore your code.</p> : <>
        <p className="mt-2 text-xs text-[var(--text-muted)]">Uses your editor code and Input tab. Up to 150 execution steps; collections show their first items.</p>
        <button className="mt-4 w-full rounded-xl bg-indigo-600 px-4 py-3 font-semibold text-white disabled:opacity-50 hover:bg-indigo-500" disabled={busy || !code.trim()} onClick={() => void visualize()}>{busy ? 'Capturing execution…' : 'Visualize my code'}</button>
      </>}
    </div>
    {error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</p>}
    {trace && <>
      {trace.error && <p role="alert" className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-500">{trace.error}</p>}
      {step ? <>
        <div className="sticky top-0 z-10 space-y-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-3">
          <div className="flex items-center justify-between text-xs"><span>Step {index + 1} / {trace.steps.length}</span><label>Speed <select aria-label="Playback speed" className="bg-[var(--bg-surface)]" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={1500}>Slow</option><option value={900}>Normal</option><option value={350}>Fast</option></select></label></div>
          <div className="flex justify-between gap-1">
            <button className={button} aria-label="Restart visualization" onClick={() => { setIndex(0); setPlaying(false) }}><SkipBack size={16} /></button>
            <button className={button} aria-label="Previous step" disabled={!index} onClick={() => { setIndex(i => i - 1); setPlaying(false) }}><ChevronLeft size={16} /></button>
            <button className={button} aria-label={playing ? 'Pause visualization' : 'Play visualization'} disabled={index === trace.steps.length - 1} onClick={() => setPlaying(v => !v)}>{playing ? <Pause size={16} /> : <Play size={16} />}</button>
            <button className={button} aria-label="Next step" disabled={index === trace.steps.length - 1} onClick={() => { setIndex(i => i + 1); setPlaying(false) }}><ChevronRight size={16} /></button>
          </div>
          <input aria-label="Execution step" className="w-full accent-indigo-500" type="range" min={0} max={trace.steps.length - 1} value={index} onChange={e => { setIndex(Number(e.target.value)); setPlaying(false) }} />
          <p className="text-sm" aria-live="polite">{step.event === 'return' ? 'Leaving' : 'About to execute'} line {step.line} · {step.scope === '<module>' ? 'Main program' : step.scope}</p>
        </div>
        <div className="max-h-56 overflow-auto rounded-xl border border-[var(--border)] bg-slate-950 py-2 font-mono text-xs text-slate-300" aria-label="Execution source">
          {code.split('\n').map((line, i) => <div key={i} ref={step.line === i + 1 ? activeLine : undefined} className={`flex min-w-max px-3 py-1 ${step.line === i + 1 ? 'border-l-2 border-indigo-400 bg-indigo-500/25 text-indigo-100' : ''}`}><span className="mr-4 w-6 shrink-0 text-right text-slate-500">{i + 1}</span><pre>{line || ' '}</pre></div>)}
        </div>
        <div><h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)]">Variables · current scope</h3>
          {!Object.keys(step.variables).length && <p className="text-sm text-[var(--text-muted)]">No variables yet. Step forward to watch them appear.</p>}
          <div className="space-y-2">{Object.entries(step.variables).map(([name, value]) => {
            const changed = !previous || previous.scope !== step.scope || JSON.stringify(previous.variables[name]) !== JSON.stringify(value)
            return <div key={name} className={`rounded-xl border p-3 transition-colors duration-300 ${changed ? 'border-emerald-400/50 bg-emerald-500/10' : 'border-[var(--border)]'}`}><div className="mb-2 flex justify-between gap-2"><code className="text-sm font-bold">{name}</code>{changed && <span className="text-[10px] uppercase tracking-wider text-emerald-500">Updated</span>}</div>
              {Array.isArray(value) ? <div className="flex flex-wrap gap-1">{value.map((v, i) => <div key={i} className="min-w-9 rounded border border-[var(--border)] p-2 text-center"><code className="break-all text-xs">{JSON.stringify(v)}</code><div className="mt-1 text-[10px] text-[var(--text-muted)]">{i}</div></div>)}</div> : <pre className="whitespace-pre-wrap break-all text-xs">{JSON.stringify(value, null, 2)}</pre>}
            </div>
          })}</div>
        </div>
        <div className="rounded-xl bg-slate-950 p-4"><h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">Output so far</h3><pre className="whitespace-pre-wrap break-all text-sm text-emerald-300">{step.output || 'No output yet'}</pre></div>
      </> : <p className="text-sm">No execution steps captured. Check the message above.</p>}
    </>}
  </section>
}
