'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

// Dynamic imports removed as step 2 no longer relies on LessonEditor herein


interface FormData {
    title: string
    description: string
    category: string
    level: string
    price: string
}

interface FormErrors {
    title?: string
    description?: string
    category?: string
    level?: string
    price?: string
    general?: string
}

const categories = [
    'Programming', 'Web Development', 'Mobile Development',
    'Data Science', 'Machine Learning', 'Artificial Intelligence',
    'Cybersecurity', 'Cloud Computing', 'DevOps', 'Database',
    'UI/UX Design', 'Digital Marketing', 'Business', 'Other'
]

export default function CreateCoursePage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)

    /* ── Wizard step: 1 = course info form, 2 = content editor ── */
    const [step, setStep] = useState<1 | 2>(1)
    const [createdCourseId, setCreatedCourseId] = useState<number | null>(null)
    const [createdCourseTitle, setCreatedCourseTitle] = useState('')

    /* ── Step 1 state ── */
    const [formData, setFormData] = useState<FormData>({
        title: '', description: '', category: '', level: '', price: ''
    })
    const [errors, setErrors] = useState<FormErrors>({})
    const [submitting, setSubmitting] = useState(false)

    /* ── Auth guard ── */
    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'INSTRUCTOR') router.push(`/dashboard/${u.role.toLowerCase()}`)
        setUser(u)
    }, [router])

    /* ── Validation ── */
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {}
        if (!formData.title.trim()) newErrors.title = 'Title is required'
        else if (formData.title.length < 5) newErrors.title = 'Title must be at least 5 characters'
        else if (formData.title.length > 200) newErrors.title = 'Title must be less than 200 characters'
        if (!formData.description.trim()) newErrors.description = 'Description is required'
        else if (formData.description.length < 20) newErrors.description = 'Description must be at least 20 characters'
        if (formData.price && isNaN(Number(formData.price))) newErrors.price = 'Price must be a valid number'
        else if (formData.price && Number(formData.price) < 0) newErrors.price = 'Price cannot be negative'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        if (errors[name as keyof FormErrors]) setErrors(prev => ({ ...prev, [name]: undefined }))
    }

    /* ── Step 1 submit: create course → move to Step 2 ── */
    const handleNext = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validateForm()) return
        setSubmitting(true)
        setErrors({})
        try {
            const payload: any = {
                title: formData.title.trim(),
                description: formData.description.trim()
            }
            if (formData.category.trim()) payload.category = formData.category.trim()
            if (formData.level.trim()) payload.level = formData.level.trim()
            if (formData.price) payload.price = Number(formData.price)

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/courses`,
                { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }
            )
            const data = await response.json()
            if (!response.ok) { setErrors({ general: data.message || 'Failed to create course' }); setSubmitting(false); return }

            const courseId = data.id ?? data.courseId
            setCreatedCourseId(courseId)
            setCreatedCourseTitle(formData.title.trim())
            // Route perfectly to the lesson editor where user can edit the content
            router.push(`/dashboard/instructor/edit-lesson/${courseId}`)
        } catch {
            setErrors({ general: 'Network error. Please check if the backend is running.' })
        } finally {
            setSubmitting(false)
        }
    }

    if (!user) return null

    /* ─────────────────────────────────────────────
       STEP INDICATOR
    ───────────────────────────────────────────── */
    const StepIndicator = () => (
        <div className="flex items-center gap-0 mb-8">
            {/* Step 1 */}
            <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                    ${step >= 1 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-[var(--bg-surface)]/10 text-white/40'}`}>
                    {step > 1 ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    ) : '1'}
                </div>
                <span className={`text-sm font-medium ${step >= 1 ? 'text-white' : 'text-white/40'}`}>Course Info</span>
            </div>

            {/* Connector */}
            <div className="flex-1 mx-4 h-0.5 rounded-full bg-[var(--bg-surface)]/10 overflow-hidden max-w-[80px]">
                <div className={`h-full bg-indigo-500 transition-all duration-500 ${step >= 2 ? 'w-full' : 'w-0'}`} />
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
                    ${step >= 2 ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-[var(--bg-surface)]/10 text-white/40'}`}>
                    2
                </div>
                <span className={`text-sm font-medium ${step >= 2 ? 'text-white' : 'text-white/40'}`}>Course Content</span>
            </div>
        </div>
    )

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="INSTRUCTOR" />
            <Navbar title="Create New Course" />
            <main className="page-content">

                {/* ── Hero ── */}
                <div className="hero-section hero-dark mb-8" style={{ background: 'linear-gradient(135deg,#4338ca,#6d28d9)' }}>
                    <div className="relative z-10">
                        <p className="text-white/60 text-sm mb-1">Course Creation Wizard 🎓</p>
                        <h1 className="text-3xl font-bold text-white mb-2">Create New Course</h1>
                        <p className="text-white/70 mb-4">
                            Fill in the course details
                        </p>
                        {user && (
                            <p className="text-green-400 text-xs">
                                ✓ Authenticated as: {user.name} ({user.role})
                            </p>
                        )}
                    </div>
                </div>

                {/* ══════════════════════════════
                    STEP 1 — Course Info Form
                ══════════════════════════════ */}
                <div className="glass-card p-8 max-w-3xl mx-auto">
                    <form onSubmit={handleNext} className="space-y-6">
                        {/* Errors */}
                        {Object.keys(errors).length > 0 && (
                            <div className="p-4 bg-red-500/20 border-2 border-red-500 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <div className="text-2xl">⚠️</div>
                                    <div className="flex-1">
                                        <p className="text-red-400 font-bold mb-2">Please fix the following errors:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            {errors.title && <li className="text-red-400 text-sm">{errors.title}</li>}
                                            {errors.description && <li className="text-red-400 text-sm">{errors.description}</li>}
                                            {errors.price && <li className="text-red-400 text-sm">{errors.price}</li>}
                                            {errors.general && <li className="text-red-400 text-sm">{errors.general}</li>}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Title */}
                        <div>
                            <label htmlFor="title" className="block text-white font-medium mb-2">
                                Course Title <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text" id="title" name="title"
                                value={formData.title} onChange={handleChange}
                                placeholder="e.g., Complete Web Development Bootcamp 2024"
                                className={`input-field w-full ${errors.title ? 'border-red-500' : ''}`}
                                disabled={submitting}
                            />
                            {errors.title && <p className="text-red-400 text-sm mt-1">{errors.title}</p>}
                            <p className="text-gray-400 text-xs mt-1">{formData.title.length}/200 characters</p>
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-white font-medium mb-2">
                                Course Description <span className="text-red-400">*</span>
                                <span className={`ml-3 text-xs ${formData.description.length >= 20 ? 'text-green-400' : 'text-orange-400'}`}>
                                    ({formData.description.length} / 20 characters minimum)
                                </span>
                            </label>
                            <textarea
                                id="description" name="description"
                                value={formData.description} onChange={handleChange}
                                placeholder="Provide a detailed description of what students will learn in this course..."
                                rows={6}
                                className={`input-field w-full resize-none ${errors.description ? 'border-red-500' : ''}`}
                                disabled={submitting}
                            />
                            {errors.description && <p className="text-red-400 text-sm mt-1">{errors.description}</p>}
                        </div>

                        {/* Category */}
                        <div>
                            <label htmlFor="category" className="block text-white font-medium mb-2">
                                Category <span className="text-gray-400 text-sm">(Optional)</span>
                            </label>
                            <select id="category" name="category" value={formData.category} onChange={handleChange}
                                className="input-field w-full" disabled={submitting}>
                                <option value="">Select a category...</option>
                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                        </div>

                        {/* Level */}
                        <div>
                            <label htmlFor="level" className="block text-white font-medium mb-2">
                                Difficulty Level <span className="text-gray-400 text-sm">(Optional)</span>
                            </label>
                            <select id="level" name="level" value={formData.level} onChange={handleChange}
                                className="input-field w-full" disabled={submitting}>
                                <option value="">Select difficulty level...</option>
                                <option value="Beginner">🟢 Beginner — No prior knowledge required</option>
                                <option value="Intermediate">🟡 Intermediate — Some experience needed</option>
                                <option value="Advanced">🔴 Advanced — Expert level content</option>
                            </select>
                        </div>

                        {/* Price */}
                        <div>
                            <label htmlFor="price" className="block text-white font-medium mb-2">
                                Price (USD) <span className="text-gray-400 text-sm">(Optional — leave empty for free)</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                <input
                                    type="text" id="price" name="price"
                                    value={formData.price} onChange={handleChange}
                                    placeholder="0.00"
                                    className={`input-field w-full pl-8 ${errors.price ? 'border-red-500' : ''}`}
                                    disabled={submitting}
                                />
                            </div>
                            {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}
                            <p className="text-gray-400 text-xs mt-1">Leave blank or enter 0 for a free course</p>
                        </div>

                        {/* Info box */}
                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <div className="flex gap-3">
                                <div className="text-2xl">ℹ️</div>
                                <div>
                                    <p className="text-blue-400 font-medium mb-1">What happens next?</p>
                                    <p className="text-blue-400/70 text-sm">
                                        After saving these details you'll be taken to the Course Builder to add modules and lessons.
                                        You can submit the draft for admin approval from your dashboard once finished.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4">
                            <button type="button" onClick={() => router.push('/dashboard/instructor')}
                                className="btn-secondary flex-1" disabled={submitting}>
                                Cancel
                            </button>
                            <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                                {submitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Creating course…
                                    </span>
                                ) : (
                                    <span className="flex items-center justify-center gap-2">
                                        Create Course Outline
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </span>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    )
}
