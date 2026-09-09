'use client'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api } from '@/lib/api'
import { getAuthHeaders } from '@/lib/authHeaders'

export default function CreateUserPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        role: '',
        collegeName: '',
        mobileNumber: '',
        country: '',
        state: '',
        course: '',
        branch: '',
        pursuingYear: '',
        semester: '',
        registrationNumber: ''
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)
    const [colleges, setColleges] = useState<Array<{ id: number; name: string; logoUrl?: string }>>([])
    const [loadingColleges, setLoadingColleges] = useState(true)
    const [showCollegeDropdown, setShowCollegeDropdown] = useState(false)
    const [collegeSearchTerm, setCollegeSearchTerm] = useState('')
    const [logoPreview, setLogoPreview] = useState<string | null>(null)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) {
            router.push('/login')
            return
        }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN') {
            router.push(`/dashboard/${u.role.toLowerCase()}`)
            return
        }
        setUser(u)
        
        // Fetch existing colleges for dropdown
        fetchColleges()
    }, [])

    const fetchColleges = async () => {
        console.log('Starting to fetch colleges...')
        try {
            const headers = getAuthHeaders()
            console.log('Auth headers:', headers)
            const apiUrl = `${API_URL}/superadmin/colleges`
            console.log('Fetching from:', apiUrl)
            const response = await apiFetch(apiUrl, {
                headers,
                credentials: 'include'
            })
            console.log('Response status:', response.status)
            if (response.ok) {
                const data = await response.json()
                console.log('✅ Successfully fetched colleges:', data)
                setColleges(data)
            } else {
                console.error('❌ Failed to fetch colleges, status:', response.status)
                const errorText = await response.text()
                console.error('Error response:', errorText)
            }
        } catch (err) {
            console.error('❌ Exception while fetching colleges:', err)
        } finally {
            setLoadingColleges(false)
            console.log('Loading colleges complete')
        }
    }

    const handleCollegeSelect = (college: { name: string; logoUrl?: string }) => {
        console.log('College selected:', college.name)
        setForm({ ...form, collegeName: college.name })
        setLogoPreview(college.logoUrl || null)
        setCollegeSearchTerm('')
        setShowCollegeDropdown(false)
    }

    const handleCollegeInputChange = (value: string) => {
        setForm({ ...form, collegeName: value })
        setCollegeSearchTerm(value)
        setShowCollegeDropdown(true)
    }

    const handleCollegeFocus = () => {
        console.log('Field focused, colleges:', colleges)
        console.log('showCollegeDropdown will be set to true')
        setShowCollegeDropdown(true)
        setCollegeSearchTerm(form.collegeName) // Sync search term with current value
    }

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setLogoPreview(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    const filteredColleges = collegeSearchTerm 
        ? colleges.filter(college =>
            college.name.toLowerCase().includes(collegeSearchTerm.toLowerCase())
        )
        : colleges // Show all colleges if no search term

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        setLoading(true)

        try {
            const payload: any = {
                name: form.name,
                email: form.email,
                password: form.password,
                role: form.role,
                collegeName: form.collegeName,
                collegeLogo: logoPreview
            }

            // Include additional fields for STUDENT role
            if (form.role === 'STUDENT') {
                payload.mobileNumber = form.mobileNumber
                payload.country = form.country
                payload.state = form.state || undefined
                payload.course = form.course
                payload.branch = form.branch
                payload.pursuingYear = parseInt(form.pursuingYear)
                payload.semester = parseInt(form.semester)
                payload.registrationNumber = form.registrationNumber
            }

            await api.post('/auth/superadmin/create-user', payload)
            setSuccess(`User created successfully as ${form.role}!`)
            
            // Reset form
            setForm({
                name: '',
                email: '',
                password: '',
                role: '',
                collegeName: '',
                mobileNumber: '',
                country: '',
                state: '',
                course: '',
                branch: '',
                pursuingYear: '',
                semester: '',
                registrationNumber: ''
            })
            setLogoPreview(null)

            // Redirect after 2 seconds
            setTimeout(() => {
                router.push(`/dashboard/${user.role.toLowerCase()}/users`)
            }, 2000)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create user')
        } finally {
            setLoading(false)
        }
    }

    const getRoleOptions = () => {
        // SUPERADMIN can create ADMIN, INSTRUCTOR, or STUDENT
        return ['ADMIN', 'INSTRUCTOR', 'STUDENT']
    }

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role={user?.role || 'ADMIN'} />
            <Navbar title="Create New User" />
            <main className="page-content">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="bg-[var(--bg-surface)] rounded-2xl shadow-xl p-6 mb-6">
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create New User</h1>
                        <p className="text-[var(--text-secondary)] text-sm mt-1">
                            Create ADMIN, INSTRUCTOR, or STUDENT accounts with college assignment
                        </p>
                    </div>

                    {/* Alerts */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4">
                            {success}
                        </div>
                    )}

                    {/* Form */}
                    <div className="bg-[var(--bg-surface)] rounded-2xl shadow-xl p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Basic Information */}
                            <div className="border-b pb-6">
                                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Basic Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Full Name *</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="John Doe"
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Email *</label>
                                        <input
                                            type="email"
                                            className="input-field"
                                            placeholder="user@example.com"
                                            value={form.email}
                                            onChange={e => setForm({ ...form, email: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Password *</label>
                                        <input
                                            type="password"
                                            className="input-field"
                                            placeholder="Min. 6 characters"
                                            value={form.password}
                                            onChange={e => setForm({ ...form, password: e.target.value })}
                                            required
                                            minLength={6}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Role *</label>
                                        <select
                                            className="input-field"
                                            value={form.role}
                                            onChange={e => setForm({ ...form, role: e.target.value })}
                                            required
                                        >
                                            <option value="">Select Role</option>
                                            {getRoleOptions().map(role => (
                                                <option key={role} value={role}>{role}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* College Assignment */}
                            <div className="border-b pb-6">
                                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">🎓 College Assignment</h2>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                    <p className="text-sm text-blue-800">
                                        <strong>📝 Important:</strong> Select an existing college or enter a new one. If you enter a new college name, it will be automatically created. 
                                        The college assignment cannot be changed later, and all users created by this user will automatically inherit this college.
                                    </p>
                                </div>
                                <div className="relative">
                                    <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">College/University Name *</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder={loadingColleges ? "Loading colleges..." : "Select or type to create new..."}
                                        value={form.collegeName}
                                        onChange={(e) => handleCollegeInputChange(e.target.value)}
                                        onFocus={handleCollegeFocus}
                                        onBlur={() => {
                                            console.log('Input blurred')
                                            setTimeout(() => setShowCollegeDropdown(false), 150)
                                        }}
                                        required
                                        disabled={loadingColleges}
                                        autoComplete="off"
                                    />
                                    
                                    {/* Custom Dropdown */}
                                    {showCollegeDropdown && colleges.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {filteredColleges.length > 0 ? (
                                                <>
                                                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                                                        Existing Colleges ({filteredColleges.length})
                                                    </div>
                                                    {filteredColleges.map((college) => (
                                                        <div
                                                            key={college.id}
                                                            className="px-4 py-2.5 hover:bg-blue-50 cursor-pointer flex items-center gap-2 transition-colors"
                                                            onMouseDown={(e) => {
                                                                e.preventDefault() // Prevent input blur
                                                                handleCollegeSelect(college)
                                                            }}
                                                        >
                                                            <span className="text-blue-600">🎓</span>
                                                            <span className="text-gray-800">{college.name}</span>
                                                        </div>
                                                    ))}
                                                </>
                                            ) : (
                                                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                    No matching colleges found. Press Enter to create "{form.collegeName}"
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    
                                    <p className="text-xs text-gray-500 mt-1">
                                        💡 {loadingColleges 
                                            ? 'Loading colleges from database...'
                                            : colleges.length > 0 
                                                ? `${colleges.length} existing ${colleges.length === 1 ? 'college' : 'colleges'} available. Click field to see dropdown or type to filter/create new.`
                                                : 'No existing colleges. Type a name to create the first one.'
                                        }
                                    </p>
                                    
                                    {/* Debug info - remove in production */}
                                    {process.env.NODE_ENV === 'development' && (
                                        <p className="text-xs text-purple-600 mt-1">
                                            Debug: colleges={colleges.length}, showDropdown={showCollegeDropdown.toString()}, loading={loadingColleges.toString()}
                                        </p>
                                    )}
                                </div>

                                {/* Logo Management */}
                                <div className="mt-6 flex flex-col md:flex-row items-start gap-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                                    <div className="flex-shrink-0">
                                        <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-slate-300 flex items-center justify-center overflow-hidden group hover:border-indigo-400 transition-all">
                                            {logoPreview ? (
                                                <img src={logoPreview} alt="Logo Preview" className="w-full h-full object-contain" />
                                            ) : (
                                                <span className="text-3xl text-slate-300 group-hover:text-indigo-400 transition-colors">🖼️</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <h3 className="text-sm font-bold text-slate-800">College Logo</h3>
                                        <p className="text-xs text-slate-500">
                                            {logoPreview 
                                                ? "Logo found or uploaded. You can replace it if needed." 
                                                : "No logo provided. Please upload a logo for this college."}
                                        </p>
                                        <div className="flex items-center gap-3">
                                            <label className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer shadow-sm transition-all">
                                                {logoPreview ? 'Replace Logo' : 'Upload Logo'}
                                                <input
                                                    type="file"
                                                    className="hidden"
                                                    accept="image/*"
                                                    onChange={handleLogoUpload}
                                                />
                                            </label>
                                            {logoPreview && (
                                                <button
                                                    type="button"
                                                    onClick={() => setLogoPreview(null)}
                                                    className="px-4 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                >
                                                    Remove
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Additional Information for Students */}
                            {form.role === 'STUDENT' && (
                                <div className="space-y-4">
                                    <h2 className="text-lg font-bold text-[var(--text-primary)]">Student Information</h2>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Mobile Number *</label>
                                            <input
                                                type="tel"
                                                className="input-field"
                                                placeholder="+91 9876543210"
                                                value={form.mobileNumber}
                                                onChange={e => setForm({ ...form, mobileNumber: e.target.value })}
                                                required={form.role === 'STUDENT'}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Country *</label>
                                            <select
                                                className="input-field"
                                                value={form.country}
                                                onChange={e => setForm({ ...form, country: e.target.value })}
                                                required={form.role === 'STUDENT'}
                                            >
                                                <option value="">Select Country</option>
                                                <option value="India">India</option>
                                                <option value="United States">United States</option>
                                                <option value="United Kingdom">United Kingdom</option>
                                                <option value="Canada">Canada</option>
                                                <option value="Australia">Australia</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>
                                    </div>

                                    {form.country === 'India' && (
                                        <div>
                                            <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">State *</label>
                                            <input
                                                type="text"
                                                className="input-field"
                                                placeholder="State"
                                                value={form.state}
                                                onChange={e => setForm({ ...form, state: e.target.value })}
                                            />
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Course *</label>
                                            <input
                                                type="text"
                                                className="input-field"
                                                placeholder="e.g. B.Tech, M.Tech"
                                                value={form.course}
                                                onChange={e => setForm({ ...form, course: e.target.value })}
                                                required={form.role === 'STUDENT'}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Branch *</label>
                                            <input
                                                type="text"
                                                className="input-field"
                                                placeholder="e.g. Computer Science"
                                                value={form.branch}
                                                onChange={e => setForm({ ...form, branch: e.target.value })}
                                                required={form.role === 'STUDENT'}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Pursuing Year *</label>
                                            <select
                                                className="input-field"
                                                value={form.pursuingYear}
                                                onChange={e => setForm({ ...form, pursuingYear: e.target.value })}
                                                required={form.role === 'STUDENT'}
                                            >
                                                <option value="">Select</option>
                                                {[1, 2, 3, 4, 5, 6].map(y => (
                                                    <option key={y} value={y}>{y}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Semester *</label>
                                            <select
                                                className="input-field"
                                                value={form.semester}
                                                onChange={e => setForm({ ...form, semester: e.target.value })}
                                                required={form.role === 'STUDENT'}
                                            >
                                                <option value="">Select</option>
                                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Registration No *</label>
                                            <input
                                                type="text"
                                                className="input-field"
                                                placeholder="Registration number"
                                                value={form.registrationNumber}
                                                onChange={e => setForm({ ...form, registrationNumber: e.target.value })}
                                                required={form.role === 'STUDENT'}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Submit Button */}
                            <div className="flex justify-end space-x-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="px-6 py-2.5 text-sm font-medium text-[var(--text-primary)] bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50"
                                >
                                    {loading ? 'Creating...' : 'Create User'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    )
}
