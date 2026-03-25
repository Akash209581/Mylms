'use client'
import React from 'react'

interface QuestionPreviewProps {
    form: any
    onClose: () => void
}

export default function QuestionPreview({ form, onClose }: QuestionPreviewProps) {
    const renderContent = () => {
        switch (form.type) {
            case 'MCQ':
                return (
                    <div className="space-y-6">
                        {form.problemStatement && (
                            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100 mb-6">
                                <h4 className="text-primary-600 text-[10px] font-bold uppercase mb-2 tracking-wider">Question Context</h4>
                                <div className="text-slate-700 font-mono text-sm whitespace-pre-wrap leading-relaxed">{form.problemStatement}</div>
                            </div>
                        )}
                        <div className="grid gap-4">
                            <h4 className="text-gray-400 text-[10px] font-bold uppercase mb-2 tracking-[0.2em]">Select Correct Option</h4>
                            {(form.options || []).map((opt: string, i: number) => opt && (
                                <div key={i} className={`p-5 rounded-2xl border-2 transition-all ${form.correctAnswer === opt
                                    ? 'bg-primary-50 border-primary-500 text-slate-900 shadow-sm'
                                    : 'bg-white border-gray-100 text-slate-500 hover:border-gray-200'
                                    }`}>
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center text-sm font-bold ${form.correctAnswer === opt ? 'border-primary-500 bg-primary-500 text-white' : 'border-gray-200'
                                            }`}>
                                            {String.fromCharCode(65 + i)}
                                        </div>
                                        <span className="font-medium">{opt}</span>
                                        {form.correctAnswer === opt && <span className="ml-auto text-[10px] font-bold bg-primary-500 text-white px-3 py-1 rounded-full uppercase tracking-wider">Correct</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {form.explanation && (
                            <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
                                <h4 className="text-emerald-700 text-[10px] font-bold uppercase mb-2 tracking-wider">Explanation</h4>
                                <p className="text-slate-600 text-sm leading-relaxed">{form.explanation}</p>
                            </div>
                        )}
                    </div>
                )


            case 'FIB':
                return (
                    <div className="space-y-6">
                        {form.problemStatement && (
                            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
                                <h4 className="text-primary-600 text-[10px] font-bold uppercase mb-2 tracking-wider">Question Context</h4>
                                <div className="text-slate-700 font-mono text-sm whitespace-pre-wrap leading-relaxed">{form.problemStatement}</div>
                            </div>
                        )}

                        <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100 shadow-inner">
                            <p className="text-slate-800 text-xl leading-relaxed whitespace-pre-wrap">
                                {((form.problemStatement || form.questionText) || '').split('[BLANK]').map((part: string, i: number, arr: any[]) => (
                                    <React.Fragment key={i}>
                                        {part}
                                        {i < arr.length - 1 && (
                                            <span className="inline-block min-w-[140px] border-b-3 border-primary-500 mx-2 text-primary-600 text-center font-black bg-white/50 px-2">
                                                {form.blanks?.[i] || '__________'}
                                            </span>
                                        )}
                                    </React.Fragment>
                                ))}
                            </p>
                        </div>

                        <div className="bg-primary-50 p-5 rounded-2xl border border-primary-100">
                            <p className="text-xs text-primary-700 font-bold uppercase tracking-wider mb-3">Internal Validation Answer Key</p>
                            <div className="flex flex-wrap gap-2.5">
                                {(form.blanks || []).map((b: string, i: number) => (
                                    <span key={i} className="px-4 py-1.5 bg-white text-primary-600 rounded-xl text-sm font-bold border border-primary-200 shadow-sm">
                                        {i + 1}: {b}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {form.explanation && (
                            <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
                                <h4 className="text-emerald-700 text-[10px] font-bold uppercase mb-2 tracking-wider">Explanation</h4>
                                <p className="text-slate-600 text-sm leading-relaxed">{form.explanation}</p>
                            </div>
                        )}
                    </div>
                )

            case 'MQ':
                // Combine all right side items (correct matches + distractors)
                const allRights = [
                    ...(form.matchingPairs || []).map((p: any) => p.right),
                    ...(form.extraRightMatches || [])
                ].filter(Boolean);

                // Robust Shuffle (Fisher-Yates)
                const shuffledRights = [...allRights];
                for (let i = shuffledRights.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffledRights[i], shuffledRights[j]] = [shuffledRights[j], shuffledRights[i]];
                }

                return (
                    <div className="space-y-6">
                        {form.problemStatement && (
                            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
                                <h4 className="text-primary-600 text-[10px] font-bold uppercase mb-2 tracking-wider">Question Context</h4>
                                <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">{form.problemStatement}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-4">
                                <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 px-2">Column A</h4>
                                {(form.matchingPairs || []).map((p: any, i: number) => (
                                    <div key={i} className="p-5 bg-white border border-gray-100 rounded-2xl text-slate-800 flex items-center gap-4 shadow-sm hover:border-primary-200 transition-all">
                                        <span className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">{i + 1}</span>
                                        <span className="font-medium whitespace-pre-wrap">{p.left}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-4">
                                <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 px-2">Column B</h4>
                                {shuffledRights.map((r: string, i: number) => (
                                    <div key={i} className="p-5 bg-white border border-gray-100 rounded-2xl text-slate-800 flex items-center gap-4 shadow-sm hover:border-primary-200 transition-all">
                                        <span className="w-8 h-8 bg-gray-50 rounded-xl flex items-center justify-center text-xs font-bold text-slate-500 shrink-0">{String.fromCharCode(65 + i)}</span>
                                        <span className="font-medium whitespace-pre-wrap">{r}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {form.explanation && (
                            <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
                                <h4 className="text-emerald-700 text-[10px] font-bold uppercase mb-2 tracking-wider">Explanation</h4>
                                <p className="text-slate-600 text-sm leading-relaxed">{form.explanation}</p>
                            </div>
                        )}
                    </div>
                )

            case 'JC':
                return (
                    <div className="space-y-6">
                        {form.problemStatement && (
                            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
                                <h4 className="text-primary-600 text-[10px] font-bold uppercase mb-2 tracking-wider">Question Context</h4>
                                <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">{form.problemStatement}</p>
                            </div>
                        )}

                        <div className="bg-slate-50 p-8 rounded-2xl border border-gray-200 font-mono shadow-inner">
                            <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-6">Correct Arrangement</h4>
                            <div className="space-y-3">
                                {(form.jumbledStatements || []).map((s: string, i: number) => (
                                    <div key={i} className="flex gap-4 items-start group">
                                        <div className="mt-1 w-6 h-6 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</div>
                                        <span className="text-slate-700 text-sm whitespace-pre-wrap pt-1">{s}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {form.correctCode && (
                            <div className="bg-gray-900 p-6 rounded-2xl border border-white/10 font-mono">
                                <h4 className="text-gray-500 text-[10px] font-bold uppercase mb-4 tracking-widest">Full Correct Code</h4>
                                <pre className="text-emerald-400 text-xs whitespace-pre-wrap">{form.correctCode}</pre>
                            </div>
                        )}

                        {form.explanation && (
                            <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
                                <h4 className="text-emerald-700 text-[10px] font-bold uppercase mb-2 tracking-wider">Explanation</h4>
                                <p className="text-slate-600 text-sm leading-relaxed">{form.explanation}</p>
                            </div>
                        )}
                    </div>
                )

            case 'PQ':
                return (
                    <div className="space-y-6">
                        <div className="bg-white p-8 rounded-2xl border-l-4 border-primary-500 shadow-sm border-y border-r border-gray-100">
                            <div className="flex justify-between items-start gap-4 mb-4">
                                <h3 className="text-2xl font-bold text-slate-900 mb-2">Problem Statement</h3>

                                <div className="flex flex-wrap gap-1.5 justify-end">
                                    {(form.allowedLanguages || []).map((lang: string) => (
                                        <span key={lang} className="px-3 py-1 rounded-full bg-primary-50 text-primary-600 border border-primary-100 text-[10px] font-bold uppercase tracking-wider">
                                            {lang}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <p className="text-slate-600 whitespace-pre-wrap leading-relaxed text-lg">{form.problemStatement}</p>
                        </div>


                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-primary-600 text-xs font-bold uppercase mb-2">Input Format</h4>
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-slate-700 text-sm font-mono whitespace-pre-wrap">{form.inputFormat}</div>
                                </div>
                                <div>
                                    <h4 className="text-primary-600 text-xs font-bold uppercase mb-2">Output Format</h4>
                                    <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 text-slate-700 text-sm font-mono whitespace-pre-wrap">{form.outputFormat}</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-primary-600 text-xs font-bold uppercase mb-2">Constraints</h4>
                                    <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 text-slate-700 text-sm font-mono whitespace-pre-wrap min-h-[220px] shadow-inner leading-relaxed">{form.constraints}</div>
                                </div>

                                <div>
                                    <h4 className="text-primary-600 text-xs font-bold uppercase mb-2">Sample Test Cases</h4>
                                    <div className="space-y-4">
                                        {(form.testCases || []).slice(0, 3).map((tc: any, i: number) => (
                                            <div key={i} className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 space-y-3">
                                                <p className="text-[10px] text-gray-500 font-bold uppercase">Sample Case {i + 1}</p>
                                                <div className="grid grid-cols-1 gap-2">
                                                    <div>
                                                        <p className="text-[9px] text-gray-400 uppercase mb-1">Input</p>
                                                        <pre className="text-xs text-indigo-600 bg-white p-2 rounded-lg border border-gray-100 overflow-x-auto">{tc.input}</pre>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-gray-400 uppercase mb-1">Output</p>
                                                        <pre className="text-xs text-emerald-600 bg-white p-2 rounded-lg border border-gray-100 overflow-x-auto">{tc.output}</pre>
                                                    </div>
                                                </div>
                                                {tc.explanation && (
                                                    <p className="text-xs text-gray-500 italic mt-1 pb-1 border-b border-gray-100">Note: {tc.explanation}</p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        </div>
                    </div>
                )


            case 'OP':
                return (
                    <div className="space-y-6">
                        {form.problemStatement && (
                            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
                                <h4 className="text-primary-600 text-[10px] font-bold uppercase mb-2 tracking-wider">Question Context</h4>
                                <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">{form.problemStatement}</p>
                            </div>
                        )}

                        <div className="bg-gray-950 p-6 rounded-2xl border border-white/10 font-mono overflow-hidden relative shadow-2xl">
                            <pre className="text-blue-300 text-sm whitespace-pre-wrap leading-relaxed">
                                {form.codeSnippet}
                            </pre>
                        </div>


                        {form.options && form.options.some((o: any) => o) && (
                            <div className="grid gap-3">
                                <h4 className="text-primary-600 text-xs font-bold uppercase mb-2">Options</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(form.options || []).map((opt: string, i: number) => opt && (
                                        <div key={i} className={`p-4 rounded-xl border-2 transition-all ${form.expectedOutput === opt
                                            ? 'bg-primary-50 border-primary-500 text-slate-900 shadow-sm'
                                            : 'bg-white border-gray-100 text-slate-500 hover:border-gray-200'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center text-xs font-bold ${form.expectedOutput === opt ? 'border-primary-500 bg-primary-500 text-white' : 'border-gray-100'
                                                    }`}>
                                                    {String.fromCharCode(65 + i)}
                                                </div>
                                                <span className="text-sm font-mono font-medium">{opt}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}


                        <div className="p-4 bg-primary-500/5 border border-primary-500/20 rounded-xl">
                            <h4 className="text-primary-600 text-[10px] font-bold uppercase mb-1">Expected Output (Validation)</h4>
                            <p className="text-slate-900 font-mono">{form.expectedOutput}</p>
                        </div>

                        {form.explanation && (
                            <div className="bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100">
                                <h4 className="text-emerald-700 text-[10px] font-bold uppercase mb-2 tracking-wider">Explanation</h4>
                                <p className="text-slate-600 text-sm leading-relaxed">{form.explanation}</p>
                            </div>
                        )}

                    </div>

                )

            default:
                return <p className="text-gray-400">Preview not available for this type.</p>
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-gray-200 rounded-2xl relative">
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                            <span>👀</span> Question Preview
                        </h2>
                        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest">
                            How this question appears to applicants
                        </p>
                    </div>
                    <button onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-900 hover:bg-gray-100 transition-all text-2xl">
                        &times;
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-8 overflow-y-auto flex-1 min-h-0">
                    <div className="mb-8 pb-6 border-b border-gray-100">
                        <p className="text-[10px] text-primary-500 font-bold uppercase tracking-[0.2em] mb-2">Question Title</p>
                        <h1 className="text-2xl font-black text-slate-900 leading-tight">
                            {form.questionText || "Untitled Question"}
                        </h1>
                    </div>
                    {renderContent()}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
                    <button onClick={onClose}
                        className="px-6 py-2.5 rounded-xl bg-white hover:bg-gray-50 text-slate-700 text-sm font-semibold transition-all border border-gray-200 shadow-sm">
                        Close Preview
                    </button>
                    <button onClick={onClose}
                        className="btn-primary px-8 py-2.5 text-sm">
                        Confirm & Continue
                    </button>
                </div>
            </div>
        </div>

    )
}
