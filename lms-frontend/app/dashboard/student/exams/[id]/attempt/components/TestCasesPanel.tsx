'use client'

import { useEffect, useState } from 'react'

interface SampleTestCase {
  input: string
  output: string
  explanation?: string
}

interface PublicResult {
  passed: boolean
  input?: string
  expected?: string
  actual?: string
  execTimeMs?: number
  stderr?: string
}

interface CodeResult {
  status?: string
  passedCases?: number
  totalCases?: number
  score?: number
  totalMarks?: number
  executionTimeMs?: number
  error?: string
  compilationError?: string
  stdout?: string
  stderr?: string
  executionType?: 'RUN' | 'SUBMIT'
  publicResults?: PublicResult[]
  hiddenResultsSummary?: {
    passed: number
    total: number
    details?: { caseNumber: number; passed: boolean }[]
  }
}

interface JobState {
  jobId: string
  status: string
  position?: number
  currentCase?: number
  totalCases?: number
  executionType: 'RUN' | 'SUBMIT'
}

interface TestCasesPanelProps {
  sampleTestCases?: SampleTestCase[]
  codeResult?: CodeResult | null
  jobState?: JobState | null
  isRunning: boolean
  onRunCode: (stdin?: string) => void
  onSubmitCode: () => void
}

export default function TestCasesPanel({
  sampleTestCases = [],
  codeResult,
  jobState,
  isRunning,
  onRunCode,
  onSubmitCode,
}: TestCasesPanelProps) {
  const [activeTab, setActiveTab] = useState<'cases' | 'results' | 'output'>('cases')
  const [selectedCaseIndex, setSelectedCaseIndex] = useState(0)
  const [customStdin, setCustomStdin] = useState(sampleTestCases[0]?.input || '')

  const hasResults = Boolean(codeResult)
  const isQueuedOrRunning = Boolean(jobState && ['QUEUED', 'RUNNING'].includes(jobState.status))

  useEffect(() => {
    const type = codeResult?.executionType || jobState?.executionType
    if (isQueuedOrRunning && type === 'RUN') setActiveTab('output')
    else if (isQueuedOrRunning && type === 'SUBMIT') setActiveTab('results')
    else if (codeResult && type === 'RUN') setActiveTab('output')
    else if (codeResult && (type === 'SUBMIT' || codeResult.publicResults?.length)) setActiveTab('results')
  }, [codeResult, jobState, isQueuedOrRunning])

  return (
    <div className="flex flex-col h-full bg-slate-900 border-t border-slate-800 select-none">
      {/* ── Console Tabs & Controls ── */}
      <div className="h-10 px-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('cases')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'cases'
                ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Test Cases</span>
            {sampleTestCases.length > 0 && (
              <span className="text-[10px] text-slate-400 font-mono bg-slate-850 px-1 rounded">
                {sampleTestCases.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('results')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'results'
                ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Test Results</span>
            {isQueuedOrRunning && (
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            )}
            {codeResult && (
              <span
                className={`w-2 h-2 rounded-full ${
                  codeResult.status === 'ACCEPTED'
                    ? 'bg-emerald-400'
                    : codeResult.status === 'PARTIAL'
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
              />
            )}
          </button>

          <button
            onClick={() => setActiveTab('output')}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'output'
                ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Output</span>
            {(codeResult?.stdout || codeResult?.stderr || codeResult?.compilationError || codeResult?.error) && (
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
            )}
          </button>
        </div>

        {/* Live Queue / Status Badge in tab bar */}
        {isQueuedOrRunning && (
          <div className="flex items-center gap-2 text-xs font-mono">
            {jobState?.status === 'QUEUED' ? (
              <span className="flex items-center gap-1.5 text-indigo-300 bg-indigo-950/60 border border-indigo-500/40 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                Queue: #{jobState.position || 1}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2.5 py-0.5 rounded-full">
                <span className="animate-spin text-[10px]">⚙</span>
                Running Case {jobState?.currentCase || 1} / {jobState?.totalCases || '?'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Console Body ── */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
        {/* TAB 1: Sample Test Cases */}
        {activeTab === 'cases' && (
          <div className="space-y-4">
            {sampleTestCases.length > 0 ? (
              <>
                {/* Horizontal Case Pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {sampleTestCases.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedCaseIndex(idx)}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                        selectedCaseIndex === idx
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      Case {idx + 1}
                    </button>
                  ))}
                </div>

                {/* Case Details */}
                {sampleTestCases[selectedCaseIndex] && (
                  <div className="space-y-3">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Input:</p>
                      <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-100 overflow-x-auto whitespace-pre-wrap">
                        {sampleTestCases[selectedCaseIndex].input}
                      </pre>
                    </div>

                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Expected Output:</p>
                      <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-indigo-300 overflow-x-auto whitespace-pre-wrap">
                        {sampleTestCases[selectedCaseIndex].output}
                      </pre>
                    </div>

                    {sampleTestCases[selectedCaseIndex].explanation && (
                      <div>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Explanation:</p>
                        <p className="p-2.5 bg-slate-950/60 rounded-lg text-slate-300 font-sans text-xs border border-slate-850">
                          {sampleTestCases[selectedCaseIndex].explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-slate-500 italic">No sample test cases provided for this problem.</p>
            )}
          </div>
        )}

        {/* TAB 2: Test Results */}
        {activeTab === 'results' && (
          <div className="space-y-4">
            {/* Live Queue / Running Banner */}
            {isQueuedOrRunning && (
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  jobState?.status === 'QUEUED'
                    ? 'bg-indigo-950/40 border-indigo-500/40 text-indigo-200'
                    : 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={jobState?.status === 'QUEUED' ? 'animate-pulse' : 'animate-spin'}>
                    {jobState?.status === 'QUEUED' ? '⏳' : '⚙'}
                  </span>
                  <div>
                    <p className="font-bold text-xs">
                      {jobState?.status === 'QUEUED' ? 'Waiting for execution' : 'Running your code'}
                    </p>
                    <p className="text-[11px] opacity-80">
                      {jobState?.status === 'QUEUED'
                        ? 'Your submission is queued in strict FIFO order.'
                        : `Executing test case ${jobState?.currentCase || 1} of ${jobState?.totalCases || '?'}`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold border bg-black/40 border-current font-mono">
                    {jobState?.status === 'QUEUED'
                      ? `Position: #${jobState.position || 1}`
                      : `Case ${jobState?.currentCase || 1}/${jobState?.totalCases || '?'}`}
                  </span>
                </div>
              </div>
            )}

            {/* Completed Result Summary */}
            {codeResult && (
              <>
                {/* Result Header Badge & Metrics */}
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-bold tracking-wide border ${
                        codeResult.status === 'ACCEPTED'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : codeResult.status === 'PARTIAL'
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                          : codeResult.status === 'TIME_LIMIT_EXCEEDED'
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                          : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                      }`}
                    >
                      {codeResult.status === 'ACCEPTED'
                        ? '✓ ACCEPTED'
                        : codeResult.status === 'PARTIAL'
                        ? '⚡ PARTIAL'
                        : codeResult.status === 'TIME_LIMIT_EXCEEDED'
                        ? '⏱ TIME LIMIT EXCEEDED'
                        : codeResult.status === 'COMPILATION_ERROR'
                        ? '✕ COMPILATION ERROR'
                        : codeResult.status || 'RESULT'}
                    </span>

                    {codeResult.passedCases !== undefined && codeResult.totalCases !== undefined && (
                      <span className="text-slate-300 font-semibold">
                        {codeResult.passedCases} / {codeResult.totalCases} Passed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-slate-400">
                    {codeResult.executionTimeMs !== undefined && (
                      <span>Time: {(codeResult.executionTimeMs / 1000).toFixed(2)}s</span>
                    )}
                    {codeResult.score !== undefined && codeResult.executionType !== 'RUN' && (
                      <span className="text-indigo-400 font-bold">Score: {codeResult.score} Marks</span>
                    )}
                  </div>
                </div>

                {/* Compilation Error Notice */}
                {codeResult.compilationError && (
                  <div className="p-3 bg-rose-950/30 border border-rose-700/50 rounded-xl">
                    <p className="text-rose-400 font-bold mb-1">Compilation Error:</p>
                    <pre className="p-2.5 bg-black/60 rounded text-[11px] text-rose-300 whitespace-pre-wrap overflow-x-auto">
                      {codeResult.compilationError}
                    </pre>
                  </div>
                )}

                {/* Public Test Case Results */}
                {codeResult.publicResults && codeResult.publicResults.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Public Test Cases
                    </p>
                    {codeResult.publicResults.map((r, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl border ${
                          r.passed
                            ? 'bg-emerald-950/20 border-emerald-800/40 text-emerald-300'
                            : 'bg-rose-950/20 border-rose-800/40 text-rose-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold flex items-center gap-1.5">
                            <span>{r.passed ? '✓' : '✕'}</span>
                            <span>Case {i + 1}</span>
                          </span>
                          {r.execTimeMs !== undefined && (
                            <span className="text-slate-400 text-[10px]">{r.execTimeMs}ms</span>
                          )}
                        </div>

                        {!r.passed && (
                          <div className="mt-2 space-y-1.5 text-slate-300 text-[11px]">
                            {r.input !== undefined && (
                              <p>
                                <span className="text-slate-400">Input:</span>{' '}
                                <code className="text-slate-100 bg-black/40 px-1 py-0.5 rounded">{r.input}</code>
                              </p>
                            )}
                            {r.expected !== undefined && (
                              <p>
                                <span className="text-slate-400">Expected:</span>{' '}
                                <code className="text-indigo-300 bg-black/40 px-1 py-0.5 rounded">{r.expected}</code>
                              </p>
                            )}
                            {r.actual !== undefined && (
                              <p>
                                <span className="text-slate-400">Your Output:</span>{' '}
                                <code className="text-rose-300 bg-black/40 px-1 py-0.5 rounded">{r.actual || '(empty)'}</code>
                              </p>
                            )}
                            {r.stderr && (
                              <pre className="text-rose-300 bg-black/50 p-2 rounded text-[10px] overflow-x-auto whitespace-pre-wrap mt-1">
                                {r.stderr}
                              </pre>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Hidden Test Case Masked Summary (Confidentiality Enforced) */}
                {codeResult.hiddenResultsSummary && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        Hidden Test Cases (Graded)
                      </p>
                      <span className="text-xs font-semibold text-slate-300">
                        {codeResult.hiddenResultsSummary.passed} / {codeResult.hiddenResultsSummary.total} Passed
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {codeResult.hiddenResultsSummary.details ? (
                        codeResult.hiddenResultsSummary.details.map((hd) => (
                          <div
                            key={hd.caseNumber}
                            className={`p-2 rounded-lg border text-center font-bold text-xs ${
                              hd.passed
                                ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                                : 'bg-rose-950/30 border-rose-800/50 text-rose-300'
                            }`}
                          >
                            <span>Hidden #{hd.caseNumber}: {hd.passed ? '✓' : '✕'}</span>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs">
                          Hidden test cases evaluated. Details remain confidential.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            {!hasResults && !isQueuedOrRunning && (
              <div className="text-center py-6 text-slate-500">
                <p>Submit Code to grade public and hidden test cases. Use Run Code for stdout.</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Output (Run Code) */}
        {activeTab === 'output' && (
          <div className="space-y-3">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Custom input (stdin)</p>
              <textarea
                value={customStdin}
                onChange={(e) => setCustomStdin(e.target.value)}
                disabled={isRunning}
                rows={4}
                className="w-full p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-100 text-xs font-mono resize-y"
                placeholder="Optional stdin for Run Code"
              />
            </div>
            {isQueuedOrRunning && jobState?.executionType === 'RUN' && (
              <p className="text-amber-300 text-xs">Running your code…</p>
            )}
            {codeResult?.compilationError && (
              <div>
                <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1">Compilation error</p>
                <pre className="p-3 bg-black/60 text-rose-300 rounded-xl border border-rose-700/50 whitespace-pre-wrap">
                  {codeResult.compilationError}
                </pre>
              </div>
            )}
            {(codeResult?.stdout != null || codeResult?.stderr || codeResult?.error) && !codeResult?.compilationError && (
              <>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Stdout</p>
                  <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-emerald-300 whitespace-pre-wrap min-h-[4rem]">
                    {codeResult.stdout || '(empty)'}
                  </pre>
                </div>
                {(codeResult.stderr || codeResult.error) && (
                  <div>
                    <p className="text-[11px] font-bold text-rose-400 uppercase tracking-wider mb-1">Stderr</p>
                    <pre className="p-3 bg-black/60 text-rose-300 rounded-xl border border-rose-700/50 whitespace-pre-wrap">
                      {codeResult.stderr || codeResult.error}
                    </pre>
                  </div>
                )}
              </>
            )}
            {!hasResults && !isQueuedOrRunning && (
              <p className="text-slate-500 italic">Run Code to see program output here. Submit Code grades hidden and public test cases.</p>
            )}
          </div>
        )}
      </div>

      {/* ── Action Bar (Run Code vs Submit Code) ── */}
      <div className="h-12 px-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
        <span className="text-[11px] text-slate-400 font-sans hidden sm:inline">
          {isRunning ? 'Processing in queue...' : 'Ctrl+Enter / Cmd+Enter to Run'}
        </span>

        <div className="flex items-center gap-2.5 ml-auto">
          {/* Secondary: ▶ Run Code */}
          <button
            type="button"
            onClick={() => onRunCode(customStdin)}
            disabled={isRunning}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-slate-100 font-semibold text-xs transition-all border border-slate-700 disabled:opacity-50 flex items-center gap-1.5"
            title="Run once and show stdout (does not grade test cases)"
          >
            <span>▶</span>
            <span>Run Code</span>
          </button>

          {/* Primary: ✓ Submit Code */}
          <button
            type="button"
            onClick={onSubmitCode}
            disabled={isRunning}
            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs transition-all shadow-sm shadow-emerald-950/40 disabled:opacity-50 flex items-center gap-1.5"
            title="Execute against all public and hidden test cases for final marks"
          >
            <span>✓</span>
            <span>Submit Code</span>
          </button>
        </div>
      </div>
    </div>
  )
}
