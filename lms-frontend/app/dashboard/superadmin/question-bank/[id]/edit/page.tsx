'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import QuestionPreview from '@/components/question-bank/QuestionPreview'

const TOPICS = ['Arrays', 'Strings', 'Linked List', 'Trees', 'Graphs', 'Dynamic Programming', 'Sorting', 'Searching', 'Recursion', 'OOP', 'DBMS', 'OS', 'CN', 'Other']
const COMPANIES = ['Accenture', 'CapGemini', 'Infosys', 'TCS', 'Wipro', 'Amazon', 'Google', 'Microsoft', 'Adobe', 'Flipkart', 'Other']
const LANGUAGES = ['Python', 'Java', 'C', 'C++', 'JavaScript', 'Any']
const DIFFICULTIES = ['VERY_EASY', 'EASY', 'MEDIUM', 'HARD', 'VERY_HARD']

const QUESTION_TYPES = [
    { key: 'MCQ', label: 'MCQ', icon: '🔘', desc: 'Multiple Choice — 4 options, 1 correct' },
    { key: 'FIB', label: 'Fill In Blank', icon: '✏️', desc: 'Statement with blanks to fill' },
    { key: 'MQ', label: 'Matching', icon: '🔗', desc: 'Match left items with right items' },
    { key: 'JC', label: 'Jumbled Code', icon: '🔀', desc: 'Re-arrange jumbled statements in correct order' },
    { key: 'PQ', label: 'Programming', icon: '💻', desc: 'Full coding problem with test cases' },
    { key: 'OP', label: 'Output Prediction', icon: '🎯', desc: 'Given code snippet, predict the output' },
]

