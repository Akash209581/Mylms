'use client'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import QuestionPreview from '@/components/question-bank/QuestionPreview'
import MarkdownToolbar from '@/components/editor/MarkdownToolbar'

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

function CreateQuestionForm() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [currentRole, setCurrentRole] = useState<'SUPERADMIN' | 'ADMIN' | 'INSTRUCTOR' | 'QUESTION_CREATOR'>('SUPERADMIN')
    const [step, setStep] = useState(1)
    const [form, setForm] = useState<any>({
        type: '', topicNames: [], difficulty: 'MEDIUM', companiesAppeared: '', targetCompanies: '',
        programmingLanguage: '', recentYearAppearing: new Date().getFullYear(),
        bestPracticeFor: '', questionText: '',
        options: ['', '', '', ''], correctAnswer: '',
        blanks: [''],
        matchingPairs: [{ left: '', right: '' }],
        jumbledStatements: [''],
        problemStatement: '', inputFormat: '', outputFormat: '', constraints: '',
        testCases: [{ input: '', output: '', explanation: '', isHidden: false }],
        codeSnippet: '', expectedOutput: '',
        allowedLanguages: ['Python'],
        extraRightMatches: [''],
        explanation: '',
        correctCode: '',
        description: '',
        domain: 'Programming Domain',
    })
    const [domains, setDomains] = useState<any[]>([])
    const [topics, setTopics] = useState<any[]>([])
    const [newDomain, setNewDomain] = useState('')
    const [newTopic, setNewTopic] = useState('')
    const [showAddDomain, setShowAddDomain] = useState(false)
    const [showAddTopic, setShowAddTopic] = useState(false)
    const [saving, setSaving] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [error, setError] = useState('')
    const [pqTab, setPqTab] = useState<'explanation' | 'problem' | 'testcases' | 'predefined'>('explanation')
    const [predefinedCodes, setPredefinedCodes] = useState<Record<string, string>>({
        'Python': 'def solve():\n    # Write your Python code here\n    pass',
        'Java': 'public class Solution {\n    public static void main(String[] args) {\n        // Write your Java code here\n    }\n}',
        'C++': '#include <iostream>\nusing namespace std;\n\nint main() {\n    // Write your C++ code here\n    return 0;\n}',
        'C': '#include <stdio.h>\n\nint main() {\n    // Write your C code here\n    return 0;\n}',
        'JavaScript': 'function solve() {\n    // Write your JavaScript code here\n}',
    })

    const problemStatementRef = useRef<HTMLTextAreaElement>(null)
    const explanationRef = useRef<HTMLTextAreaElement>(null)
    const constraintsRef = useRef<HTMLTextAreaElement>(null)
    const inputFormatRef = useRef<HTMLTextAreaElement>(null)
    const outputFormatRef = useRef<HTMLTextAreaElement>(null)
    const descriptionRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN' && u.role !== 'ADMIN' && u.role !== 'INSTRUCTOR' && u.role !== 'QUESTION_CREATOR') { router.push('/login'); return }
        setCurrentRole(u.role)
        fetchDomains()
    }, [])

    const dashboardBase = currentRole === 'QUESTION_CREATOR' ? '/dashboard/instructor' : `/dashboard/${currentRole.toLowerCase()}`
    const returnTo = searchParams.get('returnTo')

    useEffect(() => {
        if (form.domain) fetchTopics(form.domain)
    }, [form.domain])

    const fetchTopics = async (domainName: string) => {
        try {
            const res = await apiFetch(`${API_URL}/topics?domainName=${encodeURIComponent(domainName)}`, { credentials: 'include' });
            const data = await res.json();
            if (Array.isArray(data)) setTopics(data);
        } catch (e) { console.error(e) }
    }

    const fetchDomains = async () => {
        try {
            const res = await apiFetch(`${API_URL}/domains`, { credentials: 'include' });
            const data = await res.json();
            if (Array.isArray(data)) setDomains(data);
        } catch (e) { console.error(e) }
    }

    const handleAddDomain = async () => {
        if (!newDomain.trim()) return;
        try {
            const res = await apiFetch(`${API_URL}/domains`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: newDomain }),
            });
            if (res.ok) {
                setNewDomain('');
                setShowAddDomain(false);
                fetchDomains();
            } else {
                const e = await res.json();
                alert(e.message || 'Error adding domain');
            }
        } catch (e) { console.error(e) }
    }

    const handleAddTopic = async () => {
        if (!newTopic.trim()) return;
        const domain = domains.find(d => d.name === form.domain);
        if (!domain) return;
        try {
            const res = await apiFetch(`${API_URL}/topics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: newTopic, domainId: domain.id }),
            });
            if (res.ok) {
                const created = await res.json();
                setNewTopic('');
                setShowAddTopic(false);
                fetchTopics(form.domain);
                set('topicNames', [...form.topicNames, created.name]);
            } else {
                const e = await res.json();
                alert(e.message || 'Error adding topic');
            }
        } catch (e) { console.error(e) }
    }

    const set = (key: string, val: any) => setForm((p: any) => ({ ...p, [key]: val }))

    const handleSubmit = async () => {
        setSaving(true); setError('')

        // Frontend Validation
        if (!form.questionText?.trim()) { setError('Question Title is required'); setSaving(false); return }
        if (!form.problemStatement?.trim()) { setError('Problem Statement is compulsory for all question types'); setSaving(false); return }

        try {
            const submitData = {
                ...form,
                topicNames: Array.isArray(form.topicNames) ? form.topicNames.join(', ') : form.topicNames
            }
            if (form.type === 'PQ') {
                submitData.codeSnippet = JSON.stringify(predefinedCodes);
            }
            const res = await apiFetch(`${API_URL}/question-bank`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(submitData),
            })
            if (!res.ok) { const e = await res.json(); setError(e.message || 'Error saving'); return }
            router.push(returnTo || `${dashboardBase}/question-bank`)
        } catch (e: any) { setError(e.message) }
        finally { setSaving(false) }
    }

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role={currentRole} />
            <Navbar title="Create Question" />
            <main className="page-content">
                <div className="flex items-center gap-3 mb-8">
                    <button onClick={() => router.push(returnTo || `${dashboardBase}/question-bank`)}
                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[var(--bg-surface)]/10 transition-all">
                        ← Back
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Create New Question</h1>
                        <p className="text-gray-400 text-sm">Fill in the question details</p>
                    </div>
                </div>

                {error && (
                    <div className="glass-card p-4 mb-6 border border-red-500/30 bg-red-500/10">
                        <p className="text-red-400 text-sm">❌ {error}</p>
                    </div>
                )}

                {/* Step 1: Select Type */}
                {step === 1 && (
                    <div className="glass-card p-8">
                        <h2 className="text-lg font-semibold text-white mb-6">Step 1: Choose Question Type</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {QUESTION_TYPES.map(t => (
                                <div key={t.key} onClick={() => { set('type', t.key); setStep(2) }}
                                    className="p-5 rounded-2xl cursor-pointer border transition-all duration-200 hover:scale-105 hover:border-primary-500"
                                    style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>
                                    <div className="text-3xl mb-3">{t.icon}</div>
                                    <p className="text-white font-semibold mb-1">{t.label}</p>
                                    <p className="text-gray-400 text-xs">{t.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2: Common Details */}
                {step === 2 && (
                    <div className="space-y-6">
                        <div className="glass-card p-6">
                            <h2 className="text-lg font-semibold text-white mb-5">Step 2: Question Details
                                <span className="text-primary-400 ml-2 text-sm">({form.type})</span>
                            </h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Domain Name *</label>
                                    <div className="flex gap-2">
                                        <select value={form.domain} onChange={e => set('domain', e.target.value)} className="input-field flex-1">
                                            <option value="Programming Domain">Programming Domain</option>
                                            {domains.filter(d => d.name !== 'Programming Domain').map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                        </select>
                                        <button onClick={() => setShowAddDomain(true)} className="p-2 bg-primary-500/10 border border-primary-500/30 text-primary-400 rounded-xl hover:bg-primary-500 hover:text-white transition-all">
                                            +
                                        </button>
                                    </div>
                                </div>
                                <div className="sm:hidden" /> {/* Spacer for desktop grid */}

                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Topic Name(s) *</label>
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {form.topicNames.map((t: string) => (
                                            <span key={t} className="px-3 py-1 bg-primary-500/20 border border-primary-500/30 text-primary-400 rounded-full text-xs flex items-center gap-2">
                                                {t}
                                                <button
                                                    onClick={() => set('topicNames', form.topicNames.filter((x: string) => x !== t))}
                                                    className="w-4 h-4 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 hover:text-white transition-colors"
                                                    title={`Remove ${t}`}
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ))}
                                        {form.topicNames.length > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => set('topicNames', [])}
                                                className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                                                title="Clear all selected topics"
                                            >
                                                Clear All
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <select value="" onChange={e => {
                                            if (e.target.value && !form.topicNames.includes(e.target.value)) {
                                                set('topicNames', [...form.topicNames, e.target.value])
                                            }
                                        }} className="input-field flex-1">
                                            <option value="">Add Topic</option>
                                            {topics.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                        </select>
                                        <button onClick={() => setShowAddTopic(true)} className="p-2 bg-primary-500/10 border border-primary-500/30 text-primary-400 rounded-xl hover:bg-primary-500 hover:text-white transition-all">
                                            +
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Difficulty Level *</label>
                                    <select value={form.difficulty} onChange={e => set('difficulty', e.target.value)} className="input-field">
                                        {DIFFICULTIES.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
                                    </select>
                                </div>
                                <div className="col-span-1 sm:col-span-2">
                                    <label className="text-gray-400 text-sm mb-2 block">
                                        🏢 Target Companies <span className="text-xs text-primary-400">(select quick pills or type custom comma-separated)</span>
                                    </label>
                                    <div className="flex flex-wrap gap-1.5 mb-2.5">
                                        {['TCS', 'Infosys', 'Wipro', 'Accenture', 'Cognizant', 'Capgemini', 'Amazon', 'Microsoft', 'Google', 'Deloitte', 'IBM', 'Oracle', 'Cisco', 'Adobe'].map(c => {
                                            const currentList = (form.targetCompanies || form.companiesAppeared || '').split(',').map((x: string) => x.trim()).filter(Boolean)
                                            const isSelected = currentList.includes(c)
                                            return (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => {
                                                        const updated = isSelected
                                                            ? currentList.filter((x: string) => x !== c)
                                                            : [...currentList, c]
                                                        const val = updated.join(', ')
                                                        set('targetCompanies', val)
                                                        set('companiesAppeared', val)
                                                    }}
                                                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                                        isSelected
                                                            ? 'bg-primary-500 text-white shadow-sm shadow-primary-500/30'
                                                            : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                                                    }`}
                                                >
                                                    {isSelected ? '✓ ' : '+ '}{c}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <input 
                                        value={form.targetCompanies || form.companiesAppeared || ''} 
                                        onChange={e => {
                                            set('targetCompanies', e.target.value)
                                            set('companiesAppeared', e.target.value)
                                        }}
                                        placeholder="Accenture, Capgemini, TCS..." 
                                        className="input-field" 
                                    />
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
                                <label className="text-gray-400 text-sm mb-2 block">Question Title *</label>
                                <textarea value={form.questionText}
                                    onChange={e => set('questionText', e.target.value)}
                                    rows={2} placeholder="Enter the question title..." className="input-field" />
                            </div>

                            {form.domain?.toLowerCase().includes('machine learning') && (
                                <div className="mt-6 pt-6 border-t border-white/5">
                                    <label className="text-gray-400 text-sm mb-2 block font-semibold text-primary-400 flex items-center gap-2">
                                        <span className="text-lg">🧠</span>  Description *
                                    </label>
                                    <p className="text-gray-500 text-[10px] mb-3 uppercase font-bold tracking-wider">Topic's importance, real-time applications & step-by-step computation</p>
                                    <MarkdownToolbar textareaRef={descriptionRef} onChange={(val) => set('description', val)} />
                                    <textarea
                                        ref={descriptionRef}
                                        value={form.description}
                                        onChange={e => set('description', e.target.value)}
                                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                        rows={4} placeholder="Importance in domain, real-time apps, computation steps..." className="input-field font-mono text-sm rounded-t-none border-primary-500/30 bg-primary-500/5 shadow-inner" />
                                </div>
                            )}

                        </div>

                        {/* MCQ */}
                        {form.type === 'MCQ' && (
                            <div className="glass-card p-6 space-y-6">
                                <div>
                                    <h3 className="text-white font-semibold mb-2">📄 Problem Statement *</h3>
                                    <MarkdownToolbar textareaRef={problemStatementRef} onChange={(val) => set('problemStatement', val)} />
                                    <textarea
                                        ref={problemStatementRef}
                                        value={form.problemStatement}
                                        onChange={e => set('problemStatement', e.target.value)}
                                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                        rows={3} placeholder="Add context or a code snippet..." className="input-field font-mono text-sm rounded-t-none" />
                                </div>

                                <div className="pt-6 border-t border-white/5">
                                    <h3 className="text-white font-semibold mb-4">🔘 Options</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        {(form.options || ['', '', '', '']).map((opt: string, i: number) => (
                                            <div key={i} className="flex gap-2 items-center">
                                                <span className="text-gray-400 text-sm w-6">{String.fromCharCode(65 + i)}.</span>
                                                <input value={opt} onChange={e => { const o = [...form.options]; o[i] = e.target.value; set('options', o) }}
                                                    placeholder={`Option ${String.fromCharCode(65 + i)}`} className="input-field flex-1" />
                                            </div>
                                        ))}
                                    </div>
                                    <div>
                                        <label className="text-gray-400 text-sm mb-2 block">Correct Answer</label>
                                        <select value={form.correctAnswer} onChange={e => set('correctAnswer', e.target.value)} className="input-field max-w-xs">
                                            <option value="">Select correct option</option>
                                            {form.options.map((o: string, i: number) => o && <option key={i} value={o}>{String.fromCharCode(65 + i)}. {o}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-white/5">
                                    <label className="text-gray-400 text-sm mb-2 block font-semibold">Explanation (Optional)</label>
                                    <MarkdownToolbar textareaRef={explanationRef} onChange={(val) => set('explanation', val)} />
                                    <textarea
                                        ref={explanationRef}
                                        value={form.explanation}
                                        onChange={e => set('explanation', e.target.value)}
                                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                        rows={3} placeholder="Explain why this answer is correct..." className="input-field text-sm rounded-t-none" />
                                </div>
                            </div>
                        )}

                        {/* FIB */}
                        {form.type === 'FIB' && (
                            <div className="glass-card p-6 space-y-6">
                                <div>
                                    <h3 className="text-white font-semibold mb-2">📄 Problem Statement *</h3>
                                    <p className="text-gray-400 text-xs mb-4">Provide the problem statement or code snippet. Use <span className="text-primary-400 font-mono font-bold">[BLANK]</span> where you want students to fill in the answers.</p>
                                    <MarkdownToolbar textareaRef={problemStatementRef} onChange={(val) => set('problemStatement', val)} />
                                    <textarea
                                        ref={problemStatementRef}
                                        value={form.problemStatement}
                                        onChange={e => set('problemStatement', e.target.value)}
                                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                        rows={5} placeholder="e.g. For(int i=0; i < [BLANK]; i++)" className="input-field font-mono text-sm rounded-t-none" />
                                </div>

                                <div className="pt-6 border-t border-white/5">
                                    <h3 className="text-white font-semibold mb-4">✏️ Blank Answers</h3>
                                    <div className="space-y-4">
                                        {form.blanks.map((b: string, i: number) => (
                                            <div key={i} className="flex gap-3 mb-3 items-center">
                                                <span className="text-gray-400 text-sm w-16">Blank {i + 1}:</span>
                                                <input value={b} onChange={e => { const bl = [...form.blanks]; bl[i] = e.target.value; set('blanks', bl) }}
                                                    placeholder={`Answer for [BLANK] #${i + 1}`} className="input-field flex-1" />
                                                {form.blanks.length > 1 && (
                                                    <button onClick={() => set('blanks', form.blanks.filter((_: any, idx: number) => idx !== i))}
                                                        className="text-red-400 hover:text-red-500 transition-colors p-1" title="Delete Blank">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => set('blanks', [...form.blanks, ''])}
                                        className="btn-secondary px-4 py-2 text-sm mt-4">+ Add Blank</button>
                                </div>

                                <div className="pt-6 border-t border-white/5">
                                    <label className="text-gray-400 text-sm mb-2 block font-semibold">Explanation (Optional)</label>
                                    <MarkdownToolbar textareaRef={explanationRef} onChange={(val) => set('explanation', val)} />
                                    <textarea
                                        ref={explanationRef}
                                        value={form.explanation}
                                        onChange={e => set('explanation', e.target.value)}
                                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                        rows={3} placeholder="Explain the logic behind the blanks..." className="input-field text-sm rounded-t-none" />
                                </div>
                            </div>
                        )}


                        {/* MQ */}
                        {form.type === 'MQ' && (
                            <div className="glass-card p-6 space-y-6">
                                <div>
                                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">📄 Problem Statement *</h3>
                                    <MarkdownToolbar textareaRef={problemStatementRef} onChange={(val) => set('problemStatement', val)} />
                                    <textarea
                                        ref={problemStatementRef}
                                        value={form.problemStatement}
                                        onChange={e => set('problemStatement', e.target.value)}
                                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                        rows={3} placeholder="Add context for the matching pairs..." className="input-field text-sm rounded-t-none" />
                                </div>

                                <div className="pt-6 border-t border-white/5">
                                    <h3 className="text-white font-semibold mb-4">🔗 Matching Pairs</h3>
                                    <div className="space-y-4">
                                        {form.matchingPairs.map((p: any, i: number) => (
                                            <div key={i} className="flex gap-4 items-start relative group">
                                                <div className="flex-1 space-y-2">
                                                    <textarea value={p.left} onChange={e => { const pairs = [...form.matchingPairs]; pairs[i].left = e.target.value; set('matchingPairs', pairs) }}
                                                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                                        placeholder="Left match" className="input-field text-sm pt-3" rows={1} />
                                                </div>
                                                <div className="mt-3 flex-shrink-0 text-primary-400">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <textarea value={p.right} onChange={e => { const pairs = [...form.matchingPairs]; pairs[i].right = e.target.value; set('matchingPairs', pairs) }}
                                                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                                        placeholder="Right match" className="input-field text-sm pt-3" rows={1} />
                                                </div>
                                                {form.matchingPairs.length > 1 && (
                                                    <button onClick={() => set('matchingPairs', form.matchingPairs.filter((_: any, idx: number) => idx !== i))}
                                                        className="mt-2 text-red-400 hover:text-red-500 transition-colors p-1" title="Delete Pair">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => set('matchingPairs', [...form.matchingPairs, { left: '', right: '' }])}
                                        className="btn-secondary px-4 py-2 text-sm mt-4">+ Add Pair</button>
                                </div>

                                <div className="pt-6 border-t border-white/5">
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

                                <div className="pt-6 border-t border-white/5">
                                    <label className="text-gray-400 text-sm mb-2 block font-semibold">Explanation (Optional)</label>
                                    <MarkdownToolbar textareaRef={explanationRef} onChange={(val) => set('explanation', val)} />
                                    <textarea
                                        ref={explanationRef}
                                        value={form.explanation}
                                        onChange={e => set('explanation', e.target.value)}
                                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                        rows={3} placeholder="Explain the matching logic..." className="input-field text-sm rounded-t-none" />
                                </div>
                            </div>
                        )}


                        {form.type === 'JC' && (

                            <div className="glass-card p-6 space-y-6">
                                <div>
                                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">📄 Problem Statement *</h3>
                                    <MarkdownToolbar textareaRef={problemStatementRef} onChange={(val) => set('problemStatement', val)} />
                                    <textarea
                                        ref={problemStatementRef}
                                        value={form.problemStatement}
                                        onChange={e => set('problemStatement', e.target.value)}
                                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                        rows={3} placeholder="Provide context and instructions for the jumbled code..." className="input-field text-sm rounded-t-none" />
                                </div>

                                <div className="pt-6 border-t border-white/5">
                                    <h3 className="text-white font-semibold mb-4">🔀 Jumbled Statements (One per line)</h3>
                                    <p className="text-gray-400 text-xs mb-4 text-primary-400/80">Enter statements in the CORRECT order — they will be automatically shuffled for students</p>
                                    <div className="space-y-4">
                                        {form.jumbledStatements.map((s: string, i: number) => (
                                            <div key={i} className="flex gap-3 mb-3 items-center">
                                                <span className="text-gray-400 text-sm w-6">{i + 1}.</span>
                                                <input value={s} onChange={e => { const js = [...form.jumbledStatements]; js[i] = e.target.value; set('jumbledStatements', js) }}
                                                    placeholder={`Code line ${i + 1}`} className="input-field flex-1 font-mono text-sm" />
                                                {form.jumbledStatements.length > 1 && (
                                                    <button onClick={() => set('jumbledStatements', form.jumbledStatements.filter((_: any, idx: number) => idx !== i))}
                                                        className="text-red-400 hover:text-red-500 transition-colors p-1" title="Delete Statement">
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <button onClick={() => set('jumbledStatements', [...form.jumbledStatements, ''])}
                                        className="btn-secondary px-4 py-2 text-sm mt-4">+ Add Statement</button>
                                </div>

                                <div className="pt-6 border-t border-white/5">
                                    <label className="text-gray-400 text-sm mb-2 block font-semibold">Correct Code (expected sequence)</label>
                                    <textarea value={form.correctCode}
                                        onChange={e => set('correctCode', e.target.value)}
                                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                        rows={5} placeholder="Full correct code snippet..." className="input-field font-mono text-sm" />
                                </div>

                                <div className="pt-6 border-t border-white/5">
                                    <label className="text-gray-400 text-sm mb-2 block font-semibold">Explanation (Optional)</label>
                                    <MarkdownToolbar textareaRef={explanationRef} onChange={(val) => set('explanation', val)} />
                                    <textarea
                                        ref={explanationRef}
                                        value={form.explanation}
                                        onChange={e => set('explanation', e.target.value)}
                                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                        rows={3} placeholder="Explain the logic..." className="input-field text-sm rounded-t-none" />
                                </div>
                            </div>
                        )}


                        {form.type === 'PQ' && (
                            <div className="glass-card p-6 space-y-6">
                                <div className="flex border-b border-white/10 pb-3 gap-6">
                                    <button
                                        type="button"
                                        onClick={() => setPqTab('explanation')}
                                        className={`pb-2 text-sm font-semibold transition-all relative ${
                                            pqTab === 'explanation' ? 'text-primary-400' : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        📖 Topic Explanation
                                        {pqTab === 'explanation' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400 rounded-full" />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPqTab('problem')}
                                        className={`pb-2 text-sm font-semibold transition-all relative ${
                                            pqTab === 'problem' ? 'text-primary-400' : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        💻 Problem Statement
                                        {pqTab === 'problem' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400 rounded-full" />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPqTab('testcases')}
                                        className={`pb-2 text-sm font-semibold transition-all relative ${
                                            pqTab === 'testcases' ? 'text-primary-400' : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        🧪 Test Cases
                                        {pqTab === 'testcases' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400 rounded-full" />
                                        )}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPqTab('predefined')}
                                        className={`pb-2 text-sm font-semibold transition-all relative ${
                                            pqTab === 'predefined' ? 'text-primary-400' : 'text-gray-400 hover:text-white'
                                        }`}
                                    >
                                        💻 Predefined Code
                                        {pqTab === 'predefined' && (
                                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400 rounded-full" />
                                        )}
                                    </button>
                                </div>

                                {pqTab === 'explanation' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        <div>
                                            <label className="text-gray-400 text-sm mb-2 block font-semibold">Topic Explanation *</label>
                                            <p className="text-xs text-gray-500 mb-3">Provide background theory, tutorials, or deep concepts related to this coding topic.</p>
                                            <MarkdownToolbar textareaRef={explanationRef} onChange={(val) => set('explanation', val)} />
                                            <textarea
                                                ref={explanationRef}
                                                value={form.explanation}
                                                onChange={e => set('explanation', e.target.value)}
                                                onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                                rows={8} placeholder="Enter Topic Explanation concept/theory in markdown format..." className="input-field font-mono text-sm rounded-t-none" />
                                        </div>
                                    </div>
                                )}

                                {pqTab === 'problem' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        <div>
                                            <label className="text-gray-400 text-sm mb-2 block font-semibold">Problem Statement *</label>
                                            <MarkdownToolbar textareaRef={problemStatementRef} onChange={(val) => set('problemStatement', val)} />
                                            <textarea
                                                ref={problemStatementRef}
                                                value={form.problemStatement}
                                                onChange={e => set('problemStatement', e.target.value)}
                                                onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                                rows={5} placeholder="Problem Statement" className="input-field font-mono text-sm rounded-t-none" />
                                        </div>
                                        <div>
                                            <label className="text-gray-400 text-sm mb-2 block">Input Format</label>
                                            <MarkdownToolbar textareaRef={inputFormatRef} onChange={(val) => set('inputFormat', val)} />
                                            <textarea
                                                ref={inputFormatRef}
                                                value={form.inputFormat}
                                                onChange={e => set('inputFormat', e.target.value)}
                                                onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                                rows={4} placeholder="Input Format" className="input-field font-mono text-sm rounded-t-none" />
                                        </div>
                                        <div>
                                            <label className="text-gray-400 text-sm mb-2 block">Output Format</label>
                                            <MarkdownToolbar textareaRef={outputFormatRef} onChange={(val) => set('outputFormat', val)} />
                                            <textarea
                                                ref={outputFormatRef}
                                                value={form.outputFormat}
                                                onChange={e => set('outputFormat', e.target.value)}
                                                onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                                rows={4} placeholder="Output Format" className="input-field font-mono text-sm rounded-t-none" />
                                        </div>
                                        <div>
                                            <label className="text-gray-400 text-sm mb-2 block">Constraints</label>
                                            <MarkdownToolbar textareaRef={constraintsRef} onChange={(val) => set('constraints', val)} />
                                            <textarea
                                                ref={constraintsRef}
                                                value={form.constraints}
                                                onChange={e => set('constraints', e.target.value)}
                                                onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                                rows={4} placeholder="Constraints" className="input-field font-mono text-sm rounded-t-none" />
                                        </div>
                                    </div>
                                )}

                                {pqTab === 'testcases' && (
                                    <div className="space-y-4 animate-in fade-in duration-200">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-4">
                                                <h4 className="text-white text-sm font-semibold">Allowed Languages</h4>
                                                <div className="flex gap-2 border-l border-white/10 pl-4">
                                                    <button type="button" onClick={() => set('allowedLanguages', LANGUAGES.filter(l => l !== 'Any'))}
                                                        className="text-[9px] font-bold text-primary-400 hover:text-primary-300 uppercase tracking-wider">Select All</button>
                                                    <button type="button" onClick={() => set('allowedLanguages', [])}
                                                        className="text-[9px] font-bold text-[var(--text-secondary)] hover:text-gray-400 uppercase tracking-wider">Clear</button>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {LANGUAGES.filter(l => l !== 'Any').map(lang => (
                                                    <button type="button" key={lang} onClick={() => {
                                                        const current = form.allowedLanguages || [];
                                                        const next = current.includes(lang) ? current.filter((l: string) => l !== lang) : [...current, lang];
                                                        set('allowedLanguages', next);
                                                    }} className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${form.allowedLanguages?.includes(lang) ? 'bg-primary-50 border-primary-500 text-white shadow-lg shadow-primary-500/20' : 'bg-[var(--bg-surface)]/5 border-white/10 text-gray-400 hover:border-white/30'}`}>
                                                        {lang}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-gray-400 text-sm mb-3 block">Test Cases</label>
                                            {form.testCases.map((tc: any, i: number) => (
                                                <div key={i} className="p-4 rounded-xl mb-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                                    <p className="text-gray-400 text-xs mb-2">Test Case {i + 1}</p>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <textarea value={tc.input}
                                                            onChange={e => { const tcs = [...form.testCases]; tcs[i].input = e.target.value; set('testCases', tcs) }}
                                                            onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                                            rows={4} placeholder="Input" className="input-field font-mono text-sm" />
                                                        <textarea value={tc.output}
                                                            onChange={e => { const tcs = [...form.testCases]; tcs[i].output = e.target.value; set('testCases', tcs) }}
                                                            onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                                            rows={4} placeholder="Expected Output" className="input-field font-mono text-sm" />

                                                    </div>
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-3 mb-1">Explanation (Optional)</p>
                                                    <textarea value={tc.explanation} onChange={e => { const tcs = [...form.testCases]; tcs[i].explanation = e.target.value; set('testCases', tcs) }}
                                                        onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                                        rows={4} placeholder="Why this input gives this output..." className="input-field font-mono text-sm resize-none" />

                                                    <div className="flex items-center gap-6 mt-3 p-3 bg-white/5 rounded-xl border border-white/5">
                                                        <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">Test Case Type:</span>
                                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 select-none">
                                                            <input
                                                                type="checkbox"
                                                                checked={!tc.isHidden}
                                                                onChange={() => {
                                                                    const tcs = [...form.testCases];
                                                                    tcs[i].isHidden = false;
                                                                    set('testCases', tcs);
                                                                }}
                                                                className="w-4 h-4 rounded text-primary-500 bg-black border-white/10 focus:ring-primary-500"
                                                            />
                                                            <span>🟢 Normal (Visible in sample cases)</span>
                                                        </label>
                                                        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-300 select-none">
                                                            <input
                                                                type="checkbox"
                                                                checked={!!tc.isHidden}
                                                                onChange={() => {
                                                                    const tcs = [...form.testCases];
                                                                    tcs[i].isHidden = true;
                                                                    set('testCases', tcs);
                                                                }}
                                                                className="w-4 h-4 rounded text-red-500 bg-black border-white/10 focus:ring-red-500"
                                                            />
                                                            <span>🔒 Hidden (Category evaluation)</span>
                                                        </label>
                                                    </div>
                                                </div>
                                            ))}
                                            <button type="button" onClick={() => set('testCases', [...form.testCases, { input: '', output: '', explanation: '', isHidden: false }])}
                                                className="btn-secondary px-4 py-2 text-sm">+ Add Test Case</button>
                                        </div>
                                    </div>
                                )}

                                {pqTab === 'predefined' && (
                                    <div className="space-y-6 animate-in fade-in duration-200">
                                        <div>
                                            <h4 className="text-white text-sm font-semibold mb-2">Predefined Boilerplate Code</h4>
                                            <p className="text-xs text-gray-500 mb-4">
                                                Provide boilerplate/starter code for students. Only languages selected as "Allowed Languages" will be shown here.
                                            </p>
                                        </div>

                                        {(form.allowedLanguages || []).length === 0 ? (
                                            <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 text-yellow-400 text-xs font-semibold">
                                                ⚠️ Please select at least one Allowed Language in the "Test Cases" tab first.
                                            </div>
                                        ) : (
                                            <div className="space-y-5">
                                                {(form.allowedLanguages || []).map((lang: string) => (
                                                    <div key={lang} className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{lang} Starter Code</span>
                                                        </div>
                                                        <textarea
                                                            value={predefinedCodes[lang] || ''}
                                                            onChange={e => setPredefinedCodes(prev => ({ ...prev, [lang]: e.target.value }))}
                                                            rows={6}
                                                            placeholder={`// Write starter code for ${lang} here...`}
                                                            className="w-full input-field font-mono text-sm bg-black/40 border border-white/5 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 p-4 rounded-xl"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
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

                                    <div className="space-y-6">
                                        <div>
                                            <h3 className="text-white font-semibold mb-2 flex items-center gap-2">📄 Problem Statement *</h3>
                                            <MarkdownToolbar textareaRef={problemStatementRef} onChange={(val) => set('problemStatement', val)} />
                                            <textarea
                                                ref={problemStatementRef}
                                                value={form.problemStatement}
                                                onChange={e => set('problemStatement', e.target.value)}
                                                onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                                rows={3} placeholder="Provide context and instructions for the output prediction..." className="input-field text-sm rounded-t-none" />
                                        </div>

                                        <div className="pt-6 border-t border-white/5 space-y-4">
                                            <div>
                                                <label className="text-gray-400 text-sm mb-2 block">Code Snippet / Pseudocode *</label>
                                                <textarea value={form.codeSnippet}
                                                    onChange={e => set('codeSnippet', e.target.value)}
                                                    onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                                    rows={5} placeholder="Enter the code snippet here..." className="input-field font-mono text-sm" />
                                            </div>

                                            {(form.opMode || (form.options && form.options.some((o: any) => o) ? 'mcq' : 'typing')) !== 'mcq' && (
                                                <div>
                                                    <label className="text-gray-400 text-sm mb-2 block">Expected Output *</label>
                                                    <input value={form.expectedOutput} onChange={e => set('expectedOutput', e.target.value)}
                                                        placeholder="What should the student predict?" className="input-field font-mono" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-6 border-t border-white/5 font-semibold">
                                            <label className="text-gray-400 text-sm mb-2 block">Explanation (Optional)</label>
                                            <MarkdownToolbar textareaRef={explanationRef} onChange={(val) => set('explanation', val)} />
                                            <textarea
                                                ref={explanationRef}
                                                value={form.explanation}
                                                onChange={e => set('explanation', e.target.value)}
                                                onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                                rows={3} placeholder="Explain the prediction logic..." className="input-field text-sm rounded-t-none" />
                                        </div>
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
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Footer Actions */}
                        <div className="flex justify-between items-center bg-[var(--bg-surface)]/5 p-6 rounded-2xl border border-white/10">
                            <button onClick={() => setStep(1)} className="btn-secondary px-5 py-2.5">← Change Type</button>
                            <div className="flex gap-3">
                                <button onClick={() => setShowPreview(true)}
                                    disabled={!form.questionText || !form.topicNames}
                                    className="px-6 py-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-30">
                                    👁️ Preview Question
                                </button>
                                <button onClick={handleSubmit} disabled={saving || !form.questionText || !form.topicNames}
                                    className="btn-primary px-8 py-2.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20">
                                    {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</> : '✅ Save Question'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {showPreview && (
                <QuestionPreview form={form} onClose={() => setShowPreview(false)} />
            )}

            {/* Add Domain Modal */}
            {showAddDomain && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass-card p-8 w-full max-w-md border-primary-500/30">
                        <h3 className="text-xl font-bold text-white mb-2">➕ Add New Domain</h3>
                        <p className="text-gray-400 text-sm mb-6">Create a new category for the question bank.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-xs font-bold uppercase mb-2 block">Domain Name</label>
                                <input value={newDomain} onChange={e => setNewDomain(e.target.value)}
                                    placeholder="e.g. Data Science, Machine Learning" className="input-field" autoFocus />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setShowAddDomain(false)} className="btn-secondary flex-1 py-3">Cancel</button>
                                <button onClick={handleAddDomain} disabled={!newDomain.trim()}
                                    className="btn-primary flex-1 py-3 disabled:opacity-50">Create Domain</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Topic Modal */}
            {showAddTopic && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass-card p-8 w-full max-w-md border-primary-500/30">
                        <h3 className="text-xl font-bold text-white mb-2">➕ Add New Topic</h3>
                        <p className="text-gray-400 text-sm mb-6">Add a new topic to <span className="text-primary-400">{form.domain}</span>.</p>

                        <div className="space-y-4">
                            <div>
                                <label className="text-gray-400 text-xs font-bold uppercase mb-2 block">Topic Name</label>
                                <input value={newTopic} onChange={e => setNewTopic(e.target.value)}
                                    placeholder="e.g. LangGraph, SciPy" className="input-field" autoFocus />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setShowAddTopic(false)} className="btn-secondary flex-1 py-3">Cancel</button>
                                <button onClick={handleAddTopic} disabled={!newTopic.trim()}
                                    className="btn-primary flex-1 py-3 disabled:opacity-50">Create Topic</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default function CreateQuestionPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-mesh flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-400 font-semibold animation-pulse">Loading Editor...</p>
            </div>
        }>
            <CreateQuestionForm />
        </Suspense>
    )
}
