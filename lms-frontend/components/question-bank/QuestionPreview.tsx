'use client'
import React, { useState } from 'react'
import MarkdownRenderer from '@/components/editor/MarkdownRenderer'

interface QuestionPreviewProps {
    form: any
    onClose: () => void
}

export default function QuestionPreview({ form, onClose }: QuestionPreviewProps) {
    const [previewTab, setPreviewTab] = useState<'explanation' | 'problem' | 'testcases' | 'predefined'>('explanation')
    const [previewLang, setPreviewLang] = useState<string>('')
    const renderContent = () => {
        switch (form.type) {
            case 'MCQ':
                return (
                    <div className="space-y-6">
                        {form.problemStatement && (
                            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100 mb-6">
                                <h4 className="text-primary-600 text-[10px] font-bold uppercase mb-2 tracking-wider">Problem Statement</h4>
                                <MarkdownRenderer content={form.problemStatement} className="text-slate-700 text-sm" />
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
                                <MarkdownRenderer content={form.explanation} className="text-slate-600 text-sm" />
                            </div>
                        )}
                    </div>
                )


            case 'FIB':
                return (
                    <div className="space-y-6">

                        <div className="p-8 bg-gray-50 rounded-3xl border border-gray-100 shadow-inner">
                            <p className="text-slate-800 text-xl leading-relaxed whitespace-pre-wrap">
                                {((form.problemStatement || form.questionText) || '').split('[BLANK]').map((part: string, i: number, arr: any[]) => {
                                    // Remove trailing underscores from text before blank
                                    const cleanText = part.replace(/_+$/, '');
                                    return (
                                        <React.Fragment key={i}>
                                            {cleanText}
                                            {i < arr.length - 1 && (
                                                <span className="inline-block min-w-[120px] border-b-2 border-primary-500 mx-1 text-primary-600 px-2 font-black text-center whitespace-nowrap align-baseline">
                                                    {form.blanks?.[i] || ' ' }
                                                </span>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
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
                                <MarkdownRenderer content={form.explanation} className="text-slate-600 text-sm" />
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
                                <h4 className="text-primary-600 text-[10px] font-bold uppercase mb-2 tracking-wider">Problem Statement</h4>
                                <MarkdownRenderer content={form.problemStatement} className="text-slate-700 text-sm" />
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
                                <MarkdownRenderer content={form.explanation} className="text-slate-600 text-sm" />
                            </div>
                        )}
                    </div>
                )

            case 'JC':
                return (
                    <div className="space-y-6">
                        {form.problemStatement && (
                            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
                                <h4 className="text-primary-600 text-[10px] font-bold uppercase mb-2 tracking-wider">Problem Statement</h4>
                                <MarkdownRenderer content={form.problemStatement} className="text-slate-700 text-sm" />
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
                                <MarkdownRenderer content={form.explanation} className="text-slate-600 text-sm" />
                            </div>
                        )}
                    </div>
                )

            case 'PQ':
                return (
                    <div className="space-y-6">
                        {/* Tab Switcher */}
                        <div className="flex border-b border-gray-200 pb-3 gap-6">
                            <button
                                type="button"
                                onClick={() => setPreviewTab('explanation')}
                                className={`pb-2 text-sm font-semibold transition-all relative ${
                                    previewTab === 'explanation' ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                📖 Topic Explanation
                                {previewTab === 'explanation' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full animate-in fade-in" />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewTab('problem')}
                                className={`pb-2 text-sm font-semibold transition-all relative ${
                                    previewTab === 'problem' ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                💻 Problem Statement
                                {previewTab === 'problem' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full animate-in fade-in" />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewTab('testcases')}
                                className={`pb-2 text-sm font-semibold transition-all relative ${
                                    previewTab === 'testcases' ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                🧪 Test Cases
                                {previewTab === 'testcases' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full animate-in fade-in" />
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setPreviewTab('predefined')}
                                className={`pb-2 text-sm font-semibold transition-all relative ${
                                    previewTab === 'predefined' ? 'text-primary-600' : 'text-gray-400 hover:text-gray-600'
                                }`}
                            >
                                💻 Predefined Code
                                {previewTab === 'predefined' && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-600 rounded-full animate-in fade-in" />
                                )}
                            </button>
                        </div>

                        {previewTab === 'explanation' && (
                            <div className="bg-white p-8 rounded-2xl border-l-4 border-emerald-500 shadow-sm border-y border-r border-gray-100 animate-in fade-in duration-200">
                                <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <span className="text-2xl">📖</span> Pedagogical Explanation
                                </h3>
                                {form.explanation ? (
                                    <MarkdownRenderer content={form.explanation} className="text-slate-600 text-base leading-relaxed animate-in fade-in" />
                                ) : (
                                    <p className="text-gray-400 italic text-sm">No Topic Explanation provided yet.</p>
                                )}
                            </div>
                        )}

                        {previewTab === 'problem' && (
                            <div className="space-y-6 animate-in fade-in duration-200">
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
                                    <MarkdownRenderer content={form.problemStatement} className="text-slate-600 text-lg" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-6">
                                        {form.inputFormat && (
                                            <div>
                                                <h4 className="text-primary-600 text-xs font-bold uppercase mb-2">Input Format</h4>
                                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                    <MarkdownRenderer content={form.inputFormat} className="text-slate-700 text-sm" />
                                                </div>
                                            </div>
                                        )}
                                        {form.outputFormat && (
                                            <div>
                                                <h4 className="text-primary-600 text-xs font-bold uppercase mb-2">Output Format</h4>
                                                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                                                    <MarkdownRenderer content={form.outputFormat} className="text-slate-700 text-sm" />
                                                </div>
                                            </div>
                                        )}
                                        {form.constraints && (
                                            <div>
                                                <h4 className="text-primary-600 text-xs font-bold uppercase mb-2">Constraints</h4>
                                                <div className="p-5 bg-blue-50/50 rounded-2xl border border-blue-100 shadow-inner">
                                                    <MarkdownRenderer content={form.constraints} className="text-slate-700 text-sm" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {previewTab === 'testcases' && (
                            <div className="space-y-4 animate-in fade-in duration-200">
                                <h4 className="text-primary-600 text-xs font-bold uppercase mb-2">Sample Test Cases</h4>
                                <div className="space-y-4">
                                    {(form.testCases || [])
                                        .filter((tc: any) => !tc.isHidden)
                                        .slice(0, 5)
                                        .map((tc: any, i: number) => (
                                        <div key={i} className="p-4 bg-gray-50/50 rounded-xl border border-gray-100 space-y-3">
                                            <p className="text-[10px] text-gray-500 font-bold uppercase">Sample Case {i + 1}</p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[9px] text-gray-400 uppercase mb-1">Input</p>
                                                    <pre className="text-xs text-indigo-600 bg-white p-2 rounded-lg border border-gray-100 overflow-x-auto font-mono">{tc.input || '(empty)'}</pre>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] text-gray-400 uppercase mb-1">Output</p>
                                                    <pre className="text-xs text-emerald-600 bg-white p-2 rounded-lg border border-gray-100 overflow-x-auto font-mono">{tc.output || '(empty)'}</pre>
                                                </div>
                                            </div>
                                            {tc.explanation && (
                                                <p className="text-xs text-gray-500 italic mt-1 pb-1 border-t border-gray-100 pt-2">Explanation: {tc.explanation}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {previewTab === 'predefined' && (() => {
                            let snippetObj: Record<string, string> = {};
                            try {
                                if (form.codeSnippet) {
                                    const parsed = JSON.parse(form.codeSnippet);
                                    if (typeof parsed === 'object' && parsed !== null) {
                                        snippetObj = parsed;
                                    }
                                }
                            } catch (e) {
                                const mainLang = (form.allowedLanguages && form.allowedLanguages[0]) || 'Python';
                                snippetObj = { [mainLang]: form.codeSnippet || '' };
                            }

                            const langs = form.allowedLanguages || [];
                            const activeLang = previewLang || langs[0] || 'Python';
                            const code = snippetObj[activeLang] || '';

                            return (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="text-primary-600 text-xs font-bold uppercase">Predefined Starter Code</h4>
                                        {langs.length > 1 && (
                                            <div className="flex gap-2">
                                                {langs.map((l: string) => (
                                                    <button
                                                        key={l}
                                                        type="button"
                                                        onClick={() => setPreviewLang(l)}
                                                        className={`px-3 py-1 rounded-xl text-[10px] font-bold border transition-all ${
                                                            activeLang === l
                                                                ? 'bg-primary-500 border-primary-500 text-white shadow-md'
                                                                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                                        }`}
                                                    >
                                                        {l}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {langs.length === 0 ? (
                                        <p className="text-gray-400 italic text-sm">No Allowed Languages specified.</p>
                                    ) : code ? (
                                        <div className="bg-gray-950 p-6 rounded-2xl border border-white/10 font-mono overflow-hidden relative shadow-2xl space-y-3">
                                            <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-wider font-bold border-b border-white/5 pb-2 font-sans">
                                                <span>{activeLang} Boilerplate</span>
                                                <button
                                                    type="button"
                                                    onClick={() => navigator.clipboard.writeText(code)}
                                                    className="hover:text-white transition-colors"
                                                >
                                                    📋 Copy
                                                </button>
                                            </div>
                                            <pre className="text-emerald-400 text-sm whitespace-pre overflow-x-auto leading-relaxed">
                                                {code}
                                            </pre>
                                        </div>
                                    ) : (
                                        <p className="text-gray-400 italic text-sm">No predefined boilerplate code configured for {activeLang}.</p>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                )


            case 'OP':
                return (
                    <div className="space-y-6">
                        {form.problemStatement && (
                            <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100">
                                <h4 className="text-primary-600 text-[10px] font-bold uppercase mb-2 tracking-wider">Problem Statement</h4>
                                <MarkdownRenderer content={form.problemStatement} className="text-slate-700 text-sm" />
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
                                <MarkdownRenderer content={form.explanation} className="text-slate-600 text-sm" />
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

                    {form.description && (
                        <div className="bg-indigo-50/30 p-8 rounded-3xl border border-indigo-100/50 shadow-sm mb-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="text-6xl text-indigo-500/20">🧠</span>
                            </div>
                            <h4 className="text-indigo-600 text-[10px] font-black uppercase mb-4 tracking-[0.2em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                Topic Intelligence & Applications
                            </h4>
                            <div className="prose prose-indigo max-w-none">
                                <MarkdownRenderer content={form.description} className="text-slate-700 text-sm leading-relaxed" />
                            </div>
                        </div>
                    )}

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
