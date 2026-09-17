'use client'

import { apiFetch } from '@/lib/apiFetch'
import { API_URL } from '@/lib/api'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import UserDetailModal from '@/components/UserDetailModal'
import UserEditModal from '@/components/UserEditModal'
import { getAuthHeaders } from '@/lib/authHeaders'
import { toast } from '@/lib/toast'

export default function SuperAdminUsersPage() {
    const router = useRouter()
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterRole, setFilterRole] = useState('ALL')
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [editingUser, setEditingUser] = useState<any>(null)
    const [loadingDetails, setLoadingDetails] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN') { router.push('/login'); return }

        apiFetch(`${API_URL}/superadmin/users`, {
            credentials: 'include',
            headers: getAuthHeaders(),
        })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setUsers(data) })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const handleViewUser = async (userId: number) => {
        setLoadingDetails(true)
        try {
            const response = await apiFetch(`${API_URL}/superadmin/users/${userId}`, {
                credentials: 'include',
                headers: getAuthHeaders(),
            })
            if (response.ok) {
                const userData = await response.json()
                setSelectedUser(userData)
            } else {
                toast.error('Failed to load user details')
            }
        } catch (error) {
            toast.error('Failed to fetch user details')
        } finally {
            setLoadingDetails(false)
        }
    }

    const handleEditUser = async (userId: number) => {
        setLoadingDetails(true)
        try {
            const response = await apiFetch(`${API_URL}/superadmin/users/${userId}`, {
                credentials: 'include',
                headers: getAuthHeaders(),
            })
            if (response.ok) {
                const userData = await response.json()
                setEditingUser(userData)
            } else {
                toast.error('Failed to load user for editing')
            }
        } catch (error) {
            toast.error('Failed to fetch user details')
        } finally {
            setLoadingDetails(false)
        }
    }

    const handleUserUpdated = (updatedUser: any) => {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u))
        toast.success(`User ${updatedUser.name} updated successfully!`)
    }

    const handleRoleChange = async (userId: number, newRole: string) => {
        try {
            await apiFetch(`${API_URL}/superadmin/users/${userId}/role`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ role: newRole }),
            })
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
            toast.success('Role updated successfully')
        } catch (e) {
            toast.error('Failed to update role')
        }
    }

    const handleDelete = async (userId: number) => {
        if (!confirm('Are you sure you want to permanently delete this user?')) return
        try {
            const res = await apiFetch(`${API_URL}/superadmin/users/${userId}`, {
                method: 'DELETE', credentials: 'include'
            })
            if (res.ok) {
                setUsers(prev => prev.filter(u => u.id !== userId))
                toast.success('User deleted successfully')
            } else {
                toast.error('Failed to delete user')
            }
        } catch (e) {
            toast.error('Error deleting user')
        }
    }

    const filtered = users.filter(u => {
        const matchSearch = u.name?.toLowerCase().includes(search.toLowerCase()) ||
            u.email?.toLowerCase().includes(search.toLowerCase())
        const matchRole = filterRole === 'ALL' || u.role === filterRole
        return matchSearch && matchRole
    })

    const roleCounts = {
        ALL: users.length,
        STUDENT: users.filter(u => u.role === 'STUDENT').length,
        INSTRUCTOR: users.filter(u => u.role === 'INSTRUCTOR').length,
        QUESTION_CREATOR: users.filter(u => u.role === 'QUESTION_CREATOR').length,
        CONTENT_CREATOR: users.filter(u => u.role === 'CONTENT_CREATOR').length,
        ADMIN: users.filter(u => u.role === 'ADMIN').length,
        SUPERADMIN: users.filter(u => u.role === 'SUPERADMIN').length,
    }

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="SUPERADMIN" />
            <Navbar title="All Users" />
            <main className="page-content">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold role-text-primary mb-1">User Management</h1>
                    <p className="role-text-muted">
                        Manage all platform users, view activity & performance statistics, and update user credentials
                    </p>
                </div>

                {/* Role Filter Tabs */}
                <div className="flex gap-3 flex-wrap mb-6">
                    {Object.entries(roleCounts).map(([role, count]) => (
                        <button
                            key={role}
                            onClick={() => setFilterRole(role)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${filterRole === role ? 'btn-primary' : 'btn-secondary'
                                }`}
                        >
                            {role}
                            <span className="px-2 py-0.5 rounded-full text-xs"
                                style={{ background: 'rgba(255,255,255,0.15)' }}>
                                {count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input-field pl-10 max-w-md"
                    />
                </div>

                {/* Table */}
                <div className="glass-card p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold role-text-primary">
                            {filtered.length} user{filtered.length !== 1 ? 's' : ''}
                        </h3>
                        <button
                            onClick={() => router.push('/dashboard/superadmin/users/create')}
                            className="btn-primary px-4 py-2 text-sm"
                        >
                            + Add User
                        </button>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="role-data-table w-full">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                        <th className="text-left text-xs font-semibold role-text-muted pb-3 pr-4">#</th>
                                        <th className="text-left text-xs font-semibold role-text-muted pb-3 pr-4">User</th>
                                        <th className="text-left text-xs font-semibold role-text-muted pb-3 pr-4">Email</th>
                                        <th className="text-left text-xs font-semibold role-text-muted pb-3 pr-4">Role</th>
                                        <th className="text-left text-xs font-semibold role-text-muted pb-3 pr-4">College</th>
                                        <th className="text-left text-xs font-semibold role-text-muted pb-3 pr-4">Joined</th>
                                        <th className="text-right text-xs font-semibold role-text-muted pb-3 pr-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((u: any, i: number) => (
                                        <tr
                                            key={u.id}
                                            className="border-b transition-colors hover:bg-[var(--bg-surface)]/5 cursor-pointer"
                                            style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                                            onClick={() => handleViewUser(u.id)}
                                        >
                                            <td className="py-4 pr-4 text-[var(--text-secondary)] text-sm">{i + 1}</td>
                                            <td className="py-4 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                                        style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                                                        {u.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="role-text-primary text-sm font-medium">{u.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 pr-4 role-text-muted text-sm">{u.email}</td>
                                            <td className="py-4 pr-4" onClick={(e) => e.stopPropagation()}>
                                                <select
                                                    value={u.role}
                                                    onChange={e => handleRoleChange(u.id, e.target.value)}
                                                    className="text-xs font-semibold rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                                                    style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                                                    {['STUDENT', 'INSTRUCTOR', 'QUESTION_CREATOR', 'CONTENT_CREATOR', 'ADMIN', 'SUPERADMIN'].map(r => (
                                                        <option key={r} value={r} style={{ background: '#1a1a2e' }}>{r}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-4 pr-4 role-text-muted text-sm">
                                                {u.role === 'QUESTION_CREATOR' || u.role === 'CONTENT_CREATOR' ? (
                                                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                                        🌐 Global Platform
                                                    </span>
                                                ) : (
                                                    u.collegeName || '—'
                                                )}
                                            </td>
                                            <td className="py-4 pr-4 role-text-muted text-sm">
                                                {new Date(u.createdAt).toISOString().slice(0, 10)}
                                            </td>
                                            <td className="py-4 text-right pr-2" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button
                                                        onClick={() => handleViewUser(u.id)}
                                                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/20 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-all flex items-center gap-1"
                                                        title="View Profile & Stats"
                                                    >
                                                        👁️ View
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditUser(u.id)}
                                                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-all flex items-center gap-1"
                                                        title="Edit User Profile"
                                                    >
                                                        ✏️ Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(u.id)}
                                                        className="px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all flex items-center gap-1"
                                                        title="Delete User"
                                                    >
                                                        🗑️ Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered.length === 0 && (
                                <div className="text-center py-16">
                                    <div className="text-5xl mb-3">👥</div>
                                    <p className="role-text-muted">No users found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* User Detail Modal */}
            {selectedUser && (
                <UserDetailModal
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    canDelete={true}
                    onDelete={handleDelete}
                    onEdit={(u) => {
                        setSelectedUser(null)
                        setEditingUser(u)
                    }}
                />
            )}

            {/* User Edit Modal */}
            {editingUser && (
                <UserEditModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onSuccess={handleUserUpdated}
                />
            )}

            {/* Loading Details Overlay */}
            {loadingDetails && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )}
        </div>
    )
}