export default function EditQuestionPage({ params }: { params: { id: string } }) {
    const id = params.id
    const router = useRouter()
    const [step, setStep] = useState(2)
    const [form, setForm] = useState<any>({
        type: '', topicNames: '', difficulty: 'MEDIUM', companiesAppeared: '',
        programmingLanguage: '', recentYearAppearing: new Date().getFullYear(),
        bestPracticeFor: '', questionText: '',
        options: ['', '', '', ''], correctAnswer: '',
        blanks: [''],
        matchingPairs: [{ left: '', right: '' }],
        extraRightMatches: [''],
        jumbledStatements: [''],
        problemStatement: '', inputFormat: '', outputFormat: '', constraints: '',
        testCases: [{ input: '', output: '', explanation: '' }],
        codeSnippet: '', expectedOutput: '',
        allowedLanguages: ['Python'],
    })
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN' && u.role !== 'ADMIN') { router.push('/login'); return }

        // Fetch question data
        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/question-bank/${id}`, { credentials: 'include' })
            .then(res => {
                if (!res.ok) throw new Error('Question not found')
                return res.json()
            })
            .then(data => {
                // Merge data into form, ensuring arrays are properly handled
                setForm((prev: any) => {
                    const merged = {
                        ...prev,
                        ...data,
                        options: data.options || prev.options,
                        blanks: data.blanks || prev.blanks,
                        matchingPairs: data.matchingPairs || prev.matchingPairs,
                        extraRightMatches: data.extraRightMatches || prev.extraRightMatches || [''],
                        jumbledStatements: data.jumbledStatements || prev.jumbledStatements,
                        testCases: data.testCases || prev.testCases,
                        allowedLanguages: data.allowedLanguages || prev.allowedLanguages || ['Python'],
                    };

                    // Sync common fields for UI consistency
                    if (data.type === 'MCQ' || data.type === 'OP') {
                        const correctVal = data.expectedOutput || data.correctAnswer;
                        if (correctVal) {
                            merged.correctAnswer = correctVal;
                            merged.expectedOutput = correctVal;
                        }
                    }
                    return merged;
                })
            })
            .catch(err => setError(err.message))
            .finally(() => setLoading(false))
    }, [id])

    const set = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }))

    const handleSubmit = async () => {
        setSaving(true); setError('')
        try {
            // Only send fields that the API expects - exclude system fields and UI-only state like opMode
            const { id: _, questionNumber, createdAt, updatedAt, isActive, opMode, question_number, created_at, updated_at, ...submitData } = form;

            // Normalize Matching Pairs
            if (submitData.type === 'MQ' && submitData.matchingPairs) {
                submitData.matchingPairs = submitData.matchingPairs.map((p: any) => ({
                    left: p.left || '',
                    right: p.right || (p.rights && p.rights[0]) || ''
                }));
            }

            // Cleanup: remove empty/irrelevant fields to be super safe
            if (submitData.type !== 'MQ') delete (submitData as any).matchingPairs;
            if (submitData.type !== 'FIB') delete (submitData as any).blanks;
            if (submitData.type !== 'MCQ' && submitData.type !== 'OP') delete (submitData as any).options;
            if (submitData.type !== 'JC') delete (submitData as any).jumbledStatements;
            if (submitData.type !== 'PQ') delete (submitData as any).testCases;
            if (submitData.type !== 'OP' && submitData.type !== 'PQ') {
                delete (submitData as any).codeSnippet;
                delete (submitData as any).expectedOutput;
            }

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/question-bank/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(submitData),
            })
            if (!res.ok) { const e = await res.json(); setError(e.message || 'Error saving'); return }
            router.push('/dashboard/superadmin/question-bank')
        } catch (e: any) { setError(e.message) }
        finally { setSaving(false) }
    }

    if (loading) return (
        <div className="min-h-screen bg-mesh flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="SUPERADMIN" />
            <Navbar title="Edit Question" />
            <main className="page-content">
                <div className="flex items-center gap-3 mb-8">
                    <button onClick={() => router.push('/dashboard/superadmin/question-bank')}
                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[var(--bg-surface)]/10 transition-all">
                        ← Back
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Edit Question</h1>
                        <p className="text-gray-400 text-sm">Update the question details for <span className="text-primary-400 font-mono">{form.questionNumber}</span></p>
                    </div>
                </div>

                {error && (
                    <div className="glass-card p-4 mb-6 border border-red-500/30 bg-red-500/10">
                        <p className="text-red-400 text-sm">❌ {error}</p>
                    </div>
                )}

                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold text-white mb-5">Question Details
                            <span className="text-primary-400 ml-2 text-sm">({form.type})</span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Topic Name *</label>
                                <select value={form.topicNames} onChange={e => set('topicNames', e.target.value)} className="input-field">
                                    <option value="">Select Topic</option>
                                    {TOPICS.map(t => <option key={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Difficulty Level *</label>
                                <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)} className="input-field">
                                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Companies Appeared</label>
                                <input value={form.companiesAppeared} onChange={e => set('companiesAppeared', e.target.value)}
                                    placeholder="Accenture, CapGemini..." className="input-field" />
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Programming Language</label>
                                <select value={form.programmingLanguage} onChange={e => set('programmingLanguage', e.target.value)} className="input-field">
                                    <option value="">Any</option>
                                    {LANGUAGES.map(l => <option key={l}>{l}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Recent Year of Appearing</label>
                                <input type="number" value={form.recentYearAppearing} onChange={e => set('recentYearAppearing', +e.target.value)}
                                    className="input-field" min="2015" max="2030" />
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Best Practice For</label>
                                <input value={form.bestPracticeFor} onChange={e => set('bestPracticeFor', e.target.value)}
                                    placeholder="e.g. Service/Product Company" className="input-field" />
                            </div>
                        </div>

                        <div className="mt-4">
                            <label className="text-gray-400 text-sm mb-2 block">Question Text *</label>
                            <textarea value={form.questionText} onChange={e => set('questionText', e.target.value)}
                                rows={5} placeholder="Enter the question..." className="input-field" />

                        </div>
                    </div>

                    {/* Type specific inputs (MCQ, FIB, etc.) - Simplified same as Create page */}
                    {form.type === 'MCQ' && (
                        <div className="glass-card p-6">
                            <h3 className="text-white font-semibold mb-4">🔘 MCQ Options</h3>
                            <div className="space-y-3 mb-4">
                                {form.options.map((opt: string, i: number) => (
                                    <div key={i} className="flex gap-3 items-center">
                                        <span className="text-gray-400 text-sm w-6">{String.fromCharCode(65 + i)}.</span>
                                        <input value={opt} onChange={e => { const o = [...form.options]; o[i] = e.target.value; set('options', o) }}
                                            placeholder={`Option ${String.fromCharCode(65 + i)}`} className="input-field flex-1" />
                                    </div>
                                ))}
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Correct Answer</label>
                                <select value={form.correctAnswer} onChange={e => {
                                    set('correctAnswer', e.target.value);
                                    if (form.type === 'MCQ') set('expectedOutput', e.target.value);
                                }} className="input-field max-w-xs">
                                    <option value="">Select correct option</option>
                                    {form.options.map((o: string, i: number) => o && <option key={i} value={o}>{String.fromCharCode(65 + i)}. {o}</option>)}
                                </select>
                            </div>
                        </div>
                    )}

                    {form.type === 'FIB' && (
                        <div className="glass-card p-6">
                            <h3 className="text-white font-semibold mb-4">✏️ Blank Answers</h3>
                            {form.blanks.map((b: string, i: number) => (
                                <div key={i} className="flex gap-3 mb-3">
                                    <span className="text-gray-400 text-sm w-16">Blank {i + 1}:</span>
                                    <input value={b} onChange={e => { const bl = [...form.blanks]; bl[i] = e.target.value; set('blanks', bl) }}
                                        placeholder="Answer for this blank" className="input-field flex-1" />
                                </div>
                            ))}
                            <button onClick={() => set('blanks', [...form.blanks, ''])}
                                className="btn-secondary px-4 py-2 text-sm mt-2">+ Add Blank</button>
                        </div>
                    )}

                    {form.type === 'MQ' && (
                        <div className="glass-card p-6">
                            <h3 className="text-white font-semibold mb-4">🔗 Matching Pairs</h3>
                            {form.matchingPairs.map((p: any, i: number) => (
                                <div key={i} className="flex gap-3 mb-3 items-center">
                                    <input value={p.left} onChange={e => { const mp = [...form.matchingPairs]; mp[i].left = e.target.value; set('matchingPairs', mp) }}
                                        placeholder="Left item" className="input-field flex-1" />
                                    <span className="text-primary-400">↔️</span>
                                    <input value={p.right} onChange={e => { const mp = [...form.matchingPairs]; mp[i].right = e.target.value; set('matchingPairs', mp) }}
                                        placeholder="Right match" className="input-field flex-1" />
                                </div>
                            ))}
                            <button onClick={() => set('matchingPairs', [...form.matchingPairs, { left: '', right: '' }])}
                                className="btn-secondary px-4 py-2 text-sm">+ Add Pair</button>

                            <div className="mt-8 pt-6 border-t border-white/10">
                                <h4 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Extra Right Matches (Distractors)</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                    {(form.extraRightMatches || []).map((m: string, i: number) => (
                                        <div key={i} className="flex gap-2 items-center">
                                            <input value={m} onChange={e => {
                                                const em = [...form.extraRightMatches];
                                                em[i] = e.target.value;
                                                set('extraRightMatches', em);
                                            }} placeholder="Unrelated right match..." className="input-field flex-1 text-sm bg-[var(--bg-surface)]/5" />
                                            <button onClick={() => set('extraRightMatches', form.extraRightMatches.filter((_: any, idx: number) => idx !== i))}
                                                className="text-red-400 hover:text-red-500 p-1">×</button>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => set('extraRightMatches', [...(form.extraRightMatches || []), ''])}
                                    className="px-4 py-2 rounded-xl bg-indigo-500/10 text-indigo-400 text-xs font-bold border border-indigo-500/20 hover:bg-indigo-500 hover:text-white transition-all">
                                    + Add Right Match (Distractor)
                                </button>
                            </div>
                        </div>
                    )}

                    {form.type === 'JC' && (
                        <div className="glass-card p-6">
                            <h3 className="text-white font-semibold mb-2">🔀 Jumbled Statements</h3>
                            {form.jumbledStatements.map((s: string, i: number) => (
                                <div key={i} className="flex gap-3 mb-3">
                                    <span className="text-gray-400 text-sm w-6">{i + 1}.</span>
                                    <input value={s} onChange={e => { const js = [...form.jumbledStatements]; js[i] = e.target.value; set('jumbledStatements', js) }}
                                        placeholder={`Statement ${i + 1}`} className="input-field flex-1 font-mono text-sm" />
                                </div>
                            ))}
                            <button onClick={() => set('jumbledStatements', [...form.jumbledStatements, ''])}
                                className="btn-secondary px-4 py-2 text-sm">+ Add Statement</button>
                        </div>
                    )}

                    {form.type === 'PQ' && (
                        <div className="glass-card p-6 space-y-4">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-4">
                                    <h3 className="text-white font-semibold">💻 Programming Problem</h3>
                                    <div className="flex gap-2 border-l border-white/10 pl-4">
                                        <button onClick={() => set('allowedLanguages', LANGUAGES.filter(l => l !== 'Any'))}
                                            className="text-[9px] font-bold text-primary-400 hover:text-primary-300 uppercase tracking-wider">Select All</button>
                                        <button onClick={() => set('allowedLanguages', [])}
                                            className="text-[9px] font-bold text-[var(--text-secondary)] hover:text-gray-400 uppercase tracking-wider">Clear</button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {LANGUAGES.filter(l => l !== 'Any').map(lang => (
                                        <button key={lang} onClick={() => {
                                            const current = form.allowedLanguages || [];
                                            const next = current.includes(lang) ? current.filter((l: string) => l !== lang) : [...current, lang];
                                            set('allowedLanguages', next);
                                        }} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${form.allowedLanguages?.includes(lang) ? 'bg-primary-500 border-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-[var(--bg-surface)]/5 border-white/10 text-gray-400 hover:border-white/30'}`}>
                                            {lang}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {[
                                ['problemStatement', 'Problem Statement', 8],
                                ['inputFormat', 'Input Format', 4],
                                ['outputFormat', 'Output Format', 4],
                                ['constraints', 'Constraints', 10],
                            ].map(([key, label, rows]: any) => (

                                <div key={key}>
                                    <label className="text-gray-400 text-sm mb-2 block">{label}</label>
                                    <textarea value={form[key]} onChange={e => set(key, e.target.value)}
                                        rows={rows} placeholder={label} className="input-field font-mono text-sm" />

                                </div>
                            ))}
                            <div>
                                <label className="text-gray-400 text-sm mb-3 block">Test Cases</label>
                                {form.testCases.map((tc: any, i: number) => (
                                    <div key={i} className="p-4 rounded-xl mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                        <div className="flex justify-between mb-2">
                                            <p className="text-gray-400 text-xs">Test Case {i + 1}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <textarea value={tc.input} onChange={e => { const tcs = [...form.testCases]; tcs[i].input = e.target.value; set('testCases', tcs) }}
                                                rows={4} placeholder="Input" className="input-field font-mono text-sm" />
                                            <textarea value={tc.output} onChange={e => { const tcs = [...form.testCases]; tcs[i].output = e.target.value; set('testCases', tcs) }}
                                                rows={4} placeholder="Expected Output" className="input-field font-mono text-sm" />

                                        </div>
                                        <input value={tc.explanation} onChange={e => { const tcs = [...form.testCases]; tcs[i].explanation = e.target.value; set('testCases', tcs) }}
                                            placeholder="Explanation (optional)" className="input-field mt-2 text-sm" />
                                    </div>
                                ))}
                                <button onClick={() => set('testCases', [...form.testCases, { input: '', output: '', explanation: '' }])}
                                    className="btn-secondary px-4 py-2 text-sm">+ Add Test Case</button>
                            </div>
                        </div>
                    )}

                    {form.type === 'OP' && (
                        <div className="space-y-6">
                            <div className="glass-card p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-white font-semibold">🎯 Output Prediction</h3>
                                    <div className="flex gap-2 bg-[var(--bg-surface)]/5 p-1 rounded-xl border border-white/10">
                                        <button onClick={() => { set('opMode', 'typing'); set('options', ['', '', '', '']) }}
                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${(form.opMode || (form.options && form.options.some((o: any) => o) ? 'mcq' : 'typing')) !== 'mcq' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                                            ⌨️ TYPING
                                        </button>
                                        <button onClick={() => set('opMode', 'mcq')}
                                            className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${(form.opMode || (form.options && form.options.some((o: any) => o) ? 'mcq' : 'typing')) === 'mcq' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white'}`}>
                                            🔘 OPTIONS
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-gray-400 text-sm mb-2 block">Code Snippet / Pseudocode *</label>
                                        <textarea value={form.codeSnippet} onChange={e => set('codeSnippet', e.target.value)}
                                            rows={8} placeholder="Enter the code snippet here..." className="input-field resize-none font-mono text-sm" />
                                    </div>

                                    {(form.opMode || (form.options && form.options.some((o: any) => o) ? 'mcq' : 'typing')) !== 'mcq' && (
                                        <div>
                                            <label className="text-gray-400 text-sm mb-2 block">Expected Output *</label>
                                            <input value={form.expectedOutput} onChange={e => set('expectedOutput', e.target.value)}
                                                placeholder="What should the student predict?" className="input-field font-mono" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {(form.opMode || (form.options && form.options.some((o: any) => o) ? 'mcq' : 'typing')) === 'mcq' && (
                                <div className="glass-card p-6 border-t-0 rounded-t-none -mt-6 bg-primary-500/5">
                                    <h3 className="text-white font-semibold mb-4 text-sm">🔘 Setup Options</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        {(form.options || ['', '', '', '']).map((opt: string, i: number) => (
                                            <div key={i} className="flex gap-3 items-center">
                                                <span className="text-gray-400 text-xs w-4">{String.fromCharCode(65 + i)}.</span>
                                                <input value={opt} onChange={e => { const o = [...(form.options || ['', '', '', ''])]; o[i] = e.target.value; set('options', o) }}
                                                    placeholder={`Option ${String.fromCharCode(65 + i)}`} className="input-field flex-1 text-sm" />
                                            </div>
                                        ))}
                                    </div>
                                    <div className="p-4 rounded-xl bg-[var(--bg-surface)]/5 border border-white/10">
                                        <label className="text-gray-400 text-xs font-bold uppercase mb-2 block">Select Correct Answer</label>
                                        <div className="flex flex-wrap gap-2">
                                            {(form.options || []).map((o: string, i: number) => o && (
                                                <button key={i} onClick={() => set('expectedOutput', o)}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${form.expectedOutput === o ? 'bg-primary-500 border-primary-500 text-white' : 'border-white/10 text-gray-400 hover:border-white/30'}`}>
                                                    {String.fromCharCode(65 + i)}: {o.length > 15 ? o.substring(0, 15) + '...' : o}
                                                </button>
                                            ))}
                                        </div>
                                        {form.expectedOutput && (
                                            <p className="mt-3 text-[10px] text-primary-400 font-mono">Current Result: {form.expectedOutput}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex justify-between items-center bg-[var(--bg-surface)]/5 p-6 rounded-2xl border border-white/10">
                        <button onClick={() => router.push('/dashboard/superadmin/question-bank')} className="btn-secondary px-5 py-2.5">Cancel</button>
                        <div className="flex gap-3">
                            <button onClick={() => setShowPreview(true)}
                                disabled={!form.questionText || !form.topicNames}
                                className="px-6 py-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-30">
                                👁️ Preview Question
                            </button>
                            <button onClick={handleSubmit} disabled={saving || !form.questionText || !form.topicNames}
                                className="btn-primary px-8 py-2.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20">
                                {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating...</> : '🚀 Update Question'}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {showPreview && (
                <QuestionPreview form={form} onClose={() => setShowPreview(false)} />
            )}
        </div>
    )
}
