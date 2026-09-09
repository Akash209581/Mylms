'use client'

import { apiFetch } from '@/lib/apiFetch'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import MarkdownToolbar from '@/components/editor/MarkdownToolbar'
import { API_URL, api } from '@/lib/api'
import axios from 'axios'
import { UploadCloud, CheckCircle2, Image as ImageIcon, Sparkles, BookOpen, Layers, Trash2, Plus, ArrowRight, Eye } from 'lucide-react'

interface College {
    id: number
    name: string
}

interface CourseChapterInput {
    id: string
    number: number
    name: string
    file: File | null
    uploadedUrl?: string
    fileName?: string
    fileSize?: number
    uploadProgress?: number
    isUploading?: boolean
}

interface CourseModuleInput {
    id: string
    number: number
    name: string
    chapters: CourseChapterInput[]
}

const PRESET_BANNERS = [
    {
        id: 'python-neon',
        name: 'Python & DSA',
        category: 'Programming',
        url: 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: 'data-science',
        name: 'Data Science',
        category: 'Data Science',
        url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: 'code-laptop',
        name: 'Programming',
        category: 'Programming',
        url: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: 'web-dev',
        name: 'Web Dev',
        category: 'Web Development',
        url: 'https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: 'ai-ml',
        name: 'AI & ML',
        category: 'Data Science',
        url: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?auto=format&fit=crop&w=800&q=80',
    },
    {
        id: 'cybersecurity',
        name: 'Cybersecurity',
        category: 'Cybersecurity',
        url: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=800&q=80',
    },
]

