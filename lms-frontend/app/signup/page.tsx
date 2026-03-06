'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '@/lib/api'

const INDIAN_STATES = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
]

const COUNTRIES = ['India', 'United States', 'United Kingdom', 'Canada', 'Australia', 'Other']

interface Organization {
    id: number
    name: string
    type?: string
    active: boolean
}

export default function SignupPage() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(1)
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        mobileNumber: '',
        country: '',
        state: '',
        course: '',
        branch: '',
        pursuingYear: '',
        semester: '',
        registrationNumber: '',
        collegeName: '',
        organizationId: ''
    })
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    useEffect(() => {
        // Fetch available organizations
        const fetchOrganizations = async () => {
            try {
                const response = await api.get('/organizations')
                setOrganizations(response.data.filter((org: Organization) => org.active))
            } catch (err) {
                console.error('Failed to fetch organizations:', err)
            }
        }
        fetchOrganizations()
    }, [])

    const validateStep1 = () => {
        if (!form.name || form.name.length < 2) {
            setError('Name must be at least 2 characters')
            return false
        }
        if (!form.email || !form.email.includes('@')) {
            setError('Please enter a valid email')
            return false
        }
        if (!form.password || form.password.length < 6) {
            setError('Password must be at least 6 characters')
            return false
        }
        if (form.password !== form.confirmPassword) {
            setError('Passwords do not match')
            return false
        }
        if (!form.mobileNumber || form.mobileNumber.length < 10) {
            setError('Please enter a valid mobile number')
            return false
        }
        return true
    }

    const validateStep2 = () => {
        if (!form.organizationId) {
            setError('Please select your organization')
            return false
        }
        if (!form.country) {
            setError('Please select your country')
            return false
        }
        if (form.country === 'India' && !form.state) {
            setError('State is required for Indian learners')
            return false
        }
        if (!form.collegeName || form.collegeName.length < 3) {
            setError('Please enter your college name')
            return false
        }
        return true
    }

    const validateStep3 = () => {
        if (!form.course || form.course.length < 2) {
            setError('Please enter your course name')
            return false
        }
        if (!form.branch || form.branch.length < 2) {
            setError('Please enter your branch')
            return false
        }
        if (!form.pursuingYear || parseInt(form.pursuingYear) < 1 || parseInt(form.pursuingYear) > 6) {
            setError('Pursuing year must be between 1 and 6')
            return false
        }
        if (!form.semester || parseInt(form.semester) < 1 || parseInt(form.semester) > 12) {
            setError('Semester must be between 1 and 12')
            return false
        }
        if (!form.registrationNumber || form.registrationNumber.length < 3) {
            setError('Please enter your registration number')
            return false
        }
        return true
    }

    const handleNext = () => {
        setError('')
        if (currentStep === 1 && validateStep1()) {
            setCurrentStep(2)
        } else if (currentStep === 2 && validateStep2()) {
            setCurrentStep(3)
        }
    }

    const handleBack = () => {
        setError('')
        setCurrentStep(prev => prev - 1)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!validateStep3()) return

        setLoading(true)
        setError('')
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    mobileNumber: form.mobileNumber,
                    country: form.country,
                    state: form.state || undefined,
                    course: form.course,
                    branch: form.branch,
                    organizationId: parseInt(form.organizationId),
                    pursuingYear: parseInt(form.pursuingYear),
                    semester: parseInt(form.semester),
                    registrationNumber: form.registrationNumber,
                    collegeName: form.collegeName,
                }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.message || 'Signup failed')
            setSuccess(true)
            setTimeout(() => router.push('/login'), 2000)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const renderStep1 = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>Full Name *</label>
                <input type="text" className="input-field" placeholder="John Doe"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>Student Email *</label>
                <input type="email" className="input-field" placeholder="you@university.edu"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>Mobile Number *</label>
                <input type="tel" className="input-field" placeholder="+91 9876543210"
                    value={form.mobileNumber}
                    onChange={e => setForm({ ...form, mobileNumber: e.target.value })} required />
            </div>
            <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>Set Password *</label>
                <input type="password" className="input-field" placeholder="Min. 6 characters"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>Confirm Password *</label>
                <input type="password" className="input-field" placeholder="Repeat password"
                    value={form.confirmPassword}
                    onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required />
            </div>
        </div>
    )

    const renderStep2 = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>Organization *</label>
                <select className="input-field" value={form.organizationId}
                    onChange={e => setForm({ ...form, organizationId: e.target.value })} required
                    aria-label="Select your organization">
                    <option value="">Select your organization</option>
                    {organizations.map(org => (
                        <option key={org.id} value={org.id}>
                            {org.name} {org.type ? `(${org.type})` : ''}
                        </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Select the organization you are affiliated with</p>
            </div>
            <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>Country *</label>
                <select className="input-field" value={form.country}
                    onChange={e => setForm({ ...form, country: e.target.value, state: '' })} required
                    aria-label="Select your country">
                    <option value="">Select your country</option>
                    {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            {form.country === 'India' && (
                <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>State *</label>
                    <select className="input-field" value={form.state}
                        onChange={e => setForm({ ...form, state: e.target.value })} required
                        aria-label="Select your state">
                        <option value="">Select your state</option>
                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            )}
            <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>Name of the College *</label>
                <input type="text" className="input-field" placeholder="e.g. St. Stephen's College"
                    value={form.collegeName}
                    onChange={e => setForm({ ...form, collegeName: e.target.value })} required />
            </div>
        </div>
    )

    const renderStep3 = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>Course *</label>
                <input type="text" className="input-field" placeholder="e.g. B.Tech, M.Tech, BCA, MCA"
                    value={form.course}
                    onChange={e => setForm({ ...form, course: e.target.value })} required />
            </div>
            <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>Branch *</label>
                <input type="text" className="input-field" placeholder="e.g. Computer Science, Electronics"
                    value={form.branch}
                    onChange={e => setForm({ ...form, branch: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>Pursuing Year *</label>
                    <select className="input-field" value={form.pursuingYear}
                        onChange={e => setForm({ ...form, pursuingYear: e.target.value })} required
                        aria-label="Select pursuing year">
                        <option value="">Select</option>
                        {[1, 2, 3, 4, 5, 6].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>Semester *</label>
                    <select className="input-field" value={form.semester}
                        onChange={e => setForm({ ...form, semester: e.target.value })} required
                        aria-label="Select semester">
                        <option value="">Select</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            </div>
            <div>
                <label className="block text-sm font-semibold mb-1.5" style={{ color: '#374151' }}>Registration Number *</label>
                <input type="text" className="input-field" placeholder="Your university registration number"
                    value={form.registrationNumber}
                    onChange={e => setForm({ ...form, registrationNumber: e.target.value })} required />
            </div>
        </div>
    )

    return (
        <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #fdf4ff 0%, #f0f4ff 50%, #f0fdf4 100%)' }}
            className="flex items-center justify-center px-4 py-8">

            <div className="absolute top-0 right-0 w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, #e9d5ff, transparent)' }} />
            <div className="absolute bottom-0 left-0 w-96 h-96 rounded-full opacity-30 blur-3xl pointer-events-none"
                style={{ background: 'radial-gradient(circle, #c7d2fe, transparent)' }} />

            <div className="relative z-10 w-full max-w-2xl">
                <div style={{ background: 'white', borderRadius: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.10)', border: '1px solid #ede9fe' }}
                    className="p-10 animate-fade-in">

                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
                            style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}>
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round"
                                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-bold mb-1" style={{ color: '#0f172a' }}>Join EduVerse</h1>
                        <p className="text-sm" style={{ color: '#64748b' }}>Student Learning Access Registration</p>
                    </div>

                    {/* Progress Steps */}
                    {!success && (
                        <div className="flex items-center justify-center mb-8 gap-2">
                            {[1, 2, 3].map(step => (
                                <div key={step} className="flex items-center">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${currentStep >= step
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                                        : 'bg-gray-200 text-gray-500'
                                        }`}>
                                        {step}
                                    </div>
                                    {step < 3 && (
                                        <div className={`w-12 h-1 mx-1 rounded transition-all ${currentStep > step ? 'bg-gradient-to-r from-purple-500 to-pink-500' : 'bg-gray-200'
                                            }`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {success ? (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                                style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className="font-semibold text-xl mb-2" style={{ color: '#059669' }}>Registration Successful!</h2>
                            <p className="text-sm" style={{ color: '#64748b' }}>Your student account has been created. Redirecting to login...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {/* Step Titles */}
                            <div className="mb-6">
                                <h2 className="text-xl font-bold" style={{ color: '#0f172a' }}>
                                    {currentStep === 1 && '📝 Personal & Account Details'}
                                    {currentStep === 2 && '🎓 Institution Details'}
                                    {currentStep === 3 && '📚 Academic Information'}
                                </h2>
                                <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                                    {currentStep === 1 && 'Create your account credentials'}
                                    {currentStep === 2 && 'Tell us about your institution'}
                                    {currentStep === 3 && 'Complete your academic profile'}
                                </p>
                            </div>

                            {currentStep === 1 && renderStep1()}
                            {currentStep === 2 && renderStep2()}
                            {currentStep === 3 && renderStep3()}

                            {error && (
                                <div className="mt-4 px-4 py-3 rounded-xl text-sm"
                                    style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626' }}>
                                    ⚠️ {error}
                                </div>
                            )}

                            {/* Navigation Buttons */}
                            <div className="flex gap-3 mt-6">
                                {currentStep > 1 && (
                                    <button type="button" onClick={handleBack}
                                        className="flex-1 py-3 rounded-xl font-semibold text-sm transition-all"
                                        style={{ background: '#f3f4f6', color: '#374151' }}>
                                        ← Back
                                    </button>
                                )}
                                {currentStep < 3 ? (
                                    <button type="button" onClick={handleNext}
                                        className="flex-1 py-3 text-white rounded-xl font-semibold text-sm transition-all"
                                        style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}>
                                        Next →
                                    </button>
                                ) : (
                                    <button type="submit" disabled={loading}
                                        className="flex-1 py-3 text-white rounded-xl font-semibold text-sm disabled:opacity-60"
                                        style={{ background: 'linear-gradient(135deg, #a855f7, #ec4899)' }}>
                                        {loading ? (
                                            <span className="flex items-center justify-center gap-2">
                                                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                                                Creating account...
                                            </span>
                                        ) : '✅ Create Account'}
                                    </button>
                                )}
                            </div>
                        </form>
                    )}

                    <p className="text-center mt-6 text-sm" style={{ color: '#64748b' }}>
                        Already have an account?{' '}
                        <Link href="/login" className="font-semibold" style={{ color: '#6366f1' }}>Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
