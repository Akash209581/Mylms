'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

export default function AdminUsersPage() {
    const router = useRouter()
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'ADMIN' && u.role !== 'SUPERADMIN') { router.push('/login'); return }

        fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/admin/users`, { credentials: 'include' })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setUsers(data) })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const handleDelete = async (id: number) => {
        if (!confirm('Delete this user?')) return
        await fetch(``${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}`/admin/users/${id}`, { method: 'DELETE', credentials: 'include' })
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
                    <p className="text-gray-400">View and manage registered users</p>
                </div>

                <div className="relative mb-6">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" placeholder="Search users..." value={search}
                        onChange={e => setSearch(e.target.value)} className="input-field pl-10 max-w-md" />
                </div>

                <div className="glass-card p-6">
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
                                        <tr key={u.id} className="border-b transition-colors hover:bg-white/5"
                                            style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
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
                                            <td className="py-4">
                                                <button onClick={() => handleDelete(u.id)}
                                                    className="px-3 py-1 rounded-lg text-xs font-medium"
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
        </div>
    )
}
