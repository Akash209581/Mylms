'use client'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import QuestionPreview from '@/components/question-bank/QuestionPreview'
import MarkdownToolbar from '@/components/editor/MarkdownToolbar'
import OptionField from '@/components/question-bank/OptionField'
import { normalizeMcqLetter } from '@/lib/mcq-answer'
import { getRoleBasePath } from '@/lib/roleUtils'
import { ADMIN_STARTERS } from '@/lib/starter-code'
import { toast } from '@/lib/toast'

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
    const searchParams = useSearchParams()
    const returnTo = searchParams?.get('returnTo')
    const [step, setStep] = useState(2)
    const [form, setForm] = useState<any>({
        type: '', topicNames: [], difficulty: 'MEDIUM', companiesAppeared: '',
        programmingLanguage: '', recentYearAppearing: new Date().getFullYear(),
        bestPracticeFor: '', questionText: '',
        options: ['', '', '', ''], correctAnswer: '',
        blanks: [''],
        matchingPairs: [{ left: '', right: '' }],
        extraRightMatches: [''],
        jumbledStatements: [''],
        problemStatement: '', inputFormat: '', outputFormat: '', constraints: '',
        testCases: [{ input: '', output: '', explanation: '', isHidden: false }],
        codeSnippet: '', expectedOutput: '',
        allowedLanguages: [],
        hints: [''],
        explanation: '',
        correctCode: '',
        description: '',
        domain: 'Programming Domain',
    })
    const [userRole, setUserRole] = useState<'SUPERADMIN' | 'ADMIN' | 'INSTRUCTOR' | 'QUESTION_CREATOR'>('SUPERADMIN')
    const [domains, setDomains] = useState<any[]>([])
    const [topics, setTopics] = useState<any[]>([])
    const [newDomain, setNewDomain] = useState('')
    const [newTopic, setNewTopic] = useState('')
    const [showAddDomain, setShowAddDomain] = useState(false)
    const [showAddTopic, setShowAddTopic] = useState(false)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [error, setError] = useState('')
    const [pqTab, setPqTab] = useState<'explanation' | 'problem' | 'testcases' | 'predefined' | 'hints'>('explanation')
    const [predefinedCodes, setPredefinedCodes] = useState<Record<string, string>>({ ...ADMIN_STARTERS })

    const problemStatementRef = useRef<HTMLTextAreaElement>(null)
    const explanationRef = useRef<HTMLTextAreaElement>(null)
    const constraintsRef = useRef<HTMLTextAreaElement>(null)
    const inputFormatRef = useRef<HTMLTextAreaElement>(null)
    const outputFormatRef = useRef<HTMLTextAreaElement>(null)
    const descriptionRef = useRef<HTMLTextAreaElement>(null)

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

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (!['SUPERADMIN', 'ADMIN', 'INSTRUCTOR', 'QUESTION_CREATOR'].includes(u.role)) { router.push('/login'); return }
        setUserRole(u.role)
        
        fetchDomains()

        // Fetch question data
        apiFetch(`${API_URL}/question-bank/${id}`, { credentials: 'include' })
            .then(res => {
                if (!res.ok) throw new Error('Question not found')
                return res.json()
            })
            .then(data => {
                if (data.type === 'PQ' && data.codeSnippet) {
                    try {
                        const parsed = JSON.parse(data.codeSnippet);
                        if (typeof parsed === 'object' && parsed !== null) {
                            setPredefinedCodes(prev => ({ ...prev, ...parsed }));
                        }
                    } catch (e) {
                        const mainLang = (data.allowedLanguages && data.allowedLanguages[0]) || 'Python';
                        setPredefinedCodes(prev => ({ ...prev, [mainLang]: data.codeSnippet }));
                    }
                }
                // Merge data into form, ensuring arrays are properly handled
                    setForm((prev: any) => {
                        const merged = {
                            ...prev,
                            ...data,
                            topicNames: data.topicNames ? data.topicNames.split(',').map((t: string) => t.trim()).filter((t: string) => t) : [],
                            options: data.options || prev.options,
                        blanks: data.blanks || prev.blanks,
                        matchingPairs: data.matchingPairs || prev.matchingPairs,
                        extraRightMatches: data.extraRightMatches || prev.extraRightMatches || [''],
                        jumbledStatements: data.jumbledStatements || prev.jumbledStatements,
                        testCases: Array.isArray(data.testCases)
                            ? data.testCases.map((tc: any) => ({ ...tc, isHidden: tc.isHidden ?? false }))
                            : prev.testCases,
                        allowedLanguages: data.type === 'PQ' ? (Array.isArray(data.allowedLanguages) && data.allowedLanguages.length > 0 ? data.allowedLanguages : ['Python']) : (data.allowedLanguages || []),
                        hints: Array.isArray(data.hints) && data.hints.length > 0 ? data.hints : [''],
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

    const isApprovedLocked = userRole === 'QUESTION_CREATOR' && form.status === 'APPROVED'

    const handleSubmit = async (statusOverride?: 'DRAFT' | 'PENDING_APPROVAL') => {
        if (isApprovedLocked) {
            setError('Approved questions cannot be edited by the question creator.')
            return
        }
        setSaving(true); setError('')
        try {
            const submitData = {
                ...form,
                topicNames: Array.isArray(form.topicNames) ? form.topicNames.join(', ') : form.topicNames,
                hints: Array.isArray(form.hints) ? form.hints.map((h: string) => h.trim()).filter(Boolean) : [],
            }
            if (statusOverride) {
                submitData.status = statusOverride
            } else if (userRole === 'QUESTION_CREATOR') {
                submitData.status = form.status === 'DRAFT' ? 'DRAFT' : 'PENDING_APPROVAL'
            }
            if (form.type === 'PQ') {
                submitData.codeSnippet = JSON.stringify(predefinedCodes);
            }

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
            if (submitData.type !== 'PQ') {
                delete (submitData as any).testCases;
                delete (submitData as any).problemStatement;
                delete (submitData as any).inputFormat;
                delete (submitData as any).outputFormat;
                delete (submitData as any).constraints;
                delete (submitData as any).allowedLanguages;
            }
            if (submitData.type !== 'MCQ' && submitData.type !== 'OP') {
                delete (submitData as any).options;
                delete (submitData as any).correctAnswer;
                delete (submitData as any).codeSnippet;
                delete (submitData as any).expectedOutput;
            }

            // Strip relation/metadata fields that cause backend/TypeORM errors
            delete (submitData as any).creator;
            delete (submitData as any).approver;
            delete (submitData as any).college;
            delete (submitData as any).createdAt;
            delete (submitData as any).id;
            delete (submitData as any).assignedColleges;
            delete (submitData as any).description;

            const res = await apiFetch(`${API_URL}/question-bank/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(submitData),
            })
            if (res.ok) {
                toast.success('Question updated successfully!')
                router.push(returnTo || `${getRoleBasePath(userRole)}/question-bank`)
            } else {
                const data = await res.json().catch(() => ({}))
                const msg = data.message || 'Failed to update question'
                setError(msg)
                toast.error(msg)
            }
        } catch (e: any) {
            const msg = e.message || 'Failed to update question'
            setError(msg)
            toast.error(msg)
        }
        finally { setSaving(false) }
    }

    if (loading) return (
        <div className="min-h-screen bg-mesh flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
    )

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role={userRole} />
            <Navbar title="Edit Question" />
            <main className="page-content">
                <div className="flex items-center gap-3 mb-8">
                    <button onClick={() => router.push(returnTo || `${getRoleBasePath(userRole)}/question-bank`)}
                        className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[var(--bg-surface)]/10 transition-all">
                        ← Back
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold role-text-primary">Edit Question</h1>
                        <p className="text-gray-400 text-sm">Update the question details {form.questionNumber ? <>for <span className="text-primary-400 font-mono">{form.questionNumber}</span></> : <span className="text-amber-400">(Pending Approval)</span>}</p>
                    </div>
                </div>

                {/* Approved Lock Banner for Question Creators */}
                {isApprovedLocked && (
                    <div className="glass-card p-5 mb-6 border border-emerald-500/40 bg-emerald-500/10 rounded-2xl">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-lg shrink-0">
                                🔒
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-emerald-300">Question is Approved & Locked</h3>
                                <p className="text-xs text-emerald-200 mt-1 leading-relaxed">
                                    This question has been approved by the Super Admin and added to the Question Bank. Question creators cannot modify approved questions.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Rejection Banner for Question Creators */}
                {form.status === 'REJECTED' && (
                    <div className="glass-card p-5 mb-6 border border-rose-500/40 bg-rose-500/10 rounded-2xl">
                        <div className="flex items-start gap-3">
                            <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 text-lg shrink-0">
                                ⚠️
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-rose-300">Question Rejected by Super Admin</h3>
                                <p className="text-xs text-rose-200 mt-1 leading-relaxed">
                                    <strong className="text-rose-400">Rejection Reason / Improvement Notes: </strong>
                                    <span>{form.rejectionReason || 'Content does not meet assessment quality standards. Please revise.'}</span>
                                </p>
                                <p className="text-[11px] text-rose-300/80 mt-2 font-medium">
                                    💡 Make your corrections and click <strong>"Submit for Approval"</strong> below. It will automatically be resubmitted to the Super Admin Approvals Queue.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="glass-card p-4 mb-6 border border-red-500/30 bg-red-500/10">
                        <p className="text-red-400 text-sm">❌ {error}</p>
                    </div>
                )}

                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold role-text-primary mb-5">Question Details
                            <span className="text-primary-400 ml-2 text-sm">({form.type})</span>
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Domain Name *</label>
                                <div className="flex gap-2">
                                    <select value={form.domain || 'Programming Domain'} onChange={e => set('domain', e.target.value)} className="input-field flex-1">
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
                                            <button onClick={() => set('topicNames', form.topicNames.filter((x: string) => x !== t))}
                                                className="hover:text-white transition-colors">×</button>
                                        </span>
                                    ))}
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
                                <label className="text-gray-400 text-sm mb-2 block font-medium">
                                    🏢 Target Companies <span className="text-xs text-primary-400 font-normal">(Optional — select quick pills or type custom comma-separated)</span>
                                </label>
                                <div className="flex flex-wrap gap-1.5 mb-2.5">
                                    {['TCS', 'Infosys', 'Wipro', 'Accenture', 'Cognizant', 'Capgemini', 'Amazon', 'Microsoft', 'Google', 'Deloitte', 'IBM', 'Oracle', 'Cisco', 'Adobe'].map(c => {
                                        const currentList = (form.targetCompanies || '').split(',').map((x: string) => x.trim()).filter(Boolean)
                                        const isSelected = currentList.includes(c)
                                        return (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => {
                                                    const updated = isSelected
                                                        ? currentList.filter((x: string) => x !== c)
                                                        : [...currentList, c]
                                                    set('targetCompanies', updated.join(', '))
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
                                    value={form.targetCompanies || ''} 
                                    onChange={e => set('targetCompanies', e.target.value)}
                                    placeholder="Accenture, Capgemini, TCS..." 
                                    className="input-field" 
                                />
                            </div>

                            <div className="col-span-1 sm:col-span-2">
                                <label className="text-gray-400 text-sm mb-2 block font-medium">
                                    🏛️ Companies Appeared <span className="text-xs text-emerald-400 font-normal">(Optional — companies where this question previously appeared in interviews)</span>
                                </label>
                                <div className="flex flex-wrap gap-1.5 mb-2.5">
                                    {['Amazon', 'Google', 'Microsoft', 'TCS', 'Infosys', 'Wipro', 'Accenture', 'Cognizant', 'Capgemini', 'Adobe', 'Flipkart', 'Deloitte', 'Goldman Sachs', 'Morgan Stanley', 'Meta', 'Apple'].map(c => {
                                        const currentList = (form.companiesAppeared || '').split(',').map((x: string) => x.trim()).filter(Boolean)
                                        const isSelected = currentList.includes(c)
                                        return (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => {
                                                    const updated = isSelected
                                                        ? currentList.filter((x: string) => x !== c)
                                                        : [...currentList, c]
                                                    set('companiesAppeared', updated.join(', '))
                                                }}
                                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                                    isSelected
                                                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/30'
                                                        : 'bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10'
                                                }`}
                                            >
                                                {isSelected ? '✓ ' : '+ '}{c}
                                            </button>
                                        )
                                    })}
                                </div>
                                <input 
                                    value={form.companiesAppeared || ''} 
                                    onChange={e => set('companiesAppeared', e.target.value)}
                                    placeholder="e.g. Amazon, Google, TCS, Infosys..." 
                                    className="input-field" 
                                />
                            </div>
                            <div>
                                <label className="text-gray-400 text-sm mb-2 block">Programming Language</label>
                                <select value={form.programmingLanguage} onChange={e => set('programmingLanguage', e.target.value)} className="input-field">
                                    <option value="">None / Not Specified</option>
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
                                    <span className="text-lg">🧠</span> Description *
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

                    {/* Type specific inputs (MCQ, FIB, etc.) */}
                    {form.type === 'MCQ' && (
                        <div className="glass-card p-6 space-y-6">
                            <div>
                                <h3 className="role-text-primary font-semibold mb-2">📄 Problem Statement *</h3>
                                <MarkdownToolbar textareaRef={problemStatementRef} onChange={(val) => set('problemStatement', val)} />
                                <textarea 
                                    ref={problemStatementRef}
                                    value={form.problemStatement} 
                                    onChange={e => set('problemStatement', e.target.value)}
                                    onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                    rows={3} placeholder="Add context or a code snippet..." className="input-field font-mono text-sm rounded-t-none" />
                            </div>

                            <div className="pt-6 border-t border-white/5">
                                <h3 className="role-text-primary font-semibold mb-4">🔘 Options</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                    {(form.options || ['', '', '', '']).map((opt: string, i: number) => (
                                        <OptionField
                                            key={i}
                                            index={i}
                                            value={opt}
                                            onChange={(newVal) => {
                                                const o = [...(form.options || ['', '', '', ''])];
                                                o[i] = newVal;
                                                set('options', o);
                                            }}
                                        />
                                    ))}
                                </div>
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block font-medium">Correct Answer</label>
                                    <select value={normalizeMcqLetter(form.correctAnswer, form.options) || ''} onChange={e => {
                                        set('correctAnswer', e.target.value);
                                        set('expectedOutput', e.target.value);
                                    }} className="input-field max-w-xs">
                                        <option value="">Select correct option</option>
                                        {(form.options || []).map((o: string, i: number) => o && (
                                            <option key={i} value={String.fromCharCode(65 + i)}>
                                                {String.fromCharCode(65 + i)}. {o.startsWith('data:image/') ? '[Attached Image]' : o.length > 30 ? o.substring(0, 30) + '...' : o}
                                            </option>
                                        ))}
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

                    {form.type === 'FIB' && (

                        <div className="glass-card p-6 space-y-6">
                            <div>
                                <h3 className="role-text-primary font-semibold mb-2">📄 Problem Statement *</h3>
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
                                <h3 className="role-text-primary font-semibold mb-4">✏️ Blank Answers</h3>
                                <div className="space-y-4">
                                    {form.blanks.map((b: string, i: number) => (
                                        <div key={i} className="flex gap-3 mb-3 items-center">
                                            <span className="text-gray-400 text-sm w-16">Blank {i + 1}:</span>
                                            <input value={b} onChange={e => { const bl = [...form.blanks]; bl[i] = e.target.value; set('blanks', bl) }}
                                                placeholder={`Answer for [BLANK] #${i+1}`} className="input-field flex-1" />
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

                    {form.type === 'MQ' && (
                        <div className="glass-card p-6 space-y-6">
                            <div>
                                <h3 className="role-text-primary font-semibold mb-2">📄 Problem Statement *</h3>
                                <MarkdownToolbar textareaRef={problemStatementRef} onChange={(val) => set('problemStatement', val)} />
                                <textarea 
                                    ref={problemStatementRef}
                                    value={form.problemStatement} 
                                    onChange={e => set('problemStatement', e.target.value)}
                                    onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                    rows={3} placeholder="Add context for the matching pairs..." className="input-field text-sm rounded-t-none" />
                            </div>

                            <div className="pt-6 border-t border-white/5">
                                <h3 className="role-text-primary font-semibold mb-4">🔗 Matching Pairs</h3>
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
                                <h3 className="role-text-primary font-semibold mb-2">📄 Problem Statement *</h3>
                                <MarkdownToolbar textareaRef={problemStatementRef} onChange={(val) => set('problemStatement', val)} />
                                <textarea 
                                    ref={problemStatementRef}
                                    value={form.problemStatement} 
                                    onChange={e => set('problemStatement', e.target.value)}
                                    onInput={(e: any) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                                    rows={3} placeholder="Provide context and instructions for the jumbled code..." className="input-field text-sm rounded-t-none" />
                            </div>

                            <div className="pt-6 border-t border-white/5">
                                <h3 className="role-text-primary font-semibold mb-4">🔀 Jumbled Statements (One per line)</h3>
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
                                <button onClick={() => set('jumbledStatements', [...form.jumbledStatements, ''])}
                                    className="btn-secondary px-4 py-2 text-sm mt-2">+ Add Statement</button>
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
                                    💻 Pre-code / Starter code
                                    {pqTab === 'predefined' && (
                                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-400 rounded-full" />
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPqTab('hints')}
                                    className={`pb-2 text-sm font-semibold transition-all relative ${
                                        pqTab === 'hints' ? 'text-primary-400' : 'text-gray-400 hover:text-white'
                                    }`}
                                >
                                    💡 Hints {form.hints?.filter((h: string) => h?.trim())?.length ? `(${form.hints.filter((h: string) => h?.trim()).length})` : ''}
                                    {pqTab === 'hints' && (
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
                                        <h4 className="role-text-primary text-sm font-semibold mb-2">Pre-code / Starter code</h4>
                                        <p className="text-gray-400 text-xs mb-3">Students see this template when they open the question. They can edit all of it. Use normal input() / cin / Scanner / scanf — stdin is provided automatically.</p>
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

                            {pqTab === 'hints' && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <div>
                                        <h4 className="text-white text-sm font-semibold">Sequential Problem Hints</h4>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Add progressive hints that students can optionally unlock during tests. When creating assessments, you can configure negative mark penalties or test timer deductions for each revealed hint.
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        {(form.hints || []).map((hint: string, i: number) => (
                                            <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                                                        <span>💡</span> Hint {i + 1}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const nextHints = (form.hints || []).filter((_: any, idx: number) => idx !== i)
                                                            set('hints', nextHints.length ? nextHints : [''])
                                                        }}
                                                        className="text-xs text-rose-400 hover:text-rose-300 transition-colors font-semibold"
                                                    >
                                                        ✕ Remove Hint
                                                    </button>
                                                </div>
                                                <textarea
                                                    value={hint}
                                                    onChange={e => {
                                                        const nextHints = [...(form.hints || [])]
                                                        nextHints[i] = e.target.value
                                                        set('hints', nextHints)
                                                    }}
                                                    rows={3}
                                                    placeholder={`Provide Hint ${i + 1} guidance for solving the problem...`}
                                                    className="input-field text-xs font-sans"
                                                />
                                            </div>
                                        ))}
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => set('hints', [...(form.hints || []), ''])}
                                        className="px-4 py-2 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 text-xs font-bold hover:bg-amber-500/20 transition-all flex items-center gap-1.5"
                                    >
                                        <span>+</span> Add Another Hint
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {form.type === 'OP' && (
                        <div className="space-y-6">
                            <div className="glass-card p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="role-text-primary font-semibold">🎯 Output Prediction</h3>
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
                                        <h3 className="role-text-primary font-semibold mb-2">📄 Problem Statement *</h3>
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
                                    <h3 className="role-text-primary font-semibold mb-4 text-sm">🔘 Setup Options</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        {(form.options || ['', '', '', '']).map((opt: string, i: number) => (
                                            <OptionField
                                                key={i}
                                                index={i}
                                                value={opt}
                                                onChange={(newVal) => {
                                                    const o = [...(form.options || ['', '', '', ''])];
                                                    o[i] = newVal;
                                                    set('options', o);
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div className="p-4 rounded-xl bg-[var(--bg-surface)]/5 border border-white/10">
                                        <label className="text-gray-400 text-xs font-bold uppercase mb-2 block">Select Correct Answer</label>
                                        <div className="flex flex-wrap gap-2">
                                            {(form.options || []).map((o: string, i: number) => o && (
                                                <button key={i} onClick={() => set('expectedOutput', o)}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold border transition-all ${form.expectedOutput === o ? 'bg-primary-500 border-primary-500 text-white' : 'border-white/10 text-gray-400 hover:border-white/30'}`}>
                                                    {String.fromCharCode(65 + i)}: {o.startsWith('data:image/') ? '[Attached Image]' : o.length > 15 ? o.substring(0, 15) + '...' : o}
                                                </button>
                                            ))}
                                        </div>
                                        {form.expectedOutput && (
                                            <p className="mt-3 text-[10px] text-primary-400 font-mono">Current Result: {form.expectedOutput.startsWith('data:image/') ? '[Attached Image]' : form.expectedOutput}</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex flex-wrap justify-between items-center gap-4 bg-[var(--bg-surface)]/5 p-6 rounded-2xl border border-white/10">
                        <button onClick={() => router.push(returnTo || `${getRoleBasePath(userRole)}/question-bank`)} className="btn-secondary px-5 py-2.5">
                            {isApprovedLocked ? '← Back to Question Bank' : 'Cancel'}
                        </button>
                        <div className="flex flex-wrap gap-3">
                            <button onClick={() => setShowPreview(true)}
                                disabled={!form.questionText || !form.topicNames}
                                className="px-6 py-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 font-semibold border border-indigo-500/30 hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-30">
                                👁️ Preview Question
                            </button>
                            {isApprovedLocked ? (
                                <div className="px-5 py-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 flex items-center gap-2">
                                    🔒 Approved & Read Only
                                </div>
                            ) : userRole === 'QUESTION_CREATOR' ? (
                                <>
                                    <button onClick={() => handleSubmit('DRAFT')} disabled={saving || !form.questionText || !form.topicNames}
                                        className="px-6 py-2.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-200 font-semibold border border-slate-600 transition-all disabled:opacity-50 flex items-center gap-2">
                                        {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : '📝'} Save as Draft
                                    </button>
                                    <button onClick={() => handleSubmit('PENDING_APPROVAL')} disabled={saving || !form.questionText || !form.topicNames}
                                        className="btn-primary px-8 py-2.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20">
                                        {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</> : '🚀 Submit for Approval'}
                                    </button>
                                </>
                            ) : (
                                <button onClick={() => handleSubmit()} disabled={saving || !form.questionText || !form.topicNames}
                                    className="btn-primary px-8 py-2.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/20">
                                    {saving ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating...</> : '🚀 Update Question'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            {showPreview && (
                <QuestionPreview form={form} onClose={() => setShowPreview(false)} />
            )}

            {/* Add Domain Modal */}
            {showAddDomain && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="glass-card p-8 w-full max-w-md border-primary-500/30">
                        <h3 className="text-xl font-bold role-text-primary mb-2">➕ Add New Domain</h3>
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
                        <h3 className="text-xl font-bold role-text-primary mb-2">➕ Add New Topic</h3>
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
