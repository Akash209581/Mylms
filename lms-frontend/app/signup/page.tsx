'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { 
    Mail, Lock, Eye, EyeOff, BookOpen, AlertCircle, Loader2,
    User, Phone, Building2, Globe, GraduationCap, Layers,
    Calendar, Hash, ArrowRight, ArrowLeft, Check, Search, X, RefreshCw
} from 'lucide-react'
import { API_URL } from '@/lib/api'

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

export default function SignupPage() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(1)
    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
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
        collegeName: ''
    })
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [colleges, setColleges] = useState<Array<{ id: number; name: string; logoUrl?: string }>>([])
    const [loadingColleges, setLoadingColleges] = useState(true)
    const [collegesFetchError, setCollegesFetchError] = useState(false)

    // Autocomplete state
    const [collegeQuery, setCollegeQuery] = useState('')
    const [collegeDropdownOpen, setCollegeDropdownOpen] = useState(false)
    const [collegeSelected, setCollegeSelected] = useState(false)
    const [selectedCollegeLogo, setSelectedCollegeLogo] = useState<string | null>(null)
    const autocompleteRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchColleges()
    }, [])

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
                setCollegeDropdownOpen(false)
                if (!collegeSelected) {
                    setCollegeQuery('')
                    setForm(prev => ({ ...prev, collegeName: '' }))
                }
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [collegeSelected])

    const fetchColleges = async () => {
        setLoadingColleges(true)
        setCollegesFetchError(false)
        try {
            const apiUrl = `${API_URL}/auth/colleges`
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            })
            if (response.ok) {
                const data = await response.json()
                setColleges(data)
                setCollegesFetchError(false)
            } else {
                setCollegesFetchError(true)
            }
        } catch (err) {
            setCollegesFetchError(true)
        } finally {
            setLoadingColleges(false)
        }
    }

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

    const { collegeName } = form

    const validateStep2 = () => {
        if (!collegeName || !collegeSelected) {
            setError('Please select your college/university from the dropdown list')
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
        return true
    }

    const filteredColleges = colleges.filter(c =>
        c.name.toLowerCase().includes(collegeQuery.toLowerCase())
    )

    const handleCollegeQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const q = e.target.value
        setCollegeQuery(q)
        setCollegeSelected(false)
        setForm(prev => ({ ...prev, collegeName: '' }))
        setCollegeDropdownOpen(true)
    }

    const handleCollegeSelect = (college: { id: number; name: string; logoUrl?: string }) => {
        setCollegeQuery(college.name)
        setForm(prev => ({ ...prev, collegeName: college.name }))
        setSelectedCollegeLogo(college.logoUrl || null)
        setCollegeSelected(true)
        setCollegeDropdownOpen(false)
    }

    const handleCollegeClear = () => {
        setCollegeQuery('')
        setForm(prev => ({ ...prev, collegeName: '' }))
        setSelectedCollegeLogo(null)
        setCollegeSelected(false)
        setCollegeDropdownOpen(false)
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
            const res = await fetch(`${API_URL}/auth/signup`, {
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
                <label className="block text-xs sm:text-sm font-semibold text-[#1e293b] mb-1.5">
                    Full Name *
                </label>
                <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                        <User className="w-4 h-4 stroke-[1.8]" />
                    </div>
                    <input 
                        type="text" 
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F7CFF] focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-normal" 
                        placeholder="John Doe"
                        value={form.name}
                        onChange={e => setForm({ ...form, name: e.target.value })} 
                        required 
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#1e293b] mb-1.5">
                    Student Email *
                </label>
                <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                        <Mail className="w-4 h-4 stroke-[1.8]" />
                    </div>
                    <input 
                        type="email" 
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F7CFF] focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-normal" 
                        placeholder="you@university.edu"
                        value={form.email}
                        onChange={e => setForm({ ...form, email: e.target.value })} 
                        required 
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#1e293b] mb-1.5">
                    Mobile Number *
                </label>
                <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                        <Phone className="w-4 h-4 stroke-[1.8]" />
                    </div>
                    <input 
                        type="tel" 
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F7CFF] focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-normal" 
                        placeholder="+91 9876543210"
                        value={form.mobileNumber}
                        onChange={e => setForm({ ...form, mobileNumber: e.target.value })} 
                        required 
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                    <label className="block text-xs sm:text-sm font-semibold text-[#1e293b] mb-1.5">
                        Set Password *
                    </label>
                    <div className="relative flex items-center">
                        <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                            <Lock className="w-4 h-4 stroke-[1.8]" />
                        </div>
                        <input 
                            type={showPassword ? 'text' : 'password'}
                            className="w-full pl-10 pr-9 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F7CFF] focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-normal" 
                            placeholder="Min. 6 chars"
                            value={form.password}
                            onChange={e => setForm({ ...form, password: e.target.value })} 
                            required 
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                            tabIndex={-1}
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>

                <div>
                    <label className="block text-xs sm:text-sm font-semibold text-[#1e293b] mb-1.5">
                        Confirm Password *
                    </label>
                    <div className="relative flex items-center">
                        <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                            <Lock className="w-4 h-4 stroke-[1.8]" />
                        </div>
                        <input 
                            type={showConfirmPassword ? 'text' : 'password'}
                            className="w-full pl-10 pr-9 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F7CFF] focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-normal" 
                            placeholder="Repeat password"
                            value={form.confirmPassword}
                            onChange={e => setForm({ ...form, confirmPassword: e.target.value })} 
                            required 
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                            tabIndex={-1}
                        >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )

    const renderStep2 = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#1e293b] mb-1.5">
                    College / University *
                </label>

                {collegesFetchError ? (
                    <div className="border border-red-200 rounded-xl p-3 bg-red-50 text-center">
                        <p className="text-xs text-red-600 mb-2">
                            Unable to load colleges from server. Please check your connection.
                        </p>
                        <button
                            type="button"
                            onClick={fetchColleges}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5" /> Retry
                        </button>
                    </div>
                ) : loadingColleges ? (
                    <div className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                        <span>Loading colleges...</span>
                    </div>
                ) : (
                    <div ref={autocompleteRef} className="relative">
                        <div className="relative flex items-center">
                            <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                                {collegeSelected ? (
                                    <Check className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
                                ) : (
                                    <Search className="w-4 h-4" />
                                )}
                            </div>
                            
                            <input
                                type="text"
                                className={`w-full py-3 bg-white border rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-4 transition-all text-sm font-normal ${
                                    selectedCollegeLogo ? 'pl-12' : 'pl-10'
                                } ${
                                    collegeSelected 
                                        ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500/10 pr-10' 
                                        : 'border-slate-200 focus:border-[#4F7CFF] focus:ring-blue-500/10 pr-4'
                                }`}
                                placeholder={
                                    colleges.length === 0
                                        ? 'No colleges available'
                                        : 'Type to search your college...'
                                }
                                value={collegeQuery}
                                onChange={handleCollegeQueryChange}
                                onFocus={() => {
                                    if (!collegeSelected) setCollegeDropdownOpen(true)
                                }}
                                disabled={colleges.length === 0}
                                autoComplete="off"
                            />

                            {selectedCollegeLogo && (
                                <div className="absolute left-9 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md overflow-hidden flex items-center justify-center bg-slate-100 border border-slate-200">
                                    <img
                                        src={selectedCollegeLogo}
                                        alt="Logo"
                                        className="max-w-full max-h-full object-contain"
                                    />
                                </div>
                            )}

                            {collegeSelected && (
                                <button
                                    type="button"
                                    onClick={handleCollegeClear}
                                    title="Clear selection"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        {collegeDropdownOpen && !collegeSelected && (
                            <div className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                                {filteredColleges.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-slate-400">
                                        No colleges match &ldquo;{collegeQuery}&rdquo;
                                    </div>
                                ) : (
                                    filteredColleges.map((college) => (
                                        <button
                                            key={college.id}
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault()
                                                handleCollegeSelect(college)
                                            }}
                                            className="w-full text-left px-3.5 py-2.5 hover:bg-blue-50/60 transition-colors flex items-center gap-2.5 text-xs sm:text-sm text-slate-700"
                                        >
                                            <div className="w-6 h-6 rounded bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                {college.logoUrl ? (
                                                    <img
                                                        src={college.logoUrl}
                                                        alt="logo"
                                                        className="max-w-full max-h-full object-contain"
                                                    />
                                                ) : (
                                                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                                                )}
                                            </div>
                                            <span className="truncate">{college.name}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}

                        <p className="text-[11px] text-slate-400 mt-1">
                            {collegeSelected
                                ? `Selected: ${form.collegeName}`
                                : `${colleges.length} colleges available — search and select`}
                        </p>
                    </div>
                )}
            </div>

            <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#1e293b] mb-1.5">
                    Country *
                </label>
                <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                        <Globe className="w-4 h-4 stroke-[1.8]" />
                    </div>
                    <select
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#4F7CFF] focus:ring-4 focus:ring-blue-500/10 transition-all text-sm cursor-pointer font-normal"
                        value={form.country}
                        onChange={e => setForm({ ...form, country: e.target.value, state: '' })}
                        required
                    >
                        <option value="">Select your country</option>
                        {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {form.country === 'India' && (
                <div>
                    <label className="block text-xs sm:text-sm font-semibold text-[#1e293b] mb-1.5">
                        State *
                    </label>
                    <select
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#4F7CFF] focus:ring-4 focus:ring-blue-500/10 transition-all text-sm cursor-pointer font-normal"
                        value={form.state}
                        onChange={e => setForm({ ...form, state: e.target.value })}
                        required
                    >
                        <option value="">Select your state</option>
                        {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            )}
        </div>
    )

    const renderStep3 = () => (
        <div className="space-y-4">
            <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#1e293b] mb-1.5">
                    Course *
                </label>
                <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                        <GraduationCap className="w-4 h-4 stroke-[1.8]" />
                    </div>
                    <input 
                        type="text" 
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F7CFF] focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-normal" 
                        placeholder="e.g. B.Tech, M.Tech, BCA, MCA"
                        value={form.course}
                        onChange={e => setForm({ ...form, course: e.target.value })} 
                        required 
                    />
                </div>
            </div>

            <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#1e293b] mb-1.5">
                    Branch *
                </label>
                <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                        <Layers className="w-4 h-4 stroke-[1.8]" />
                    </div>
                    <input 
                        type="text" 
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F7CFF] focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-normal" 
                        placeholder="e.g. Computer Science, Electronics"
                        value={form.branch}
                        onChange={e => setForm({ ...form, branch: e.target.value })} 
                        required 
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
                <div>
                    <label className="block text-xs sm:text-sm font-semibold text-[#1e293b] mb-1.5">
                        Pursuing Year *
                    </label>
                    <div className="relative flex items-center">
                        <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                            <Calendar className="w-3.5 h-3.5 stroke-[1.8]" />
                        </div>
                        <select 
                            className="w-full pl-9 pr-3 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#4F7CFF] focus:ring-4 focus:ring-blue-500/10 transition-all text-sm cursor-pointer font-normal" 
                            value={form.pursuingYear}
                            onChange={e => setForm({ ...form, pursuingYear: e.target.value })} 
                            required
                        >
                            <option value="">Year</option>
                            {[1, 2, 3, 4, 5, 6].map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-xs sm:text-sm font-semibold text-[#1e293b] mb-1.5">
                        Semester *
                    </label>
                    <div className="relative flex items-center">
                        <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                            <Hash className="w-3.5 h-3.5 stroke-[1.8]" />
                        </div>
                        <select 
                            className="w-full pl-9 pr-3 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-[#4F7CFF] focus:ring-4 focus:ring-blue-500/10 transition-all text-sm cursor-pointer font-normal" 
                            value={form.semester}
                            onChange={e => setForm({ ...form, semester: e.target.value })} 
                            required
                        >
                            <option value="">Sem</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-xs sm:text-sm font-semibold text-[#1e293b] mb-1.5">
                    Registration Number *
                </label>
                <div className="relative flex items-center">
                    <div className="absolute left-3.5 text-slate-400 pointer-events-none flex items-center">
                        <Hash className="w-4 h-4 stroke-[1.8]" />
                    </div>
                    <input 
                        type="text" 
                        className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#4F7CFF] focus:ring-4 focus:ring-blue-500/10 transition-all text-sm font-normal" 
                        placeholder="Your university registration number"
                        value={form.registrationNumber}
                        onChange={e => setForm({ ...form, registrationNumber: e.target.value })} 
                        required 
                    />
                </div>
            </div>
        </div>
    )

    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '/mmadastemlab'

    return (
        <div className="min-h-screen w-full relative flex items-center justify-center p-4 sm:p-6 lg:p-10 selection:bg-indigo-500 selection:text-white bg-[#f4f7fe] overflow-x-hidden">
            {/* Full Screen Ambient Reference Artwork Background */}
            <div 
                className="absolute inset-0 bg-no-repeat bg-cover bg-left sm:bg-center pointer-events-none opacity-95 transition-opacity duration-700"
                style={{
                    backgroundImage: `url('${basePath}/auth-bg-art.png')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'left center'
                }}
            />

            {/* Soft Ambient Radial Glows */}
            <div className="absolute -top-24 -left-24 w-96 h-96 bg-purple-200/40 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-200/40 rounded-full blur-3xl pointer-events-none" />

            {/* Main Split-Screen Container */}
            <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center min-h-[580px]">
                
                {/* Left Side: Brand Hero */}
                <div className="lg:col-span-5 xl:col-span-6 flex flex-col justify-between self-stretch py-4 sm:py-8 lg:py-12 pl-2 sm:pl-6 lg:pl-10">
                    <div className="max-w-md">
                        <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#111827] tracking-tight leading-[1.15]">
                            Learn Today,
                        </h1>
                        <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-[#4F7CFF] tracking-tight leading-[1.15] mt-1">
                            Lead Tomorrow.
                        </h1>
                        <p className="text-[#64748b] text-sm sm:text-[15px] mt-4 font-normal leading-relaxed">
                            Applied STEM Labs is your space to learn, grow, and achieve beyond limits.
                        </p>

                        <div className="mt-8 flex flex-wrap gap-2.5">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100 shadow-sm">
                                🚀 Instant Practice IDE
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 shadow-sm">
                                ⚡ Real-Time Auto Grading
                            </span>
                        </div>
                    </div>

                    {/* 3D Graphic */}
                    <div className="hidden lg:flex items-center justify-start mt-6 pointer-events-none">
                        <img
                            src={`${basePath}/auth-illustration.png`}
                            alt="STEM Learning"
                            className="max-h-56 xl:max-h-64 object-contain drop-shadow-xl select-none"
                            onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
                        />
                    </div>
                </div>

                {/* Right Side: Auth Card */}
                <div className="lg:col-span-7 xl:col-span-6 flex justify-center w-full">
                    <div className="w-full max-w-[480px] bg-white rounded-[32px] sm:rounded-[36px] p-7 sm:p-9 shadow-[0_20px_50px_rgba(79,70,229,0.07)] border border-slate-100/90 backdrop-blur-sm">
                        {/* Top Logo Icon */}
                        <div className="text-center mb-5">
                            <div className="inline-flex items-center justify-center w-[56px] h-[56px] rounded-2xl mb-3 bg-gradient-to-tr from-[#6C63FF] to-[#4F7CFF] shadow-lg shadow-indigo-500/25 transition-transform duration-300 hover:scale-105">
                                <BookOpen className="w-7 h-7 text-white stroke-[2.2]" />
                            </div>
                            <h2 className="text-2xl sm:text-[26px] font-bold text-[#0f172a] tracking-tight">
                                Applied STEM Labs
                            </h2>
                            <p className="text-xs sm:text-sm text-[#94a3b8] mt-1 font-normal">
                                Student Learning Access Registration
                            </p>
                        </div>

                        {/* Progress Steps Indicator */}
                        {!success && (
                            <div className="flex items-center justify-center mb-5 px-2">
                                {[
                                    { step: 1, label: 'Account' },
                                    { step: 2, label: 'Institution' },
                                    { step: 3, label: 'Academic' }
                                ].map((item, idx) => (
                                    <div key={item.step} className="flex items-center">
                                        <div className="flex items-center gap-1.5">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                                                currentStep >= item.step
                                                    ? 'bg-gradient-to-r from-[#6C63FF] to-[#4F7CFF] text-white shadow-md shadow-indigo-500/20'
                                                    : 'bg-slate-100 text-slate-400'
                                            }`}>
                                                {currentStep > item.step ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : item.step}
                                            </div>
                                            <span className={`text-xs font-semibold hidden sm:inline ${
                                                currentStep >= item.step ? 'text-slate-800' : 'text-slate-400'
                                            }`}>
                                                {item.label}
                                            </span>
                                        </div>
                                        {idx < 2 && (
                                            <div className={`w-6 sm:w-10 h-[2px] mx-2 rounded-full transition-all duration-300 ${
                                                currentStep > item.step ? 'bg-[#4F7CFF]' : 'bg-slate-200'
                                            }`} />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}

                        {success ? (
                            <div className="text-center py-8">
                                <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                                    <Check className="w-8 h-8 stroke-[2.5]" />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900 mb-1">Registration Successful!</h2>
                                <p className="text-sm text-slate-500">Your student account has been created. Redirecting to login...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                {currentStep === 1 && renderStep1()}
                                {currentStep === 2 && renderStep2()}
                                {currentStep === 3 && renderStep3()}

                                {error && (
                                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200/80 text-red-600 text-xs sm:text-sm animate-fade-in">
                                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                {/* Navigation Actions */}
                                <div className="flex items-center gap-3 pt-2">
                                    {currentStep > 1 && (
                                        <button 
                                            type="button" 
                                            onClick={handleBack}
                                            className="px-4 py-3 rounded-xl font-semibold text-sm text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] transition-all flex items-center gap-1.5"
                                        >
                                            <ArrowLeft className="w-4 h-4" /> Back
                                        </button>
                                    )}
                                    {currentStep < 3 ? (
                                        <button 
                                            type="button" 
                                            onClick={handleNext}
                                            className="flex-1 py-3 px-4 bg-gradient-to-r from-[#6C63FF] to-[#4F7CFF] hover:from-[#5b52f5] hover:to-[#3e6df0] active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-[0_8px_20px_rgba(79,124,255,0.28)] hover:shadow-[0_10px_25px_rgba(79,124,255,0.38)] transition-all flex items-center justify-center gap-1.5"
                                        >
                                            Next Step <ArrowRight className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button 
                                            type="submit" 
                                            disabled={loading}
                                            className="flex-1 py-3 px-4 bg-gradient-to-r from-[#6C63FF] to-[#4F7CFF] hover:from-[#5b52f5] hover:to-[#3e6df0] active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-[0_8px_20px_rgba(79,124,255,0.28)] hover:shadow-[0_10px_25px_rgba(79,124,255,0.38)] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                                        >
                                            {loading ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    Creating Account...
                                                </span>
                                            ) : (
                                                'Complete Registration'
                                            )}
                                        </button>
                                    )}
                                </div>
                            </form>
                        )}

                        {/* Footer Switch */}
                        <p className="text-center mt-5 text-xs sm:text-sm text-slate-400 font-normal">
                            Already have an account?{' '}
                            <Link
                                href="/login"
                                className="font-semibold text-[#4F7CFF] hover:text-[#3e68ea] hover:underline transition-colors ml-1"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
