'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import MarkdownToolbar from '@/components/editor/MarkdownToolbar'
import { API_URL, api } from '@/lib/api'

interface College {
    id: number
    name: string
}

export default function GlobalCreateCoursePage() {
    const router = useRouter()
    const [courseType, setCourseType] = useState<'standard' | 'ppt'>('ppt')
    
    // Standard Course Form
    const [form, setForm] = useState({
        title: '',
        description: '',
        category: 'General',
        level: 'Beginner',
        price: 0,
        objectives: '',
        prerequisites: '',
        published: true
    })

    // PPT Upload Form
    const [pptForm, setPptForm] = useState({
        title: '',
        description: '',
        category: 'General',
        level: 'Beginner',
        collegeId: '',
        targetCollegeMode: 'all', // 'all' or 'specific'
    })
    
    const [pptFile, setPptFile] = useState<File | null>(null)
    const [colleges, setColleges] = useState<College[]>([])
    const [userRole, setUserRole] = useState<'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'SUPERADMIN'>('SUPERADMIN')
    const [saving, setSaving] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const descriptionRef = useRef<HTMLTextAreaElement>(null)
    const pptDescRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (!['SUPERADMIN', 'ADMIN', 'INSTRUCTOR'].includes(u.role)) { router.push('/login'); return }
        setUserRole(u.role)

        fetchColleges()
    }, [])

    const fetchColleges = async () => {
        try {
            const res = await api.get('/auth/colleges')
            if (Array.isArray(res.data)) {
                setColleges(res.data)
            }
        } catch (e) {
            console.error('Failed to fetch colleges:', e)
        }
    }

    // Submit Standard Course
    const handleSubmitStandard = async () => {
        if (!form.title || form.title.length < 5) {
            setError('Title must be at least 5 characters long')
            return
        }
        if (!form.description || form.description.length < 20) {
            setError('Description must be at least 20 characters long')
            return
        }
        
        setSaving(true)
        setError('')
        
        try {
            const res = await fetch(`${API_URL}/courses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ ...form, published: true }),
            })
            
            if (!res.ok) {
                const e = await res.json()
                setError(e.message || 'Error creating course')
                return
            }
            
            setSuccess(true)
            setTimeout(() => router.push(`/dashboard/${userRole.toLowerCase()}/courses`), 1500)
        } catch (e: any) {
            setError(e.message || 'Network error')
        } finally {
            setSaving(false)
        }
    }

    // Submit PPT Course (Simple Upload)
    const handleSubmitPpt = async () => {
        if (!pptForm.title || pptForm.title.length < 3) {
            setError('Course title is required (at least 3 characters)')
            return
        }
        if (!pptForm.description || pptForm.description.length < 10) {
            setError('Course description is required (at least 10 characters)')
            return
        }
        if (!pptFile) {
            setError('Please select a presentation file (.ppt, .pptx, or .pdf) to upload')
            return
        }

        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit
        if (pptFile.size > MAX_FILE_SIZE) {
            setError(`Selected file size (${(pptFile.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 10MB limit. Please select a smaller PDF presentation file.`)
            return
        }

        setSaving(true)
        setError('')

        try {
            const formData = new FormData()
            formData.append('title', pptForm.title)
            formData.append('description', pptForm.description)
            formData.append('category', pptForm.category)
            formData.append('level', pptForm.level)
            formData.append('file', pptFile)

            if (pptForm.targetCollegeMode === 'specific' && pptForm.collegeId) {
                formData.append('collegeId', pptForm.collegeId)
                formData.append('collegeIds', JSON.stringify([parseInt(pptForm.collegeId)]))
            } else if (colleges.length > 0) {
                const allIds = colleges.map(c => c.id)
                formData.append('collegeIds', JSON.stringify(allIds))
            }

            const res = await api.post('/courses/upload-ppt', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            })

            if (res.status !== 200 && res.status !== 201) {
                setError(res.data?.message || 'Failed to upload PPT course')
                return
            }

            setSuccess(true)
            setTimeout(() => router.push(`/dashboard/${userRole.toLowerCase()}/courses`), 1500)
        } catch (e: any) {
            const serverMsg = e.response?.data?.message || e.message
            setError(serverMsg || 'Failed to create PPT course')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role={userRole} />
            <Navbar title="Create Course" />
            <main className="page-content">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(`/dashboard/${userRole.toLowerCase()}/courses`)}
                            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[var(--bg-surface)]/10 transition-all"
                        >
                            ← Back
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Upload PDF / Presentation Course</h1>
                            <p className="text-gray-400 text-sm">Upload a PDF presentation file to automatically publish it for students slide by slide</p>
                        </div>
                    </div>

                    {/* Mode Toggle */}
                    <div className="bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 flex gap-1 shadow-lg">
                        <button
                            type="button"
                            onClick={() => { setCourseType('ppt'); setError('') }}
                            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                courseType === 'ppt'
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <span>📄</span> Upload PDF File
                        </button>
                        <button
                            type="button"
                            onClick={() => { setCourseType('standard'); setError('') }}
                            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                courseType === 'standard'
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <span>📘</span> Standard Course
                        </button>
                    </div>
                </div>

                {success ? (
                    <div className="glass-card p-12 text-center max-w-2xl mx-auto shadow-2xl border border-emerald-500/30">
                        <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-4 border border-emerald-500/30 shadow-lg shadow-emerald-500/20 animate-bounce">
                            ✅
                        </div>
                        <h2 className="text-white font-black text-2xl mb-2">PDF Course Published & Assigned!</h2>
                        <p className="text-gray-400 text-sm">Students can now view your PDF presentation slide by slide with DRM protection on their dashboard.</p>
                    </div>
                ) : (
                    <div className="glass-card p-8 max-w-3xl mx-auto shadow-2xl">
                        {error && (
                            <div className="p-4 rounded-2xl mb-6 text-sm text-red-400 font-semibold flex items-center gap-3"
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                <span>❌</span> {error}
                            </div>
                        )}

                        {courseType === 'ppt' ? (
                            /* PDF File Upload Form */
                            <div className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-white font-bold text-lg flex items-center gap-2 border-b border-gray-800 pb-3">
                                        <span>📄</span> PDF Presentation Details
                                    </h3>

                                    <div>
                                        <label className="text-gray-300 text-sm font-semibold mb-2 block">Course Title *</label>
                                        <input
                                            value={pptForm.title}
                                            onChange={e => setPptForm(p => ({ ...p, title: e.target.value }))}
                                            placeholder="e.g. Operating Systems Architecture Presentation"
                                            className="input-field text-lg"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-gray-300 text-sm font-semibold mb-2 block">Description *</label>
                                        <textarea
                                            ref={pptDescRef}
                                            value={pptForm.description}
                                            onChange={e => setPptForm(p => ({ ...p, description: e.target.value }))}
                                            rows={3}
                                            placeholder="Provide a short summary of this PDF presentation course..."
                                            className="input-field"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-gray-300 text-sm font-semibold mb-2 block">Category</label>
                                            <select
                                                value={pptForm.category}
                                                onChange={e => setPptForm(p => ({ ...p, category: e.target.value }))}
                                                className="input-field"
                                            >
                                                <option value="General">General</option>
                                                <option value="Programming">Programming</option>
                                                <option value="Web Development">Web Development</option>
                                                <option value="Data Science">Data Science</option>
                                                <option value="Cybersecurity">Cybersecurity</option>
                                                <option value="Management">Management</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-gray-300 text-sm font-semibold mb-2 block">Level</label>
                                            <select
                                                value={pptForm.level}
                                                onChange={e => setPptForm(p => ({ ...p, level: e.target.value }))}
                                                className="input-field"
                                            >
                                                <option value="Beginner">Beginner</option>
                                                <option value="Intermediate">Intermediate</option>
                                                <option value="Advanced">Advanced</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* College Assignment */}
                                <div className="space-y-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                                    <h3 className="text-white font-bold text-base flex items-center gap-2">
                                        <span>🏛️</span> Target College Assignment
                                    </h3>
                                    <p className="text-gray-400 text-xs">Choose which college students will see this presentation course on their dashboard.</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-gray-300 text-xs font-semibold mb-2 block">Assignment Target</label>
                                            <select
                                                value={pptForm.targetCollegeMode}
                                                onChange={e => setPptForm(p => ({ ...p, targetCollegeMode: e.target.value }))}
                                                className="input-field text-sm"
                                            >
                                                <option value="all">All Colleges (Global Access)</option>
                                                <option value="specific">Particular College</option>
                                            </select>
                                        </div>

                                        {pptForm.targetCollegeMode === 'specific' && (
                                            <div>
                                                <label className="text-gray-300 text-xs font-semibold mb-2 block">Select College *</label>
                                                <select
                                                    value={pptForm.collegeId}
                                                    onChange={e => setPptForm(p => ({ ...p, collegeId: e.target.value }))}
                                                    className="input-field text-sm"
                                                >
                                                    <option value="">-- Choose College --</option>
                                                    {colleges.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* PDF / Presentation File Upload */}
                                <div className="space-y-4">
                                    <h3 className="text-white font-bold text-base flex items-center gap-2">
                                        <span>📁</span> Select PDF File (.pdf) *
                                    </h3>

                                    <div className="border-2 border-dashed border-indigo-500/40 bg-indigo-950/30 rounded-2xl p-8 text-center transition-all hover:border-indigo-500/80">
                                        <input
                                            type="file"
                                            id="ppt-file-input"
                                            accept=".pdf,.pptx,.ppt,image/*"
                                            onChange={e => {
                                                const selected = e.target.files?.[0] || null;
                                                if (selected && selected.size > 10 * 1024 * 1024) {
                                                    setError(`Selected file (${(selected.size / (1024 * 1024)).toFixed(2)} MB) exceeds the 10MB size limit. Please choose a smaller file.`);
                                                    setPptFile(null);
                                                    e.target.value = '';
                                                    return;
                                                }
                                                setError('');
                                                setPptFile(selected);
                                            }}
                                            className="hidden"
                                        />
                                        <label htmlFor="ppt-file-input" className="cursor-pointer flex flex-col items-center gap-3">
                                            <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-3xl font-black mb-1 border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                                                📄
                                            </div>
                                            {pptFile ? (
                                                <div>
                                                    <p className="text-indigo-300 font-bold text-base">{pptFile.name}</p>
                                                    <p className="text-slate-400 text-xs mt-1">{(pptFile.size / (1024 * 1024)).toFixed(2)} MB (Max limit: 10MB)</p>
                                                </div>
                                            ) : (
                                                <div>
                                                    <p className="text-white font-bold text-base">Click to select PDF document (.pdf, max 10MB)</p>
                                                    <p className="text-slate-400 text-xs mt-1.5">Direct PDF upload automatically displays as an interactive slide deck (Maximum 10 MB)</p>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleSubmitPpt}
                                        disabled={saving}
                                        className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-sm rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {saving ? 'Publishing PDF Course...' : '🚀 Publish PDF Course'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            /* Standard Course Form */
                            <div className="space-y-6">
                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Course Title *</label>
                                    <input
                                        value={form.title}
                                        onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                        placeholder="e.g. Complete Python Programming Masterclass"
                                        className="input-field text-lg"
                                        maxLength={200}
                                    />
                                </div>

                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block font-semibold">Description *</label>
                                    <MarkdownToolbar textareaRef={descriptionRef} onChange={val => setForm(p => ({ ...p, description: val }))} />
                                    <textarea
                                        ref={descriptionRef}
                                        value={form.description}
                                        onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                                        rows={4}
                                        placeholder="Provide a detailed description..."
                                        className="input-field resize-none rounded-t-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-gray-400 text-sm mb-2 block">Category</label>
                                        <select
                                            value={form.category}
                                            onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                                            className="input-field"
                                        >
                                            <option value="General">General</option>
                                            <option value="Programming">Programming</option>
                                            <option value="Web Development">Web Development</option>
                                            <option value="Data Science">Data Science</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="text-gray-400 text-sm mb-2 block">Level</label>
                                        <select
                                            value={form.level}
                                            onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
                                            className="input-field"
                                        >
                                            <option value="Beginner">Beginner</option>
                                            <option value="Intermediate">Intermediate</option>
                                            <option value="Advanced">Advanced</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={handleSubmitStandard}
                                        disabled={saving}
                                        className="px-8 py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-sm rounded-2xl shadow-xl"
                                    >
                                        {saving ? 'Creating Course...' : 'Create Course'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}
