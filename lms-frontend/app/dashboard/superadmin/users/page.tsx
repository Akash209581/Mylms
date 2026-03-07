'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

export default function SuperAdminUsersPage() {
    const router = useRouter()
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [filterRole, setFilterRole] = useState('ALL')

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN') { router.push('/login'); return }

        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/superadmin/users`, { credentials: 'include' })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setUsers(data) })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const handleRoleChange = async (userId: number, newRole: string) => {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/superadmin/users/${userId}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ role: newRole }),
        })
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    }

    const handleDelete = async (userId: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/superadmin/users/${userId}`, {
            method: 'DELETE', credentials: 'include'
        })
        setUsers(prev => prev.filter(u => u.id !== userId))
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
                    <h1 className="text-3xl font-bold text-white mb-1">User Management</h1>
                    <p className="text-gray-400">
                        Manage all platform users and their roles • Click on <span className="text-orange-400 font-medium">ADMIN</span> users to view their organization details
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
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                        <h3 className="text-lg font-semibold text-white">
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
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                        {['#', 'User', 'Email', 'Role', 'Organization', 'College', 'Joined', 'Actions'].map(h => (
                                            <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((u: any, i: number) => (
                                        <tr 
                                            key={u.id} 
                                            className="border-b transition-colors hover:bg-white/5 cursor-pointer"
                                            style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                                            onClick={() => u.role === 'ADMIN' && router.push(`/dashboard/superadmin/users/admin/${u.id}`)}
                                        >
                                            <td className="py-4 pr-4 text-gray-500 text-sm">{i + 1}</td>
                                            <td className="py-4 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                                                        style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                                                        {u.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="text-white text-sm font-medium">{u.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 pr-4 text-gray-400 text-sm">{u.email}</td>
                                            <td className="py-4 pr-4" onClick={(e) => e.stopPropagation()}>
                                                <select
                                                    value={u.role}
                                                    onChange={e => handleRoleChange(u.id, e.target.value)}
                                                    className="text-xs font-semibold rounded-lg px-2 py-1.5 outline-none cursor-pointer"
                                                    style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
                                                    {['STUDENT', 'INSTRUCTOR', 'ADMIN', 'SUPERADMIN'].map(r => (
                                                        <option key={r} value={r} style={{ background: '#1a1a2e' }}>{r}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="py-4 pr-4 text-gray-400 text-sm">
                                                {u.organization?.name || (u.role === 'SUPERADMIN' ? '—' : 'N/A')}
                                            </td>
                                            <td className="py-4 pr-4 text-gray-400 text-sm">
                                                {u.collegeName || '—'}
                                            </td>
                                            <td className="py-4 pr-4 text-gray-400 text-sm">
                                                {new Date(u.createdAt).toISOString().slice(0, 10)}
                                            </td>
                                            <td className="py-4" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleDelete(u.id)}
                                                    className="px-3 py-1 rounded-lg text-xs font-medium transition-colors hover:opacity-80"
                                                    style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered.length === 0 && (
                                <div className="text-center py-16">
                                    <div className="text-5xl mb-3">👥</div>
                                    <p className="text-gray-400">No users found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
