'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api } from '@/lib/api'

interface Organization {
    id: number
    name: string
    description?: string
    type?: string
    address?: string
    city?: string
    state?: string
    country?: string
    contactEmail?: string
    contactPhone?: string
    active: boolean
    createdAt: string
    updatedAt: string
}

interface OrganizationStats {
    totalUsers: number
    totalCourses: number
    totalQuestions: number
    adminCount: number
    instructorCount: number
    studentCount: number
}

export default function OrganizationsPage() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [organizations, setOrganizations] = useState<Organization[]>([])
    const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
    const [stats, setStats] = useState<OrganizationStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        type: '',
        address: '',
        city: '',
        state: '',
        country: '',
        contactEmail: '',
        contactPhone: '',
        active: true
    })
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')

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
        fetchOrganizations()
    }, [])

    const fetchOrganizations = async () => {
        try {
            const response = await api.get('/organizations')
            setOrganizations(response.data)
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch organizations')
        } finally {
            setLoading(false)
        }
    }

    const fetchOrgStats = async (orgId: number) => {
        try {
            const response = await api.get(`/organizations/${orgId}/stats`)
            setStats(response.data)
        } catch (err: any) {
            console.error('Failed to fetch stats:', err)
        }
    }

    const handleCreateOrganization = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setSuccess('')
        try {
            await api.post('/organizations', formData)
            setSuccess('Organization created successfully!')
            setShowCreateModal(false)
            resetForm()
            fetchOrganizations()
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to create organization')
        }
    }

    const handleUpdateOrganization = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedOrg) return
        setError('')
        setSuccess('')
        try {
            await api.put(`/organizations/${selectedOrg.id}`, formData)
            setSuccess('Organization updated successfully!')
            setShowEditModal(false)
            resetForm()
            setSelectedOrg(null)
            fetchOrganizations()
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update organization')
        }
    }

    const handleDeleteOrganization = async (orgId: number) => {
        if (!confirm('Are you sure you want to delete this organization? This action cannot be undone.')) {
            return
        }
        try {
            await api.delete(`/organizations/${orgId}`)
            setSuccess('Organization deleted successfully!')
            fetchOrganizations()
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to delete organization')
        }
    }

    const openEditModal = (org: Organization) => {
        setSelectedOrg(org)
        setFormData({
            name: org.name,
            description: org.description || '',
            type: org.type || '',
            address: org.address || '',
            city: org.city || '',
            state: org.state || '',
            country: org.country || '',
            contactEmail: org.contactEmail || '',
            contactPhone: org.contactPhone || '',
            active: org.active
        })
        setShowEditModal(true)
    }

    const viewOrgDetails = async (org: Organization) => {
        setSelectedOrg(org)
        await fetchOrgStats(org.id)
    }

    const resetForm = () => {
        setFormData({
            name: '',
            description: '',
            type: '',
            address: '',
            city: '',
            state: '',
            country: '',
            contactEmail: '',
            contactPhone: '',
            active: true
        })
    }

    const renderOrgForm = (onSubmit: (e: React.FormEvent) => void, isEdit = false) => (
        <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Organization Name *</label>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="University of Example"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Type</label>
                    <select
                        className="input-field"
                        value={formData.type}
                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                    >
                        <option value="">Select Type</option>
                        <option value="University">University</option>
                        <option value="College">College</option>
                        <option value="Institute">Institute</option>
                        <option value="School">School</option>
                        <option value="Training Center">Training Center</option>
                    </select>
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Description</label>
                <textarea
                    className="input-field"
                    placeholder="Brief description of the organization"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Contact Email</label>
                    <input
                        type="email"
                        className="input-field"
                        placeholder="admin@organization.edu"
                        value={formData.contactEmail}
                        onChange={e => setFormData({ ...formData, contactEmail: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Contact Phone</label>
                    <input
                        type="tel"
                        className="input-field"
                        placeholder="+1 234 567 8900"
                        value={formData.contactPhone}
                        onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Address</label>
                <input
                    type="text"
                    className="input-field"
                    placeholder="Street address"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">City</label>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="City"
                        value={formData.city}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">State/Province</label>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="State"
                        value={formData.state}
                        onChange={e => setFormData({ ...formData, state: e.target.value })}
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1.5 text-[var(--text-primary)]">Country</label>
                    <input
                        type="text"
                        className="input-field"
                        placeholder="Country"
                        value={formData.country}
                        onChange={e => setFormData({ ...formData, country: e.target.value })}
                    />
                </div>
            </div>

            <div className="flex items-center">
                <input
                    type="checkbox"
                    id="active"
                    checked={formData.active}
                    onChange={e => setFormData({ ...formData, active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="active" className="ml-2 text-sm font-medium text-[var(--text-primary)]">
                    Active
                </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
                <button
                    type="button"
                    onClick={() => {
                        isEdit ? setShowEditModal(false) : setShowCreateModal(false)
                        resetForm()
                    }}
                    className="px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:from-blue-700 hover:to-purple-700 transition"
                >
                    {isEdit ? 'Update Organization' : 'Create Organization'}
                </button>
            </div>
        </form>
    )

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="SUPERADMIN" />
            <Navbar title="Organization Management" />
            <main className="page-content">
                {/* Header */}
                <div className="bg-[var(--bg-surface)] rounded-2xl shadow-xl p-6 mb-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Organizations</h1>
                            <p className="text-[var(--text-secondary)] text-sm mt-1">Manage multi-tenant organizations</p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition shadow-md"
                        >
                            + Create Organization
                        </button>
                    </div>
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

                {/* Organization List */}
                {loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {organizations.map((org) => (
                            <div key={org.id} className="bg-[var(--bg-surface)] rounded-2xl shadow-xl p-6 hover:shadow-2xl transition">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-1">{org.name}</h3>
                                        {org.type && (
                                            <span className="inline-block px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                                {org.type}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {org.active ? (
                                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                                                ● Active
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-[var(--text-primary)] rounded">
                                                ● Inactive
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {org.description && (
                                    <p className="text-sm text-[var(--text-secondary)] mb-4 line-clamp-2">{org.description}</p>
                                )}

                                <div className="space-y-2 mb-4 text-sm text-[var(--text-secondary)]">
                                    {org.city && org.country && (
                                        <div className="flex items-center">
                                            <span className="mr-2">📍</span>
                                            <span>{org.city}, {org.country}</span>
                                        </div>
                                    )}
                                    {org.contactEmail && (
                                        <div className="flex items-center">
                                            <span className="mr-2">📧</span>
                                            <span className="truncate">{org.contactEmail}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex space-x-2 pt-4 border-t border-[var(--border)]">
                                    <button
                                        onClick={() => viewOrgDetails(org)}
                                        className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                                    >
                                        View Stats
                                    </button>
                                    <button
                                        onClick={() => openEditModal(org)}
                                        className="flex-1 px-3 py-2 text-sm font-medium text-[var(--text-primary)] bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDeleteOrganization(org.id)}
                                        className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Organization Stats Modal */}
                {selectedOrg && stats && !showEditModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => { setSelectedOrg(null); setStats(null); }}>
                        <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl p-8 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">{selectedOrg.name}</h2>
                                    <p className="text-[var(--text-secondary)] text-sm mt-1">Organization Statistics</p>
                                </div>
                                <button
                                    onClick={() => { setSelectedOrg(null); setStats(null); }}
                                    className="text-gray-400 hover:text-[var(--text-secondary)] text-2xl"
                                >
                                    ×
                                </button>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                                    <div className="text-3xl mb-2">👥</div>
                                    <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalUsers}</div>
                                    <div className="text-sm text-[var(--text-secondary)]">Total Users</div>
                                </div>
                                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                                    <div className="text-3xl mb-2">📚</div>
                                    <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalCourses}</div>
                                    <div className="text-sm text-[var(--text-secondary)]">Total Courses</div>
                                </div>
                                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                                    <div className="text-3xl mb-2">❓</div>
                                    <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.totalQuestions}</div>
                                    <div className="text-sm text-[var(--text-secondary)]">Questions</div>
                                </div>
                                <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl">
                                    <div className="text-3xl mb-2">🛡️</div>
                                    <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.adminCount}</div>
                                    <div className="text-sm text-[var(--text-secondary)]">Admins</div>
                                </div>
                                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl">
                                    <div className="text-3xl mb-2">👨‍🏫</div>
                                    <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.instructorCount}</div>
                                    <div className="text-sm text-[var(--text-secondary)]">Instructors</div>
                                </div>
                                <div className="bg-gradient-to-br from-pink-50 to-pink-100 p-4 rounded-xl">
                                    <div className="text-3xl mb-2">🎓</div>
                                    <div className="text-2xl font-bold text-[var(--text-primary)]">{stats.studentCount}</div>
                                    <div className="text-sm text-[var(--text-secondary)]">Students</div>
                                </div>
                            </div>

                            <button
                                onClick={() => { setSelectedOrg(null); setStats(null); }}
                                className="w-full px-4 py-2 text-sm font-medium text-[var(--text-primary)] bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}

                {/* Create Organization Modal */}
                {showCreateModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
                        <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl p-8 max-w-3xl w-full mx-4 my-8">
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Create New Organization</h2>
                            {renderOrgForm(handleCreateOrganization)}
                        </div>
                    </div>
                )}

                {/* Edit Organization Modal */}
                {showEditModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
                        <div className="bg-[var(--bg-surface)] rounded-2xl shadow-2xl p-8 max-w-3xl w-full mx-4 my-8">
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6">Edit Organization</h2>
                            {renderOrgForm(handleUpdateOrganization, true)}
                        </div>
                    </div>
                )}
            </main>
        </div>
    )
}
