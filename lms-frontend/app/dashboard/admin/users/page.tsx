'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import UserDetailModal from '@/components/UserDetailModal'
import { getAuthHeaders } from '@/lib/authHeaders'

export default function AdminUsersPage() {
    const router = useRouter()
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [loadingDetails, setLoadingDetails] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'ADMIN' && u.role !== 'SUPERADMIN') { router.push('/login'); return }

        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/admin/users`, {
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
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/admin/users/${userId}`, {
                credentials: 'include',
                headers: getAuthHeaders(),
            })
            if (response.ok) {
                const userData = await response.json()
                setSelectedUser(userData)
            }
        } catch (error) {
            console.error('Failed to fetch user details:', error)
        } finally {
            setLoadingDetails(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this user?')) return
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/admin/users/${id}`, {
            method: 'DELETE',
            credentials: 'include',
            headers: getAuthHeaders(),
        })
        setUsers(prev => prev.filter(u => u.id !== id))
    }

    const filtered = users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="ADMIN" />
            <Navbar title="Users" />
            <main className="page-content">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-1">User Management</h1>
                    <p className="text-gray-400">Manage instructors and students in your college</p>
                </div>

                <div className="relative mb-6">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" placeholder="Search users..." value={search}
                        onChange={e => setSearch(e.target.value)} className="input-field pl-10 max-w-md" />
                </div>

                <div className="glass-card p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold text-white">
                            {filtered.length} user{filtered.length !== 1 ? 's' : ''}
                        </h3>
                        <button 
                            onClick={() => router.push('/dashboard/admin/users/create')}
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
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                        {['User', 'Email', 'Role', 'Joined', 'Actions'].map(h => (
                                            <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((u: any) => (
                                        <tr key={u.id} className="border-b transition-colors hover:bg-[var(--bg-surface)]/5"
                                            style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                                            onClick={() => handleViewUser(u.id)}>
                                            <td className="py-4 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                                                        style={{ background: 'linear-gradient(135deg,#6366f1,#a855f7)' }}>
                                                        {u.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-white text-sm font-medium">{u.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 pr-4 text-gray-400 text-sm">{u.email}</td>
                                            <td className="py-4 pr-4">
                                                <span className={`badge ${u.role === 'STUDENT' ? 'badge-student' :
                                                    u.role === 'INSTRUCTOR' ? 'badge-instructor' :
                                                        u.role === 'ADMIN' ? 'badge-admin' : 'badge-superadmin'
                                                    }`}>{u.role}</span>
                                            </td>
                                            <td className="py-4 pr-4 text-gray-400 text-sm">
                                                {new Date(u.createdAt).toISOString().slice(0, 10)}
                                            </td>
                                            <td className="py-4" onClick={(e) => e.stopPropagation()}>
                                                <button onClick={() => handleDelete(u.id)}
                                                    className="px-3 py-1 rounded-lg text-xs font-medium transition-colors hover:bg-red-500/30"
                                                    style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered.length === 0 && (
                                <div className="text-center py-16 text-gray-400">No users found</div>
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
