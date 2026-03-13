'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api } from '@/lib/api'

export default function CreateStudentPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
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

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) {
            router.push('/login')
            return
        }
        const u = JSON.parse(stored)
        if (u.role !== 'INSTRUCTOR') {
            router.push(`/dashboard/${u.role.toLowerCase()}`)
            return
        }
        setUser(u)
        // No need to fetch college name - it will be automatically inherited from instructor
    }, [])

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
                role: 'STUDENT', // Instructors can only create students
                mobileNumber: form.mobileNumber,
                country: form.country,
                state: form.state || undefined,
                course: form.course,
                branch: form.branch,
                pursuingYear: parseInt(form.pursuingYear),
                semester: parseInt(form.semester),
                registrationNumber: form.registrationNumber
                // organizationId is NOT sent - it will be automatically inherited from the instructor's organization
                // collegeName is NOT sent - it will be automatically inherited from the instructor's college
            }

            await api.post('/auth/create-user', payload)
            setSuccess('Student created successfully!')
            
            // Reset form
            setForm({
                name: '',
                email: '',
                password: '',
                mobileNumber: '',
                country: '',
                state: '',
                course: '',
                branch: '',
                pursuingYear: '',
                semester: '',
                registrationNumber: ''
            })

            // Redirect after 2 seconds
            setTimeout(() => {
                router.push('/dashboard/instructor')
            }, 2000)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create student')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="INSTRUCTOR" />
            <Navbar title="Create New Student" />
            <main className="page-content">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="bg-[var(--bg-surface)] rounded-2xl shadow-xl p-6 mb-6">
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Create New Student</h1>
                        <p className="text-[var(--text-secondary)] text-sm mt-1">
                            Create STUDENT accounts within your organization
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
                                            placeholder="student@example.com"
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
                                        <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Mobile Number *</label>
                                        <input
                                            type="tel"
                                            className="input-field"
                                            placeholder="+91 9876543210"
                                            value={form.mobileNumber}
                                            onChange={e => setForm({ ...form, mobileNumber: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Organization Information */}
                            <div className="border-b pb-6">
                                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Organization Information</h2>
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                    <p className="text-sm text-blue-800">
                                        <strong>Note:</strong> Students created by you will automatically be assigned to your organization and college. 
                                        You cannot change the organization or college name when creating students.
                                    </p>
                                </div>
                                {user?.collegeName && (
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">College Name (Read-Only)</label>
                                        <input
                                            type="text"
                                            className="input-field bg-gray-100 cursor-not-allowed"
                                            value={user.collegeName}
                                            disabled
                                            readOnly
                                        />
                                        <p className="text-xs text-[var(--text-secondary)] mt-1">
                                            This college name will be automatically assigned to the new student. You cannot change it.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Location Information */}
                            <div className="border-b pb-6">
                                <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">Location Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Country *</label>
                                        <select
                                            className="input-field"
                                            value={form.country}
                                            onChange={e => setForm({ ...form, country: e.target.value })}
                                            required
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
                                    {form.country === 'India' && (
                                        <div>
                                            <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">State</label>
                                            <input
                                                type="text"
                                                className="input-field"
                                                placeholder="State"
                                                value={form.state}
                                                onChange={e => setForm({ ...form, state: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Academic Information */}
                            <div className="space-y-4">
                                <h2 className="text-lg font-bold text-[var(--text-primary)]">Academic Information</h2>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Course *</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="e.g. B.Tech, M.Tech"
                                            value={form.course}
                                            onChange={e => setForm({ ...form, course: e.target.value })}
                                            required
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
                                            required
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
                                            required
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
                                            required
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
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

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
                                    {loading ? 'Creating...' : 'Create Student'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </main>
        </div>
    )
}
