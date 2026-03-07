'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api } from '@/lib/api'

interface User {
    id: number
    name: string
    email: string
    role: string
    createdAt: string
    organizationId?: number
    organization?: {
        id: number
        name: string
        type?: string
    }
    collegeName?: string
}

export default function AdminDetailPage() {
    const router = useRouter()
    const params = useParams()
    const adminId = params?.id as string

    const [currentUser, setCurrentUser] = useState<any>(null)
    const [admin, setAdmin] = useState<User | null>(null)
    const [orgUsers, setOrgUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [filterRole, setFilterRole] = useState('ALL')

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) {
            router.push('/login')
            return
        }
        const u = JSON.parse(stored)
        if (u.role !== 'SUPERADMIN') {
            router.push('/dashboard/superadmin')
            return
        }
        setCurrentUser(u)
        fetchAdminDetails()
    }, [adminId])

    const fetchAdminDetails = async () => {
        try {
            setLoading(true)
            
            // Fetch all users
            const usersResponse = await api.get('/superadmin/users')
            const allUsers = usersResponse.data
            
            // Find the admin
            const adminUser = allUsers.find((u: User) => u.id === parseInt(adminId))
            
            if (!adminUser) {
                alert('Admin not found')
                router.push('/dashboard/superadmin/users')
                return
            }
            
            if (adminUser.role !== 'ADMIN') {
                alert('This user is not an ADMIN')
                router.push('/dashboard/superadmin/users')
                return
            }
            
            setAdmin(adminUser)
            
            // Filter users by admin's organization
            if (adminUser.organizationId) {
                const orgUsersData = allUsers.filter(
                    (u: User) => u.organizationId === adminUser.organizationId && u.id !== adminUser.id
                )
                setOrgUsers(orgUsersData)
            }
        } catch (err) {
            console.error('Failed to fetch admin details:', err)
            alert('Failed to load admin details')
        } finally {
            setLoading(false)
        }
    }

    const filteredUsers = orgUsers.filter(u => {
        if (filterRole === 'ALL') return true
        return u.role === filterRole
    })

    const roleCounts = {
        ALL: orgUsers.length,
        INSTRUCTOR: orgUsers.filter(u => u.role === 'INSTRUCTOR').length,
        STUDENT: orgUsers.filter(u => u.role === 'STUDENT').length,
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-mesh flex items-center justify-center">
                <div className="w-12 h-12 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="SUPERADMIN" />
            <Navbar title="Admin Details" />
            <main className="page-content">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/dashboard/superadmin/users')}
                    className="btn-secondary mb-6 flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to All Users
                </button>

                {/* Admin Profile Card */}
                <div className="glass-card p-8 mb-8">
                    <div className="flex items-start gap-6">
                        <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-3xl font-bold text-white flex-shrink-0"
                            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                            {admin?.name?.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-2xl font-bold text-white">{admin?.name}</h1>
                                <span className="badge badge-admin">{admin?.role}</span>
                            </div>
                            <p className="text-gray-400 mb-4">{admin?.email}</p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Organization</p>
                                    <p className="text-white font-medium">
                                        {admin?.organization?.name || 'N/A'}
                                        {admin?.organization?.type && (
                                            <span className="text-gray-400 text-sm ml-2">({admin.organization.type})</span>
                                        )}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">College</p>
                                    <p className="text-white font-medium">{admin?.collegeName || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Joined</p>
                                    <p className="text-white font-medium">
                                        {admin?.createdAt ? new Date(admin.createdAt).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        }) : 'N/A'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">Organization ID</p>
                                    <p className="text-white font-medium">{admin?.organizationId || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Organization Users */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">
                                Users in {admin?.organization?.name}
                            </h2>
                            <p className="text-gray-400 text-sm">
                                {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found
                            </p>
                        </div>
                    </div>

                    {/* Role Filter */}
                    <div className="flex gap-3 flex-wrap mb-6">
                        {Object.entries(roleCounts).map(([role, count]) => (
                            <button
                                key={role}
                                onClick={() => setFilterRole(role)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                                    filterRole === role ? 'btn-primary' : 'btn-secondary'
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

                    {orgUsers.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-5xl mb-3">👥</div>
                            <p className="text-gray-400">No users found in this organization</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                                        {['#', 'User', 'Email', 'Role', 'College', 'Joined'].map(h => (
                                            <th key={h} className="text-left text-xs font-semibold text-gray-400 pb-3 pr-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((u, i) => (
                                        <tr key={u.id} className="border-b transition-colors hover:bg-white/5"
                                            style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
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
                                            <td className="py-4 pr-4">
                                                <span className={`badge ${
                                                    u.role === 'STUDENT' ? 'badge-student' :
                                                    u.role === 'INSTRUCTOR' ? 'badge-instructor' : 'badge-admin'
                                                }`}>{u.role}</span>
                                            </td>
                                            <td className="py-4 pr-4 text-gray-400 text-sm">
                                                {u.collegeName || '—'}
                                            </td>
                                            <td className="py-4 pr-4 text-gray-400 text-sm">
                                                {new Date(u.createdAt).toISOString().slice(0, 10)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredUsers.length === 0 && (
                                <div className="text-center py-16">
                                    <div className="text-5xl mb-3">🔍</div>
                                    <p className="text-gray-400">No {filterRole.toLowerCase()} users found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
