'use client'

import { apiFetch } from '@/lib/apiFetch'

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

interface PdfModuleInput {
    id: string
    number: number
    name: string
    file: File | null
    uploadedUrl?: string
    fileName?: string
    fileSize?: number
}

interface PdfChapterInput {
    id: string
    number: number
    name: string
    modules: PdfModuleInput[]
}

export default function GlobalCreateCoursePage() {
    const router = useRouter()
    const [courseType, setCourseType] = useState<'pdf_builder' | 'standard'>('pdf_builder')

    // PDF Course Builder State
    const [pdfCourseForm, setPdfCourseForm] = useState({
        title: '',
        description: '',
        category: 'General',
        level: 'Beginner',
        price: '0',
        collegeId: '',
        targetCollegeMode: 'all',
    })

    const [chapters, setChapters] = useState<PdfChapterInput[]>([
        {
            id: 'ch-1',
            number: 1,
            name: 'Chapter 1: Foundations',
            modules: [
                {
                    id: 'mod-1-1',
                    number: 1,
                    name: 'Module 1: Introduction',
                    file: null,
                }
            ]
        }
    ])

    // Standard Course Form State
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

    const [colleges, setColleges] = useState<College[]>([])
    const [userRole, setUserRole] = useState<'STUDENT' | 'INSTRUCTOR' | 'ADMIN' | 'SUPERADMIN'>('SUPERADMIN')
    const [saving, setSaving] = useState(false)
    const [uploadProgress, setUploadProgress] = useState('')
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const descriptionRef = useRef<HTMLTextAreaElement>(null)
    const pdfDescRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (!['SUPERADMIN', 'ADMIN', 'INSTRUCTOR'].includes(u.role)) { router.push('/login'); return }
        setUserRole(u.role)
        fetchColleges()
    }, [router])

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

    // Helper functions for PDF Chapter/Module Hierarchy Management
    const addChapter = () => {
        const nextNum = chapters.length + 1
        const newCh: PdfChapterInput = {
            id: `ch-${Date.now()}`,
            number: nextNum,
            name: `Chapter ${nextNum}: Topic Name`,
            modules: [
                {
                    id: `mod-${Date.now()}-1`,
                    number: 1,
                    name: 'Module 1: Lesson Overview',
                    file: null,
                }
            ]
        }
        setChapters(prev => [...prev, newCh])
    }

    const removeChapter = (chId: string) => {
        if (chapters.length <= 1) {
            setError('Course must contain at least one chapter.')
            return
        }
        setChapters(prev => prev.filter(c => c.id !== chId).map((c, idx) => ({ ...c, number: idx + 1 })))
    }

    const updateChapter = (chId: string, fields: Partial<PdfChapterInput>) => {
        setChapters(prev => prev.map(c => c.id === chId ? { ...c, ...fields } : c))
    }

    const addModule = (chId: string) => {
        setChapters(prev => prev.map(ch => {
            if (ch.id === chId) {
                const nextModNum = ch.modules.length + 1
                const newMod: PdfModuleInput = {
                    id: `mod-${Date.now()}-${nextModNum}`,
                    number: nextModNum,
                    name: `Module ${nextModNum}: Section Name`,
                    file: null,
                }
                return { ...ch, modules: [...ch.modules, newMod] }
            }
            return ch
        }))
    }

    const removeModule = (chId: string, modId: string) => {
        setChapters(prev => prev.map(ch => {
            if (ch.id === chId) {
                if (ch.modules.length <= 1) {
                    setError('A chapter must have at least one module.')
                    return ch
                }
                const filtered = ch.modules.filter(m => m.id !== modId).map((m, idx) => ({ ...m, number: idx + 1 }))
                return { ...ch, modules: filtered }
            }
            return ch
        }))
    }

    const updateModule = (chId: string, modId: string, fields: Partial<PdfModuleInput>) => {
        setChapters(prev => prev.map(ch => {
            if (ch.id === chId) {
                const updatedMods = ch.modules.map(m => m.id === modId ? { ...m, ...fields } : m)
                return { ...ch, modules: updatedMods }
            }
            return ch
        }))
    }

    // Submit Multi-PDF Structured Hierarchy Course
    const handleSubmitPdfCourse = async () => {
        if (!pdfCourseForm.title || pdfCourseForm.title.trim().length < 3) {
            setError('Please enter a course title (at least 3 characters).')
            return
        }
        if (!pdfCourseForm.description || pdfCourseForm.description.trim().length < 10) {
            setError('Please enter a course description (at least 10 characters).')
            return
        }

        // Validate chapters and modules
        for (let i = 0; i < chapters.length; i++) {
            const ch = chapters[i]
            if (!ch.name.trim()) {
                setError(`Chapter ${ch.number} title cannot be empty.`)
                return
            }
            for (let j = 0; j < ch.modules.length; j++) {
                const mod = ch.modules[j]
                if (!mod.name.trim()) {
                    setError(`Chapter ${ch.number} -> Module ${mod.number} title cannot be empty.`)
                    return
                }
                if (!mod.file && !mod.uploadedUrl) {
                    setError(`Please upload a PDF file for Chapter ${ch.number} -> Module ${mod.number} ("${mod.name}").`)
                    return
                }
            }
        }

        setSaving(true)
        setError('')
        setUploadProgress('Preparing PDF files for upload...')

        try {
            // Upload files for modules that have a file selected
            const preparedChapters = []

            for (let cIdx = 0; cIdx < chapters.length; cIdx++) {
                const ch = chapters[cIdx]
                const preparedModules = []

                for (let mIdx = 0; mIdx < ch.modules.length; mIdx++) {
                    const mod = ch.modules[mIdx]
                    let pdfUrl = mod.uploadedUrl || ''
                    let fileName = mod.fileName || mod.file?.name || ''
                    let fileSize = mod.fileSize || mod.file?.size || 0

                    if (mod.file) {
                        setUploadProgress(`Uploading PDF for Chapter ${ch.number} -> Module ${mod.number}...`)
                        const formData = new FormData()
                        formData.append('file', mod.file)

                        const uploadRes = await api.post('/courses/upload-pdf-file', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        })

                        if (uploadRes.status === 200 || uploadRes.status === 201) {
                            pdfUrl = uploadRes.data.url
                            fileName = uploadRes.data.fileName
                            fileSize = uploadRes.data.fileSize
                        } else {
                            throw new Error(`Failed to upload PDF for Module ${mod.number}`)
                        }
                    }

                    preparedModules.push({
                        number: mod.number,
                        name: mod.name,
                        pdfUrl,
                        fileName,
                        fileSize,
                    })
                }

                preparedChapters.push({
                    number: ch.number,
                    name: ch.name,
                    modules: preparedModules,
                })
            }

            setUploadProgress('Creating course hierarchy...')

            const payload: any = {
                title: pdfCourseForm.title.trim(),
                description: pdfCourseForm.description.trim(),
                category: pdfCourseForm.category,
                level: pdfCourseForm.level,
                price: Number(pdfCourseForm.price) || 0,
                chapters: preparedChapters,
            }

            if (pdfCourseForm.targetCollegeMode === 'specific' && pdfCourseForm.collegeId) {
                payload.collegeId = pdfCourseForm.collegeId
                payload.collegeIds = [parseInt(pdfCourseForm.collegeId)]
            } else if (colleges.length > 0) {
                payload.collegeIds = colleges.map(c => c.id)
            }

            const res = await api.post('/courses/create-pdf-course', payload)

            if (res.status !== 200 && res.status !== 201) {
                setError(res.data?.message || 'Failed to create PDF course')
                return
            }

            setSuccess(true)
            setTimeout(() => router.push(`/dashboard/${userRole.toLowerCase()}/courses`), 1500)
        } catch (e: any) {
            const serverMsg = e.response?.data?.message || e.message
            setError(serverMsg || 'Failed to create PDF course')
        } finally {
            setSaving(false)
            setUploadProgress('')
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
            const res = await apiFetch(`${API_URL}/courses`, {
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

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role={userRole} />
            <Navbar title="Create Course" />
            <main className="page-content">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.push(`/dashboard/${userRole.toLowerCase()}/courses`)}
                            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[var(--bg-surface)]/10 transition-all"
                        >
                            ← Back
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-white">Create PDF Course</h1>
                            <p className="text-gray-400 text-sm">Upload multiple PDFs organized in structured Chapters & Modules</p>
                        </div>
                    </div>

                    {/* Mode Selector */}
                    <div className="bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 flex gap-1 shadow-lg self-start md:self-auto">
                        <button
                            type="button"
                            onClick={() => { setCourseType('pdf_builder'); setError('') }}
                            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                courseType === 'pdf_builder'
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                                    : 'text-gray-400 hover:text-white'
                            }`}
                        >
                            <span>📑</span> Multi-PDF Builder (Chapter → Module)
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
                        <h2 className="text-white font-black text-2xl mb-2">PDF Course Created Successfully!</h2>
                        <p className="text-gray-400 text-sm">Redirecting to your course collection...</p>
                    </div>
                ) : (
                    <div className="glass-card p-8 max-w-4xl mx-auto shadow-2xl">
                        {error && (
                            <div className="p-4 rounded-2xl mb-6 text-sm text-red-400 font-semibold flex items-center gap-3"
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                <span>❌</span> {error}
                            </div>
                        )}

                        {courseType === 'pdf_builder' ? (
                            /* Structured Multi-PDF Hierarchy Builder Form */
                            <div className="space-y-8">
                                {/* Course Basics */}
                                <div className="space-y-4 border-b border-gray-800 pb-6">
                                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                        <span>📝</span> Course Information
                                    </h3>

                                    <div>
                                        <label className="text-gray-300 text-sm font-semibold mb-2 block">Course Title *</label>
                                        <input
                                            value={pdfCourseForm.title}
                                            onChange={e => setPdfCourseForm(p => ({ ...p, title: e.target.value }))}
                                            placeholder="e.g., Complete Data Structures & Algorithms Course"
                                            className="input-field text-lg"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-gray-300 text-sm font-semibold mb-2 block">Course Description *</label>
                                        <textarea
                                            ref={pdfDescRef}
                                            value={pdfCourseForm.description}
                                            onChange={e => setPdfCourseForm(p => ({ ...p, description: e.target.value }))}
                                            rows={3}
                                            placeholder="Provide a detailed description of what students will learn in this PDF course..."
                                            className="input-field"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="text-gray-300 text-sm font-semibold mb-2 block">Category</label>
                                            <select
                                                value={pdfCourseForm.category}
                                                onChange={e => setPdfCourseForm(p => ({ ...p, category: e.target.value }))}
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
                                                value={pdfCourseForm.level}
                                                onChange={e => setPdfCourseForm(p => ({ ...p, level: e.target.value }))}
                                                className="input-field"
                                            >
                                                <option value="Beginner">Beginner</option>
                                                <option value="Intermediate">Intermediate</option>
                                                <option value="Advanced">Advanced</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-gray-300 text-sm font-semibold mb-2 block">Target Access</label>
                                            <select
                                                value={pdfCourseForm.targetCollegeMode}
                                                onChange={e => setPdfCourseForm(p => ({ ...p, targetCollegeMode: e.target.value }))}
                                                className="input-field"
                                            >
                                                <option value="all">All Colleges (Global)</option>
                                                <option value="specific">Particular College</option>
                                            </select>
                                        </div>
                                    </div>

                                    {pdfCourseForm.targetCollegeMode === 'specific' && (
                                        <div>
                                            <label className="text-gray-300 text-xs font-semibold mb-2 block">Select Target College *</label>
                                            <select
                                                value={pdfCourseForm.collegeId}
                                                onChange={e => setPdfCourseForm(p => ({ ...p, collegeId: e.target.value }))}
                                                className="input-field text-sm"
                                            >
                                                <option value="">-- Select College --</option>
                                                {colleges.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* Hierarchy Builder: Course → Chapter → Module → PDF */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                                        <div>
                                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                                <span>📚</span> Course Structure (Chapters & Modules)
                                            </h3>
                                            <p className="text-gray-400 text-xs mt-1">
                                                Add chapters, create modules inside each chapter, and upload one PDF per module.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addChapter}
                                            className="btn-success px-4 py-2 text-xs font-bold flex items-center gap-1 shadow-lg"
                                        >
                                            <span>➕</span> Add Chapter
                                        </button>
                                    </div>

                                    {/* Chapters List */}
                                    <div className="space-y-6">
                                        {chapters.map((ch) => (
                                            <div key={ch.id} className="bg-slate-900/90 border-2 border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-6">
                                                {/* Chapter Header */}
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                                                    <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                                                        <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow">
                                                            C{ch.number}
                                                        </span>
                                                        <div className="flex-1">
                                                            <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                                                                Chapter Name & Number
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={ch.name}
                                                                onChange={e => updateChapter(ch.id, { name: e.target.value })}
                                                                placeholder={`Chapter ${ch.number}: Title`}
                                                                className="input-field text-base py-1.5 font-bold text-white bg-slate-950/60"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 self-end sm:self-auto">
                                                        <button
                                                            type="button"
                                                            onClick={() => addModule(ch.id)}
                                                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow"
                                                        >
                                                            <span>➕</span> Add Module
                                                        </button>
                                                        {chapters.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeChapter(ch.id)}
                                                                className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1"
                                                            >
                                                                <span>🗑️</span> Delete Chapter
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Modules Inside Chapter */}
                                                <div className="pl-2 sm:pl-4 space-y-4 border-l-2 border-indigo-500/20">
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                        Modules inside Chapter {ch.number} ({ch.modules.length})
                                                    </p>

                                                    {ch.modules.map((mod) => (
                                                        <div key={mod.id} className="bg-slate-950/70 p-5 rounded-xl border border-slate-800 space-y-4">
                                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                                                <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                                                                    <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 font-bold text-xs">
                                                                        M{mod.number}
                                                                    </span>
                                                                    <input
                                                                        type="text"
                                                                        value={mod.name}
                                                                        onChange={e => updateModule(ch.id, mod.id, { name: e.target.value })}
                                                                        placeholder={`Module ${mod.number}: Module Name`}
                                                                        className="input-field text-sm font-semibold bg-slate-900/90 text-white py-1 flex-1"
                                                                    />
                                                                </div>
                                                                {ch.modules.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeModule(ch.id, mod.id)}
                                                                        className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 self-end sm:self-auto"
                                                                    >
                                                                        <span>🗑️</span> Remove Module
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Module PDF Upload Dropzone */}
                                                            <div className="border-2 border-dashed border-indigo-500/30 bg-indigo-950/20 rounded-xl p-4 transition-all hover:border-indigo-500/60">
                                                                <input
                                                                    type="file"
                                                                    id={`file-${ch.id}-${mod.id}`}
                                                                    accept=".pdf"
                                                                    onChange={e => {
                                                                        const selected = e.target.files?.[0] || null
                                                                        if (selected && selected.size > 50 * 1024 * 1024) {
                                                                            setError(`Selected PDF (${(selected.size / (1024 * 1024)).toFixed(2)} MB) exceeds limit of 50MB.`)
                                                                            e.target.value = ''
                                                                            return
                                                                        }
                                                                        updateModule(ch.id, mod.id, { file: selected })
                                                                    }}
                                                                    className="hidden"
                                                                />
                                                                <label htmlFor={`file-${ch.id}-${mod.id}`} className="cursor-pointer flex items-center justify-between gap-4">
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl font-black">
                                                                            📄
                                                                        </div>
                                                                        <div>
                                                                            {mod.file ? (
                                                                                <div>
                                                                                    <p className="text-indigo-300 font-bold text-sm line-clamp-1">{mod.file.name}</p>
                                                                                    <p className="text-gray-400 text-xs mt-0.5">{(mod.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                                                                </div>
                                                                            ) : mod.uploadedUrl ? (
                                                                                <div>
                                                                                    <p className="text-emerald-400 font-bold text-sm">✓ PDF Uploaded</p>
                                                                                    <p className="text-gray-400 text-xs">{mod.fileName}</p>
                                                                                </div>
                                                                            ) : (
                                                                                <div>
                                                                                    <p className="text-white font-semibold text-sm">Click to upload PDF for this module</p>
                                                                                    <p className="text-gray-400 text-xs">PDF file format up to 50MB</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <span className="px-3 py-1.5 bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-all">
                                                                        {mod.file || mod.uploadedUrl ? 'Change PDF' : 'Choose PDF'}
                                                                    </span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    <button
                                                        type="button"
                                                        onClick={() => addModule(ch.id)}
                                                        className="w-full py-2.5 border border-dashed border-purple-500/40 text-purple-400 hover:bg-purple-500/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <span>➕</span> Add Module to Chapter {ch.number}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Bottom Add Chapter Button */}
                                    <button
                                        type="button"
                                        onClick={addChapter}
                                        className="w-full py-3.5 border-2 border-dashed border-indigo-500/50 bg-indigo-950/20 text-indigo-300 hover:bg-indigo-900/30 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        <span>➕</span> Add New Chapter
                                    </button>
                                </div>

                                {/* Save Button */}
                                <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-gray-800">
                                    <p className="text-xs text-gray-400 font-medium">
                                        {uploadProgress || 'Ready to create course with full chapter and module PDF structure.'}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleSubmitPdfCourse}
                                        disabled={saving}
                                        className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold text-base rounded-2xl shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {saving ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                <span>Publishing PDF Course...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>🚀</span>
                                                <span>Publish Course with {chapters.length} Chapters</span>
                                            </>
                                        )}
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
                                        placeholder="e.g., Complete Python Programming Masterclass"
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
