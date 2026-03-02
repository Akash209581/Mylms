'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

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

export default function CreateCoursePage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [formData, setFormData] = useState<FormData>({
        title: '',
        description: '',
        category: '',
        level: '',
        price: ''
    })
    const [errors, setErrors] = useState<FormErrors>({})
    const [submitting, setSubmitting] = useState(false)
    const [successMessage, setSuccessMessage] = useState('')
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    useEffect(() => {
        console.log('CreateCoursePage mounted')
        console.log('Current window.location:', window.location.href)
        console.log('API URL:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001')
        
        const stored = localStorage.getItem('user')
        console.log('User from localStorage:', stored)
        
        if (!stored) {
            console.warn('No user in localStorage, redirecting to login')
            router.push('/login')
            return
        }
        const u = JSON.parse(stored)
        console.log('Parsed user:', u)
        
        if (u.role !== 'INSTRUCTOR') {
            console.warn('User is not INSTRUCTOR, redirecting to their dashboard')
            router.push(`/dashboard/${u.role.toLowerCase()}`)
            return
        }
        console.log('User is authenticated as INSTRUCTOR')
        setUser(u)
    }, [router])

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {}

        console.log('Validating form data:', {
            titleLength: formData.title.length,
            descriptionLength: formData.description.length,
            title: formData.title,
            description: formData.description.substring(0, 50) + '...',
            category: formData.category,
            level: formData.level,
            price: formData.price
        })

        if (!formData.title.trim()) {
            newErrors.title = 'Title is required'
            console.error('❌ Title is empty')
        } else if (formData.title.length < 5) {
            newErrors.title = 'Title must be at least 5 characters'
            console.error(`❌ Title too short: ${formData.title.length} characters (need 5+)`)
        } else if (formData.title.length > 200) {
            newErrors.title = 'Title must be less than 200 characters'
            console.error(`❌ Title too long: ${formData.title.length} characters`)
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Description is required'
            console.error('❌ Description is empty')
        } else if (formData.description.length < 20) {
            newErrors.description = 'Description must be at least 20 characters'
            console.error(`❌ Description too short: ${formData.description.length} characters (need 20+)`)
        }

        if (formData.price && isNaN(Number(formData.price))) {
            newErrors.price = 'Price must be a valid number'
            console.error('❌ Price is not a valid number')
        } else if (formData.price && Number(formData.price) < 0) {
            newErrors.price = 'Price cannot be negative'
            console.error('❌ Price is negative')
        }

        setErrors(newErrors)
        
        if (Object.keys(newErrors).length === 0) {
            console.log('✅ Validation passed!')
            return true
        } else {
            console.error('❌ Validation failed with errors:', newErrors)
            return false
        }
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({ ...prev, [name]: value }))
        // Clear error for this field when user types
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({ ...prev, [name]: undefined }))
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
        console.log('Form submitted')
        
        if (!validateForm()) {
            console.log('Validation failed')
            return
        }

        console.log('Validation passed')
        setSubmitting(true)
        setErrors({})

        try {
            const payload: any = {
                title: formData.title.trim(),
                description: formData.description.trim()
            }

            if (formData.category.trim()) {
                payload.category = formData.category.trim()
            }

            if (formData.level.trim()) {
                payload.level = formData.level.trim()
            }

            if (formData.price) {
                payload.price = Number(formData.price)
            }

            console.log('Payload:', payload)
            const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/courses`
            console.log('API URL:', apiUrl)

            const response = await fetch(apiUrl, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            console.log('Response status:', response.status)
            const data = await response.json()
            console.log('Response data:', data)

            if (!response.ok) {
                setErrors({ general: data.message || 'Failed to create course' })
                setSubmitting(false)
                return
            }

            // Show success modal
            setShowSuccessModal(true)
            setSubmitting(false)

        } catch (error) {
            console.error('Error creating course:', error)
            setErrors({ general: 'Network error. Please check if the backend is running and try again.' })
            setSubmitting(false)
        }
    }

    const categories = [
        'Programming',
        'Web Development',
        'Mobile Development',
        'Data Science',
        'Machine Learning',
        'Artificial Intelligence',
        'Cybersecurity',
        'Cloud Computing',
        'DevOps',
        'Database',
        'UI/UX Design',
        'Digital Marketing',
        'Business',
        'Other'
    ]

    if (!user) {
        return null
    }

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="INSTRUCTOR" />
            <Navbar title="Create New Course" />
            <main className="page-content">
                {/* Hero */}
                <div className="hero-section hero-dark mb-8" style={{ background: 'linear-gradient(135deg,#4338ca,#6d28d9)' }}>
                    <div className="relative z-10">
                        <p className="text-white/60 text-sm mb-1">Course Creation Wizard 🎓</p>
                        <h1 className="text-3xl font-bold text-white mb-2">Create New Course</h1>
                        <p className="text-white/70 mb-4">Your course will be submitted for admin approval before going live</p>
                        {user && (
                            <p className="text-green-400 text-xs">
                                ✓ Authenticated as: {user.name} ({user.role})
                            </p>
                        )}
                    </div>
                </div>

                {/* Form */}
                <div className="glass-card p-8 max-w-3xl mx-auto">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Validation Error Summary */}
                        {Object.keys(errors).length > 0 && (
                            <div className="p-4 bg-red-500/20 border-2 border-red-500 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <div className="text-2xl">⚠️</div>
                                    <div className="flex-1">
                                        <p className="text-red-400 font-bold mb-2">Please fix the following errors:</p>
                                        <ul className="list-disc list-inside space-y-1">
                                            {errors.title && <li className="text-red-400 text-sm">{errors.title}</li>}
                                            {errors.description && <li className="text-red-400 text-sm">{errors.description}</li>}
                                            {errors.category && <li className="text-red-400 text-sm">{errors.category}</li>}
                                            {errors.level && <li className="text-red-400 text-sm">{errors.level}</li>}
                                            {errors.price && <li className="text-red-400 text-sm">{errors.price}</li>}
                                            {errors.general && <li className="text-red-400 text-sm">{errors.general}</li>}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* General Error */}
                        {errors.general && !errors.title && !errors.description && (
                            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                                <p className="text-red-400 text-sm">{errors.general}</p>
                            </div>
                        )}

                        {/* Title */}
                        <div>
                            <label htmlFor="title" className="block text-white font-medium mb-2">
                                Course Title <span className="text-red-400">*</span>
                            </label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="e.g., Complete Web Development Bootcamp 2024"
                                className={`input-field w-full ${errors.title ? 'border-red-500' : ''}`}
                                disabled={submitting}
                            />
                            {errors.title && (
                                <p className="text-red-400 text-sm mt-1">{errors.title}</p>
                            )}
                            <p className="text-gray-400 text-xs mt-1">
                                {formData.title.length}/200 characters
                            </p>
                        </div>

                        {/* Description */}
                        <div>
                            <label htmlFor="description" className="block text-white font-medium mb-2">
                                Course Description <span className="text-red-400">*</span>
                                <span className={`ml-3 text-xs ${
                                    formData.description.length >= 20 ? 'text-green-400' : 'text-orange-400'
                                }`}>
                                    ({formData.description.length} / 20 characters minimum)
                                </span>
                            </label>
                            <textarea
                                id="description"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Provide a detailed description of what students will learn in this course..."
                                rows={6}
                                className={`input-field w-full resize-none ${errors.description ? 'border-red-500' : ''}`}
                                disabled={submitting}
                            />
                            {errors.description && (
                                <p className="text-red-400 text-sm mt-1">{errors.description}</p>
                            )}
                            <p className="text-gray-400 text-xs mt-1">
                                {formData.description.length} characters (minimum 20)
                            </p>
                        </div>

                        {/* Category */}
                        <div>
                            <label htmlFor="category" className="block text-white font-medium mb-2">
                                Category <span className="text-gray-400 text-sm">(Optional)</span>
                            </label>
                            <select
                                id="category"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className={`input-field w-full ${errors.category ? 'border-red-500' : ''}`}
                                disabled={submitting}
                            >
                                <option value="">Select a category...</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                            {errors.category && (
                                <p className="text-red-400 text-sm mt-1">{errors.category}</p>
                            )}
                        </div>

                        {/* Difficulty Level */}
                        <div>
                            <label htmlFor="level" className="block text-white font-medium mb-2">
                                Difficulty Level <span className="text-gray-400 text-sm">(Optional)</span>
                            </label>
                            <select
                                id="level"
                                name="level"
                                value={formData.level}
                                onChange={handleChange}
                                className={`input-field w-full ${errors.level ? 'border-red-500' : ''}`}
                                disabled={submitting}
                            >
                                <option value="">Select difficulty level...</option>
                                <option value="Beginner">🟢 Beginner - No prior knowledge required</option>
                                <option value="Intermediate">🟡 Intermediate - Some experience needed</option>
                                <option value="Advanced">🔴 Advanced - Expert level content</option>
                            </select>
                            {errors.level && (
                                <p className="text-red-400 text-sm mt-1">{errors.level}</p>
                            )}
                        </div>

                        {/* Price */}
                        <div>
                            <label htmlFor="price" className="block text-white font-medium mb-2">
                                Price (USD) <span className="text-gray-400 text-sm">(Optional - leave empty for free)</span>
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                <input
                                    type="text"
                                    id="price"
                                    name="price"
                                    value={formData.price}
                                    onChange={handleChange}
                                    placeholder="0.00"
                                    className={`input-field w-full pl-8 ${errors.price ? 'border-red-500' : ''}`}
                                    disabled={submitting}
                                />
                            </div>
                            {errors.price && (
                                <p className="text-red-400 text-sm mt-1">{errors.price}</p>
                            )}
                            <p className="text-gray-400 text-xs mt-1">
                                Leave blank or enter 0 for a free course
                            </p>
                        </div>

                        {/* Info Box */}
                        <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                            <div className="flex gap-3">
                                <div className="text-2xl">ℹ️</div>
                                <div>
                                    <p className="text-blue-400 font-medium mb-1">Submission Process</p>
                                    <p className="text-blue-400/70 text-sm">
                                        Once you submit this course, it will be sent to the admin team for review. 
                                        You'll be notified via email once your course is approved or if any changes are needed.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => router.push('/dashboard/instructor')}
                                className="btn-secondary flex-1"
                                disabled={submitting}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn-primary flex-1"
                                disabled={submitting}
                                onClick={(e) => {
                                    console.log('Button clicked!')
                                }}
                            >
                                {submitting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Submitting...
                                    </span>
                                ) : (
                                    '🚀 Submit for Approval'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card max-w-md w-full p-8 animate-scale-in">
                        {/* Success Icon */}
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg">
                                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        </div>

                        {/* Message */}
                        <h2 className="text-2xl font-bold text-white text-center mb-3">
                            Course Submitted Successfully! 🎉
                        </h2>
                        <p className="text-gray-300 text-center mb-6">
                            Your course <span className="text-white font-semibold">"{formData.title}"</span> has been submitted for review.
                        </p>

                        {/* Info Box */}
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
                            <div className="flex gap-3">
                                <div className="text-2xl flex-shrink-0">⏳</div>
                                <div>
                                    <p className="text-blue-400 font-medium mb-1">Awaiting Admin Approval</p>
                                    <p className="text-blue-400/70 text-sm">
                                        An admin will review your course shortly. You'll receive an email notification once your course is approved or if any changes are needed.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    setShowSuccessModal(false)
                                    setFormData({
                                        title: '',
                                        description: '',
                                        category: '',
                                        level: '',
                                        price: ''
                                    })
                                }}
                                className="btn-secondary flex-1"
                            >
                                Create Another
                            </button>
                            <button
                                onClick={() => router.push('/dashboard/instructor/courses')}
                                className="btn-primary flex-1"
                            >
                                View My Courses
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
