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
                    <div className="space-y-4">
                        <p className="text-white text-lg font-medium mb-6">{form.questionText}</p>
                        <div className="grid gap-3">
                            {(form.options || []).map((opt: string, i: number) => opt && (
                                <div key={i} className={`p-4 rounded-xl border transition-all ${form.correctAnswer === opt
                                    ? 'bg-primary-500/10 border-primary-500 text-white'
                                    : 'bg-white/5 border-white/10 text-gray-400'
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${form.correctAnswer === opt ? 'border-primary-500 text-primary-500' : 'border-gray-600'
                                            }`}>
                                            {String.fromCharCode(65 + i)}
                                        </div>
                                        <span>{opt}</span>
                                        {form.correctAnswer === opt && <span className="ml-auto text-xs bg-primary-500 text-white px-2 py-0.5 rounded-full">Correct Answer</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )

            case 'FIB':
                return (
                    <div className="space-y-6">
                        <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                            <p className="text-white text-lg leading-relaxed">
                                {(form.questionText || '').split('[BLANK]').map((part: string, i: number, arr: any[]) => (
                                    <React.Fragment key={i}>
                                        {part}
                                        {i < arr.length - 1 && (
                                            <span className="inline-block min-w-[120px] border-b-2 border-primary-500 mx-2 text-primary-400 text-center font-bold">
                                                {form.blanks?.[i] || '_______'}
                                            </span>
                                        )}
                                    </React.Fragment>
                                ))}
                            </p>
                        </div>
                        <div className="bg-primary-500/5 p-4 rounded-xl border border-primary-500/20">
                            <p className="text-xs text-primary-400 font-bold uppercase tracking-wider mb-2">Internal Validation Answer Key</p>
                            <div className="flex flex-wrap gap-2">
                                {(form.blanks || []).map((b: string, i: number) => (
                                    <span key={i} className="px-3 py-1 bg-primary-500/20 text-primary-300 rounded-lg text-sm border border-primary-500/30">
                                        {i + 1}: {b}
                                    </span>
                                ))}
                            </div>
                        </div>
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
                        <p className="text-white text-lg font-medium">{form.questionText}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">Column A</h4>
                                {(form.matchingPairs || []).map((p: any, i: number) => (
                                    <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl text-white flex items-center gap-3">
                                        <span className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-xs text-gray-400">{i + 1}</span>
                                        {p.left}
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-3">
                                <h4 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4">Column B</h4>
                                {shuffledRights.map((r: string, i: number) => (
                                    <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl text-white flex items-center gap-3">
                                        <span className="w-6 h-6 bg-white/10 rounded flex items-center justify-center text-xs text-gray-400">{String.fromCharCode(65 + i)}</span>
                                        {r}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )

            case 'JC':
                return (
                    <div className="space-y-6">
                        <p className="text-white text-lg font-medium mb-4">{form.questionText}</p>
                        <div className="bg-gray-900/50 p-6 rounded-2xl border border-white/10 font-mono">
                            <h4 className="text-gray-500 text-xs font-bold uppercase tracking-widest mb-6">Correct Arrangement</h4>
                            <div className="space-y-2">
                                {(form.jumbledStatements || []).map((s: string, i: number) => (
                                    <div key={i} className="flex gap-4 items-start group">
                                        <div className="mt-1.5 w-2 h-2 rounded-full bg-primary-500/50 group-hover:bg-primary-500 transition-colors" />
                                        <span className="text-blue-300 text-sm whitespace-pre-wrap">{s}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )

            case 'PQ':
                return (
                    <div className="space-y-6">
                        <div className="glass-card p-6 border-l-4 border-primary-500">
                            <div className="flex justify-between items-start gap-4 mb-4">
                                <h3 className="text-2xl font-bold text-white mb-2">{form.topicNames} Challenge</h3>
                                <div className="flex flex-wrap gap-1.5 justify-end">
                                    {(form.allowedLanguages || []).map((lang: string) => (
                                        <span key={lang} className="px-2 py-0.5 rounded bg-primary-500/10 border border-primary-500/20 text-primary-400 text-[9px] font-bold uppercase tracking-wider">
                                            {lang}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <p className="text-gray-300 whitespace-pre-wrap leading-relaxed">{form.problemStatement}</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-primary-400 text-xs font-bold uppercase mb-2">Input Format</h4>
                                    <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-gray-300 text-sm font-mono whitespace-pre-wrap">{form.inputFormat}</div>
                                </div>
                                <div>
                                    <h4 className="text-primary-400 text-xs font-bold uppercase mb-2">Output Format</h4>
                                    <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-gray-300 text-sm font-mono whitespace-pre-wrap">{form.outputFormat}</div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-primary-400 text-xs font-bold uppercase mb-2">Constraints</h4>
                                    <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-gray-300 text-sm font-mono whitespace-pre-wrap">{form.constraints}</div>
                                </div>
                                <div>
                                    <h4 className="text-primary-400 text-xs font-bold uppercase mb-2">Sample Test Cases</h4>
                                    {(form.testCases || []).map((tc: any, i: number) => i === 0 && (
                                        <div key={i} className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-2">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase">Sample Input</p>
                                            <pre className="text-xs text-blue-300 bg-black/30 p-2 rounded">{tc.input}</pre>
                                            <p className="text-[10px] text-gray-500 font-bold uppercase mt-2">Sample Output</p>
                                            <pre className="text-xs text-green-300 bg-black/30 p-2 rounded">{tc.output}</pre>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )

            case 'OP':
                return (
                    <div className="space-y-6">
                        <p className="text-white text-lg font-medium">{form.questionText}</p>
                        <div className="bg-gray-950 p-6 rounded-2xl border border-white/10 font-mono overflow-hidden relative shadow-2xl">
                            <div className="absolute top-0 left-0 right-0 h-8 bg-white/5 flex items-center px-4 gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                                <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                                <span className="text-[10px] text-gray-500 ml-2 font-sans tracking-widest uppercase">main.code</span>
                            </div>
                            <pre className="text-blue-300 text-sm pt-6 whitespace-pre-wrap">
                                {form.codeSnippet}
                            </pre>
                        </div>

                        {form.options && form.options.some((o: any) => o) && (
                            <div className="grid gap-3">
                                <h4 className="text-primary-400 text-xs font-bold uppercase mb-2">Options</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {(form.options || []).map((opt: string, i: number) => opt && (
                                        <div key={i} className={`p-4 rounded-xl border transition-all ${form.expectedOutput === opt
                                            ? 'bg-primary-500/10 border-primary-500 text-white'
                                            : 'bg-white/5 border-white/10 text-gray-400'
                                            }`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold ${form.expectedOutput === opt ? 'border-primary-500 text-primary-500' : 'border-gray-600'
                                                    }`}>
                                                    {String.fromCharCode(65 + i)}
                                                </div>
                                                <span className="text-sm font-mono">{opt}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="p-4 bg-primary-500/10 border border-primary-500/30 rounded-xl">
                            <h4 className="text-primary-400 text-[10px] font-bold uppercase mb-1">Expected Output (Validation)</h4>
                            <p className="text-white font-mono">{form.expectedOutput}</p>
                        </div>
                    </div>
                )

            default:
                return <p className="text-gray-400">Preview not available for this type.</p>
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="glass-card w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border-primary-500/20">
                {/* Modal Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <span>👀</span> Question Preview
                        </h2>
                        <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest">
                            How this question appears to applicants
                        </p>
                    </div>
                    <button onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all text-2xl">
                        &times;
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-8 overflow-y-auto flex-1 custom-scrollbar bg-mesh bg-fixed">
                    {renderContent()}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
                    <button onClick={onClose}
                        className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-semibold transition-all border border-white/10">
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
