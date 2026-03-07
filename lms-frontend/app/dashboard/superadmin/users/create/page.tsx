'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api } from '@/lib/api'

interface Organization {
    id: number
    name: string
    type?: string
    active: boolean
}

export default function CreateUserPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        role: '',
        organizationId: '',
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
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) {
            router.push('/login')
            return
        }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN' && u.role !== 'ADMIN') {
            router.push(`/dashboard/${u.role.toLowerCase()}`)
            return
        }
        setUser(u)

        // Fetch organizations for SUPERADMIN, or get user's org for ADMIN
        if (u.role === 'SUPERADMIN') {
            fetchOrganizations()
        } else if (u.role === 'ADMIN' && u.organizationId) {
            // Admin can only create users in their own organization
            setForm(prev => ({ ...prev, organizationId: u.organizationId.toString() }))
        }
    }, [])

    const fetchOrganizations = async () => {
        try {
            const response = await api.get('/organizations')
            setOrganizations(response.data.filter((org: Organization) => org.active))
        } catch (err: any) {
            console.error('Failed to fetch organizations:', err)
        }
    }

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
                organizationId: parseInt(form.organizationId)
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
            
            // Include collegeName for all roles if provided
            if (form.collegeName) {
                payload.collegeName = form.collegeName
            }

            await api.post('/auth/superadmin/create-user', payload)
            setSuccess(`User created successfully as ${form.role}!`)
            
            // Reset form
            setForm({
                name: '',
                email: '',
                password: '',
                role: '',
                organizationId: user.role === 'ADMIN' ? user.organizationId.toString() : '',
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
        if (user?.role === 'SUPERADMIN') {
            return ['ADMIN', 'INSTRUCTOR', 'STUDENT']
        } else if (user?.role === 'ADMIN') {
            return ['INSTRUCTOR', 'STUDENT']
        }
        return []
    }

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role={user?.role || 'ADMIN'} />
            <Navbar title="Create New User" />
            <main className="page-content">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
                        <h1 className="text-2xl font-bold text-gray-800">Create New User</h1>
                        <p className="text-gray-600 text-sm mt-1">
                            {user?.role === 'SUPERADMIN' 
                                ? 'Create ADMIN, INSTRUCTOR, or STUDENT accounts with organization assignment'
                                : 'Create INSTRUCTOR or STUDENT accounts within your organization'
                            }
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
                    <div className="bg-white rounded-2xl shadow-xl p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Basic Information */}
                            <div className="border-b pb-6">
                                <h2 className="text-lg font-bold text-gray-800 mb-4">Basic Information</h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">Full Name *</label>
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
                                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">Email *</label>
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
                                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">Password *</label>
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
                                        <label className="block text-sm font-semibold mb-1.5 text-gray-700">Role *</label>
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

                            {/* Organization Selection */}
                            {user?.role === 'SUPERADMIN' && (
                                <div className="border-b pb-6">
                                    <h2 className="text-lg font-bold text-gray-800 mb-4">Organization Assignment</h2>
                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                                        <p className="text-sm text-amber-800">
                                            <strong>SUPERADMIN Note:</strong> You must explicitly select an organization and college for the user. 
                                            These cannot be changed after creation by lower-level admins or instructors. The college name will be 
                                            automatically inherited by all users they create.
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold mb-1.5 text-gray-700">Organization *</label>
                                            <select
                                                className="input-field"
                                                value={form.organizationId}
                                                onChange={e => setForm({ ...form, organizationId: e.target.value })}
                                                required
                                            >
                                                <option value="">Select Organization</option>
                                                {organizations.map(org => (
                                                    <option key={org.id} value={org.id}>
                                                        {org.name} {org.type ? `(${org.type})` : ''}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">
                                                Select the organization this user will belong to
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold mb-1.5 text-gray-700">College Name</label>
                                            <input
                                                type="text"
                                                className="input-field"
                                                placeholder="e.g. XYZ University, ABC College"
                                                value={form.collegeName}
                                                onChange={e => setForm({ ...form, collegeName: e.target.value })}
                                            />
                                            <p className="text-xs text-gray-500 mt-1">
                                                Set the college name that will be inherited by all users created by this user
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Additional Information for Students */}
                            {form.role === 'STUDENT' && (
                                <div className="space-y-4">
                                    <h2 className="text-lg font-bold text-gray-800">Student Information</h2>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold mb-1.5 text-gray-700">Mobile Number *</label>
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
                                            <label className="block text-sm font-semibold mb-1.5 text-gray-700">Country *</label>
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
                                            <label className="block text-sm font-semibold mb-1.5 text-gray-700">State *</label>
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
                                            <label className="block text-sm font-semibold mb-1.5 text-gray-700">Course *</label>
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
                                            <label className="block text-sm font-semibold mb-1.5 text-gray-700">Branch *</label>
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
                                            <label className="block text-sm font-semibold mb-1.5 text-gray-700">Pursuing Year *</label>
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
                                            <label className="block text-sm font-semibold mb-1.5 text-gray-700">Semester *</label>
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
                                            <label className="block text-sm font-semibold mb-1.5 text-gray-700">Registration No *</label>
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
                                    className="px-6 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
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