export default function GlobalCreateCoursePage() {
    const router = useRouter()
    const [courseType, setCourseType] = useState<'pdf_builder' | 'standard'>('pdf_builder')

    // PDF Course Builder State
    const [pdfCourseForm, setPdfCourseForm] = useState({
        title: '',
        description: '',
        thumbnail: PRESET_BANNERS[0].url,
        category: 'General',
        level: 'Beginner',
        price: '0',
        collegeId: '',
        targetCollegeMode: 'all',
    })

    // Course Structure: Modules -> Chapters -> PDF
    const [modules, setModules] = useState<CourseModuleInput[]>([
        {
            id: 'mod-1',
            number: 1,
            name: 'Module 1: Foundations',
            chapters: [
                {
                    id: 'ch-1-1',
                    number: 1,
                    name: 'Chapter 1: Introduction & Basics',
                    file: null,
                }
            ]
        }
    ])

    // Standard Course Form State
    const [form, setForm] = useState({
        title: '',
        description: '',
        thumbnail: PRESET_BANNERS[0].url,
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
    const [overallProgress, setOverallProgress] = useState<number>(0)
    const [uploadStatusText, setUploadStatusText] = useState('')
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    // Banner upload state
    const [bannerUploading, setBannerUploading] = useState(false)
    const [bannerUploadProgress, setBannerUploadProgress] = useState(0)
    const bannerFileInputRef = useRef<HTMLInputElement>(null)

    const descriptionRef = useRef<HTMLTextAreaElement>(null)
    const pdfDescRef = useRef<HTMLTextAreaElement>(null)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (!['SUPERADMIN', 'ADMIN', 'INSTRUCTOR', 'CONTENT_CREATOR'].includes(u.role)) { router.push('/login'); return }
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

    // Banner Upload Handler
    const handleBannerUpload = async (file: File) => {
        if (!file) return
        if (file.size > 10 * 1024 * 1024) {
            setError('Banner image size must be less than 10MB')
            return
        }

        setBannerUploading(true)
        setBannerUploadProgress(10)
        setError('')

        try {
            const formData = new FormData()
            formData.append('file', file)

            const res = await api.post('/courses/upload-banner', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        setBannerUploadProgress(percent)
                    }
                }
            })

            if (res.data?.url) {
                setPdfCourseForm(prev => ({ ...prev, thumbnail: res.data.url }))
                setForm(prev => ({ ...prev, thumbnail: res.data.url }))
                setBannerUploadProgress(100)
            }
        } catch (err: any) {
            console.error('Banner upload failed:', err)
            setError(err.response?.data?.message || 'Failed to upload course banner')
        } finally {
            setBannerUploading(false)
            setTimeout(() => setBannerUploadProgress(0), 1000)
        }
    }

    // Helper functions for Course Structure: Course -> Module -> Chapter -> PDF
    const addModule = () => {
        const nextNum = modules.length + 1
        const newMod: CourseModuleInput = {
            id: `mod-${Date.now()}`,
            number: nextNum,
            name: `Module ${nextNum}: Topic Title`,
            chapters: [
                {
                    id: `ch-${Date.now()}-1`,
                    number: 1,
                    name: 'Chapter 1: Overview & Concepts',
                    file: null,
                }
            ]
        }
        setModules(prev => [...prev, newMod])
    }

    const removeModule = (modId: string) => {
        if (modules.length <= 1) {
            setError('Course must contain at least one module.')
            return
        }
        setModules(prev => prev.filter(m => m.id !== modId).map((m, idx) => ({ ...m, number: idx + 1 })))
    }

    const updateModule = (modId: string, fields: Partial<CourseModuleInput>) => {
        setModules(prev => prev.map(m => m.id === modId ? { ...m, ...fields } : m))
    }

    const addChapter = (modId: string) => {
        setModules(prev => prev.map(mod => {
            if (mod.id === modId) {
                const nextChNum = mod.chapters.length + 1
                const newCh: CourseChapterInput = {
                    id: `ch-${Date.now()}-${nextChNum}`,
                    number: nextChNum,
                    name: `Chapter ${nextChNum}: Section Topic`,
                    file: null,
                }
                return { ...mod, chapters: [...mod.chapters, newCh] }
            }
            return mod
        }))
    }

    const removeChapter = (modId: string, chId: string) => {
        setModules(prev => prev.map(mod => {
            if (mod.id === modId) {
                if (mod.chapters.length <= 1) {
                    setError('A module must have at least one chapter.')
                    return mod
                }
                const filtered = mod.chapters.filter(c => c.id !== chId).map((c, idx) => ({ ...c, number: idx + 1 }))
                return { ...mod, chapters: filtered }
            }
            return mod
        }))
    }

    const updateChapter = (modId: string, chId: string, fields: Partial<CourseChapterInput>) => {
        setModules(prev => prev.map(mod => {
            if (mod.id === modId) {
                const updatedChs = mod.chapters.map(c => c.id === chId ? { ...c, ...fields } : c)
                return { ...mod, chapters: updatedChs }
            }
            return mod
        }))
    }

    // Direct single PDF upload per chapter with real-time progress bar
    const uploadSingleChapterPdf = async (modId: string, chId: string, file: File) => {
        if (!file) return
        if (file.size > 50 * 1024 * 1024) {
            setError(`Selected PDF (${(file.size / (1024 * 1024)).toFixed(2)} MB) exceeds 50MB limit.`)
            return
        }

        updateChapter(modId, chId, { file, isUploading: true, uploadProgress: 10 })

        try {
            const formData = new FormData()
            formData.append('file', file)

            const uploadRes = await api.post('/courses/upload-pdf-file', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    if (progressEvent.total) {
                        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                        updateChapter(modId, chId, { uploadProgress: percent })
                    }
                }
            })

            if (uploadRes.data?.url) {
                updateChapter(modId, chId, {
                    uploadedUrl: uploadRes.data.url,
                    fileName: uploadRes.data.fileName || file.name,
                    fileSize: uploadRes.data.fileSize || file.size,
                    uploadProgress: 100,
                    isUploading: false
                })
            }
        } catch (err: any) {
            console.error('Chapter PDF upload error:', err)
            setError(err.response?.data?.message || `Failed to upload PDF for chapter`)
            updateChapter(modId, chId, { isUploading: false, uploadProgress: 0 })
        }
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

        // Validate modules and chapters
        let totalChaptersCount = 0
        for (let i = 0; i < modules.length; i++) {
            const mod = modules[i]
            if (!mod.name.trim()) {
                setError(`Module ${mod.number} title cannot be empty.`)
                return
            }
            for (let j = 0; j < mod.chapters.length; j++) {
                totalChaptersCount++
                const ch = mod.chapters[j]
                if (!ch.name.trim()) {
                    setError(`Module ${mod.number} -> Chapter ${ch.number} title cannot be empty.`)
                    return
                }
                if (!ch.file && !ch.uploadedUrl) {
                    setError(`Please upload a PDF file for Module ${mod.number} -> Chapter ${ch.number} ("${ch.name}").`)
                    return
                }
            }
        }

        setSaving(true)
        setError('')
        setOverallProgress(5)
        setUploadStatusText('Preparing chapters and PDF files...')

        try {
            const preparedModules = []
            let processedChapters = 0

            for (let mIdx = 0; mIdx < modules.length; mIdx++) {
                const mod = modules[mIdx]
                const preparedChapters = []

                for (let cIdx = 0; cIdx < mod.chapters.length; cIdx++) {
                    const ch = mod.chapters[cIdx]
                    let pdfUrl = ch.uploadedUrl || ''
                    let fileName = ch.fileName || ch.file?.name || ''
                    let fileSize = ch.fileSize || ch.file?.size || 0

                    if (ch.file && !ch.uploadedUrl) {
                        setUploadStatusText(`Uploading PDF for Module ${mod.number} -> Chapter ${ch.number}...`)
                        const formData = new FormData()
                        formData.append('file', ch.file)

                        const uploadRes = await api.post('/courses/upload-pdf-file', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' },
                            onUploadProgress: (progressEvent) => {
                                if (progressEvent.total) {
                                    const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
                                    updateChapter(mod.id, ch.id, { uploadProgress: percent, isUploading: true })
                                }
                            }
                        })

                        if (uploadRes.status === 200 || uploadRes.status === 201) {
                            pdfUrl = uploadRes.data.url
                            fileName = uploadRes.data.fileName
                            fileSize = uploadRes.data.fileSize
                            updateChapter(mod.id, ch.id, { uploadedUrl: pdfUrl, fileName, fileSize, isUploading: false, uploadProgress: 100 })
                        } else {
                            throw new Error(`Failed to upload PDF for Chapter ${ch.number}`)
                        }
                    }

                    processedChapters++
                    setOverallProgress(Math.round((processedChapters / totalChaptersCount) * 80) + 10)

                    preparedChapters.push({
                        number: ch.number,
                        title: ch.name,
                        pdfUrl,
                        fileName,
                        fileSize,
                    })
                }

                preparedModules.push({
                    number: mod.number,
                    title: mod.name,
                    chapters: preparedChapters,
                })
            }

            setOverallProgress(90)
            setUploadStatusText('Creating course structure in database...')

            const payload: any = {
                title: pdfCourseForm.title.trim(),
                description: pdfCourseForm.description.trim(),
                thumbnail: pdfCourseForm.thumbnail || '',
                category: pdfCourseForm.category,
                level: pdfCourseForm.level,
                price: Number(pdfCourseForm.price) || 0,
                modules: preparedModules,
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

            setOverallProgress(100)
            setSuccess(true)
            setTimeout(() => router.push(`/dashboard/${userRole.toLowerCase()}/courses`), 1500)
        } catch (e: any) {
            const serverMsg = e.response?.data?.message || e.message
            setError(serverMsg || 'Failed to create PDF course')
        } finally {
            setSaving(false)
            setUploadStatusText('')
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
                            <p className="text-gray-400 text-sm">Upload multiple PDFs organized in structured Modules & Chapters</p>
                        </div>
                    </div>

                    {/* Mode Selector */}
                    <div className="bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 flex gap-1 shadow-lg self-start md:self-auto">
                        <button
                            type="button"
                            onClick={() => { setCourseType('pdf_builder'); setError('') }}
                            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${courseType === 'pdf_builder'
                                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <span>📑</span> Multi-PDF Builder (Module → Chapter)
                        </button>
                        <button
                            type="button"
                            onClick={() => { setCourseType('standard'); setError('') }}
                            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${courseType === 'standard'
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
                    <div className="glass-card p-8 max-w-5xl mx-auto shadow-2xl space-y-8">
                        {error && (
                            <div className="p-4 rounded-2xl mb-6 text-sm text-red-400 font-semibold flex items-center gap-3"
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                                <span>❌</span> {error}
                            </div>
                        )}

                        {courseType === 'pdf_builder' ? (
                            /* Structured Multi-PDF Hierarchy Builder Form */
                            <div className="space-y-8">
                                {/* Course Banner Section */}
                                <div className="space-y-4 border-b border-gray-800 pb-8">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                            <ImageIcon size={20} className="text-indigo-400" />
                                            <span>Course Banner Image</span>
                                        </h3>
                                        <span className="text-xs text-gray-400">Displayed on student catalog cards</span>
                                    </div>

                                    {/* Banner Preview & Upload Grid */}
                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                                        {/* Left Side: Live Course Card Mockup */}
                                        <div className="lg:col-span-5 space-y-2">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                                                <Eye size={14} className="text-indigo-400" />
                                                <span>Live Card Preview</span>
                                            </p>
                                            <div className="rounded-[20px] bg-slate-900 border border-slate-800 shadow-xl overflow-hidden flex flex-col">
                                                <div className="h-44 relative overflow-hidden bg-slate-950">
                                                    {pdfCourseForm.thumbnail ? (
                                                        <img
                                                            src={pdfCourseForm.thumbnail}
                                                            alt="Banner Preview"
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-4xl">
                                                            📚
                                                        </div>
                                                    )}
                                                    {/* Top Badges */}
                                                    <div className="absolute top-3 left-3 z-10">
                                                        <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-white/10">
                                                            {pdfCourseForm.category || 'GENERAL'}
                                                        </span>
                                                    </div>
                                                    <div className="absolute top-3 right-3 z-10">
                                                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black backdrop-blur-md">
                                                            {pdfCourseForm.level || 'Beginner'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="p-4 space-y-2">
                                                    <h4 className="text-base font-bold text-white line-clamp-1">
                                                        {pdfCourseForm.title || 'Course Title Preview'}
                                                    </h4>
                                                    <p className="text-xs text-gray-400 line-clamp-2">
                                                        {pdfCourseForm.description || 'This course is structured with multi-module PDF presentations.'}
                                                    </p>
                                                    <div className="pt-2 flex items-center justify-between text-[11px] text-gray-500 border-t border-slate-800/80">
                                                        <span>📁 {modules.length} Modules</span>
                                                        <span>📑 {modules.reduce((acc, m) => acc + m.chapters.length, 0)} Chapters</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Right Side: Preset Banners & Upload Button */}
                                        <div className="lg:col-span-7 space-y-4">
                                            {/* Preset Options */}
                                            <div>
                                                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                                                    <Sparkles size={14} className="text-amber-400" />
                                                    <span>Choose Curated Preset Banner (1-Click)</span>
                                                </label>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                                    {PRESET_BANNERS.map(preset => {
                                                        const isSelected = pdfCourseForm.thumbnail === preset.url
                                                        return (
                                                            <button
                                                                key={preset.id}
                                                                type="button"
                                                                onClick={() => setPdfCourseForm(p => ({ ...p, thumbnail: preset.url }))}
                                                                className={`relative group rounded-xl overflow-hidden border-2 text-left transition-all h-20 ${isSelected
                                                                        ? 'border-indigo-500 ring-2 ring-indigo-500/50 scale-[1.02]'
                                                                        : 'border-slate-800 hover:border-slate-600 opacity-75 hover:opacity-100'
                                                                    }`}
                                                            >
                                                                <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-2">
                                                                    <span className="text-[10px] font-bold text-white leading-tight drop-shadow">{preset.name}</span>
                                                                </div>
                                                                {isSelected && (
                                                                    <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center text-white text-[10px]">
                                                                        ✓
                                                                    </div>
                                                                )}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                            {/* Custom Upload Dropzone */}
                                            <div>
                                                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider block mb-2">
                                                    Or Upload Custom Banner Image
                                                </label>
                                                <input
                                                    type="file"
                                                    ref={bannerFileInputRef}
                                                    accept="image/*"
                                                    onChange={e => {
                                                        const file = e.target.files?.[0]
                                                        if (file) handleBannerUpload(file)
                                                    }}
                                                    className="hidden"
                                                />
                                                <div
                                                    onClick={() => bannerFileInputRef.current?.click()}
                                                    className="border-2 border-dashed border-slate-700 hover:border-indigo-500 bg-slate-900/60 hover:bg-slate-900 rounded-xl p-4 text-center cursor-pointer transition-all"
                                                >
                                                    {bannerUploading ? (
                                                        <div className="space-y-2">
                                                            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                                            <p className="text-xs text-indigo-300 font-bold">Uploading Banner ({bannerUploadProgress}%)...</p>
                                                            <div className="w-full bg-slate-800 rounded-full h-1.5 max-w-xs mx-auto overflow-hidden">
                                                                <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${bannerUploadProgress}%` }} />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-center gap-3">
                                                            <UploadCloud size={24} className="text-indigo-400" />
                                                            <div className="text-left">
                                                                <p className="text-xs font-bold text-white">Click to upload custom image</p>
                                                                <p className="text-[10px] text-gray-400">PNG, JPG, WebP up to 10MB</p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Course Basics */}
                                <div className="space-y-4 border-b border-gray-800 pb-6">
                                    <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                        <BookOpen size={20} className="text-purple-400" />
                                        <span>Course Information</span>
                                    </h3>

                                    <div>
                                        <label className="text-gray-300 text-sm font-semibold mb-2 block">Course Title *</label>
                                        <input
                                            value={pdfCourseForm.title}
                                            onChange={e => setPdfCourseForm(p => ({ ...p, title: e.target.value }))}
                                            placeholder="e.g., Data Structures and Algorithms through Python"
                                            className="input-field text-lg font-bold"
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
                                                className="input-field font-semibold"
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
                                                className="input-field font-semibold"
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
                                                className="input-field font-semibold"
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

                                {/* Hierarchy Builder: Course → Modules → Chapters → PDF */}
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                                        <div>
                                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                                <Layers size={20} className="text-indigo-400" />
                                                <span>Course Structure (Modules & Chapters)</span>
                                            </h3>
                                            <p className="text-gray-400 text-xs mt-1">
                                                Create modules for the course, add chapters inside each module, and upload one PDF per chapter.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={addModule}
                                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all"
                                        >
                                            <Plus size={16} />
                                            <span>Add Module</span>
                                        </button>
                                    </div>

                                    {/* Modules List */}
                                    <div className="space-y-6">
                                        {modules.map((mod) => (
                                            <div key={mod.id} className="bg-slate-900/90 border-2 border-indigo-500/30 rounded-2xl p-6 shadow-xl space-y-6">
                                                {/* Module Header */}
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-800/60 p-4 rounded-xl border border-slate-700">
                                                    <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                                                        <span className="w-9 h-9 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow">
                                                            M{mod.number}
                                                        </span>
                                                        <div className="flex-1">
                                                            <label className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                                                                Module Name & Number
                                                            </label>
                                                            <input
                                                                type="text"
                                                                value={mod.name}
                                                                onChange={e => updateModule(mod.id, { name: e.target.value })}
                                                                placeholder={`Module ${mod.number}: Topic Title`}
                                                                className="input-field text-base py-1.5 font-bold text-white bg-slate-950/60"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 self-end sm:self-auto">
                                                        <button
                                                            type="button"
                                                            onClick={() => addChapter(mod.id)}
                                                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 shadow"
                                                        >
                                                            <Plus size={14} />
                                                            <span>Add Chapter</span>
                                                        </button>
                                                        {modules.length > 1 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => removeModule(mod.id)}
                                                                className="px-3 py-1.5 bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1"
                                                            >
                                                                <Trash2 size={14} />
                                                                <span>Delete Module</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Chapters Inside Module */}
                                                <div className="pl-2 sm:pl-4 space-y-4 border-l-2 border-indigo-500/20">
                                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                                                        Chapters inside Module {mod.number} ({mod.chapters.length})
                                                    </p>

                                                    {mod.chapters.map((ch) => (
                                                        <div key={ch.id} className="bg-slate-950/70 p-5 rounded-xl border border-slate-800 space-y-4">
                                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                                                <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                                                                    <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-400 font-bold text-xs">
                                                                        Ch {mod.number}.{ch.number}
                                                                    </span>
                                                                    <input
                                                                        type="text"
                                                                        value={ch.name}
                                                                        onChange={e => updateChapter(mod.id, ch.id, { name: e.target.value })}
                                                                        placeholder={`Chapter ${ch.number}: Chapter Title`}
                                                                        className="input-field text-sm font-semibold bg-slate-900/90 text-white py-1.5 flex-1"
                                                                    />
                                                                </div>
                                                                {mod.chapters.length > 1 && (
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => removeChapter(mod.id, ch.id)}
                                                                        className="text-xs text-red-400 hover:text-red-300 font-semibold flex items-center gap-1 self-end sm:self-auto"
                                                                    >
                                                                        <Trash2 size={13} />
                                                                        <span>Remove Chapter</span>
                                                                    </button>
                                                                )}
                                                            </div>

                                                            {/* Chapter PDF Upload Dropzone with Live Progress */}
                                                            <div className="border-2 border-dashed border-indigo-500/30 bg-indigo-950/20 rounded-xl p-4 transition-all hover:border-indigo-500/60">
                                                                <input
                                                                    type="file"
                                                                    id={`file-${mod.id}-${ch.id}`}
                                                                    accept=".pdf"
                                                                    onChange={e => {
                                                                        const selected = e.target.files?.[0] || null
                                                                        if (selected) {
                                                                            uploadSingleChapterPdf(mod.id, ch.id, selected)
                                                                        }
                                                                    }}
                                                                    className="hidden"
                                                                />
                                                                <label htmlFor={`file-${mod.id}-${ch.id}`} className="cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                                                    <div className="flex items-center gap-3 flex-1">
                                                                        <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl font-black shrink-0">
                                                                            📄
                                                                        </div>
                                                                        <div className="flex-1 min-w-0">
                                                                            {ch.isUploading ? (
                                                                                <div className="space-y-1.5 w-full max-w-md">
                                                                                    <div className="flex justify-between text-xs font-bold text-indigo-300">
                                                                                        <span>Uploading PDF...</span>
                                                                                        <span>{ch.uploadProgress || 0}%</span>
                                                                                    </div>
                                                                                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                                                                        <div
                                                                                            className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-200"
                                                                                            style={{ width: `${ch.uploadProgress || 0}%` }}
                                                                                        />
                                                                                    </div>
                                                                                </div>
                                                                            ) : ch.uploadedUrl ? (
                                                                                <div>
                                                                                    <p className="text-emerald-400 font-bold text-sm flex items-center gap-1.5">
                                                                                        <CheckCircle2 size={16} />
                                                                                        <span>PDF Uploaded & Ready</span>
                                                                                    </p>
                                                                                    <p className="text-gray-400 text-xs truncate max-w-sm">{ch.fileName} ({((ch.fileSize || 0) / (1024 * 1024)).toFixed(2)} MB)</p>
                                                                                </div>
                                                                            ) : ch.file ? (
                                                                                <div>
                                                                                    <p className="text-indigo-300 font-bold text-sm line-clamp-1">{ch.file.name}</p>
                                                                                    <p className="text-gray-400 text-xs mt-0.5">{(ch.file.size / (1024 * 1024)).toFixed(2)} MB • Ready to upload</p>
                                                                                </div>
                                                                            ) : (
                                                                                <div>
                                                                                    <p className="text-white font-semibold text-sm">Click to upload PDF for this chapter</p>
                                                                                    <p className="text-gray-400 text-xs">PDF format up to 50MB</p>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    <span className="px-3.5 py-1.5 bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-all shrink-0">
                                                                        {ch.uploadedUrl || ch.file ? 'Change PDF' : 'Choose PDF'}
                                                                    </span>
                                                                </label>
                                                            </div>
                                                        </div>
                                                    ))}

                                                    <button
                                                        type="button"
                                                        onClick={() => addChapter(mod.id)}
                                                        className="w-full py-2.5 border border-dashed border-purple-500/40 text-purple-400 hover:bg-purple-500/10 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Plus size={14} />
                                                        <span>Add Chapter to Module {mod.number}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Bottom Add Module Button */}
                                    <button
                                        type="button"
                                        onClick={addModule}
                                        className="w-full py-3.5 border-2 border-dashed border-indigo-500/50 bg-indigo-950/20 text-indigo-300 hover:bg-indigo-900/30 rounded-2xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
                                    >
                                        <Plus size={18} />
                                        <span>Add New Module</span>
                                    </button>
                                </div>

                                {/* Save Button & Overall Progress */}
                                <div className="pt-6 space-y-4 border-t border-gray-800">
                                    {saving && (
                                        <div className="space-y-2 bg-slate-900/80 p-4 rounded-xl border border-indigo-500/30">
                                            <div className="flex justify-between text-xs font-bold text-indigo-300">
                                                <span>{uploadStatusText}</span>
                                                <span>{overallProgress}%</span>
                                            </div>
                                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-indigo-500 to-purple-600 h-full transition-all duration-300"
                                                    style={{ width: `${overallProgress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <p className="text-xs text-gray-400 font-medium">
                                            {modules.length} Modules • {modules.reduce((acc, m) => acc + m.chapters.length, 0)} Chapters total
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
                                                    <span>Publish Course with {modules.length} Modules</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Standard Course Form */
                            <div className="space-y-6">
                                {/* Banner section in standard form */}
                                <div className="space-y-3 pb-4 border-b border-gray-800">
                                    <label className="text-gray-300 text-sm font-semibold block">Course Banner</label>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        {PRESET_BANNERS.slice(0, 4).map(preset => (
                                            <button
                                                key={preset.id}
                                                type="button"
                                                onClick={() => setForm(p => ({ ...p, thumbnail: preset.url }))}
                                                className={`relative rounded-xl overflow-hidden h-20 border-2 transition-all ${form.thumbnail === preset.url ? 'border-indigo-500 ring-2 ring-indigo-500/50' : 'border-slate-800 opacity-70 hover:opacity-100'
                                                    }`}
                                            >
                                                <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1">
                                                    <span className="text-[10px] font-bold text-white text-center">{preset.name}</span>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-gray-400 text-sm mb-2 block">Course Title *</label>
                                    <input
                                        value={form.title}
                                        onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                                        placeholder="e.g., Complete Python Programming Masterclass"
                                        className="input-field text-lg font-bold"
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
