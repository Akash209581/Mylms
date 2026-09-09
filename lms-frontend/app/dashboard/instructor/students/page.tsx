'use client'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import UserDetailModal from '@/components/UserDetailModal'
import { getAuthHeaders } from '@/lib/authHeaders'

export default function InstructorStudentsPage() {
    const router = useRouter()
    const [students, setStudents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedStudent, setSelectedStudent] = useState<any>(null)
    const [loadingDetails, setLoadingDetails] = useState(false)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'INSTRUCTOR') { router.push(`/dashboard/${u.role.toLowerCase()}`); return }

        apiFetch(`${API_URL}/instructor/students`, {
            credentials: 'include',
            headers: getAuthHeaders(),
        })
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setStudents(data) })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const handleViewStudent = async (studentId: number) => {
        setLoadingDetails(true)
        try {
            const response = await apiFetch(`${API_URL}/instructor/students/${studentId}`, {
                credentials: 'include',
                headers: getAuthHeaders(),
            })
            if (response.ok) {
                const userData = await response.json()
                setSelectedStudent(userData)
            }
        } catch (error) {
            console.error('Failed to fetch student details:', error)
        } finally {
            setLoadingDetails(false)
        }
    }

    const filtered = students.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="INSTRUCTOR" />
            <Navbar title="My Students" />
            <main className="page-content">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold role-text-primary mb-1">Student Management</h1>
                    <p className="role-text-muted">View all students in your college/university</p>
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input type="text" placeholder="Search students..." value={search}
                        onChange={e => setSearch(e.target.value)} className="input-field pl-10 max-w-md" />
                </div>

                {/* Table */}
                <div className="glass-card p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold role-text-primary">
                            {filtered.length} student{filtered.length !== 1 ? 's' : ''}
                        </h3>
                        <button 
                            onClick={() => router.push('/dashboard/instructor/students/create')}
                            className="btn-primary px-4 py-2 text-sm"
                        >
                            + Add Student
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
                                        {['Student', 'Email', 'College', 'Status', 'Joined', 'Last Login'].map(h => (
                                            <th key={h} className="text-left text-xs font-semibold role-text-muted pb-3 pr-4">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map((s: any) => (
                                        <tr key={s.id} 
                                            className="border-b transition-colors hover:bg-white/5 cursor-pointer"
                                            style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                                            onClick={() => handleViewStudent(s.id)}>
                                            <td className="py-4 pr-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold"
                                                        style={{ background: 'linear-gradient(135deg,#a855f7,#ec4899)' }}>
                                                        {s.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="role-text-primary text-sm font-medium">{s.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 pr-4 role-text-muted text-sm">{s.email}</td>
                                            <td className="py-4 pr-4 role-text-muted text-sm">{s.collegeName || '—'}</td>
                                            <td className="py-4 pr-4">
                                                <span className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                                                    s.isActive !== false 
                                                        ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                                                        : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                                }`}>
                                                    {s.isActive !== false ? '✓ Active' : '✕ Inactive'}
                                                </span>
                                            </td>
                                            <td className="py-4 pr-4 role-text-muted text-sm">
                                                {new Date(s.createdAt).toLocaleDateString('en-US', { 
                                                    year: 'numeric', 
                                                    month: 'short', 
                                                    day: 'numeric' 
                                                })}
                                            </td>
                                            <td className="py-4 pr-4 role-text-muted text-sm">
                                                {s.lastLoginAt 
                                                    ? new Date(s.lastLoginAt).toLocaleDateString('en-US', { 
                                                        year: 'numeric', 
                                                        month: 'short', 
                                                        day: 'numeric' 
                                                    })
                                                    : 'Never'
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filtered.length === 0 && (
                                <div className="text-center py-16">
                                    <div className="text-5xl mb-3">👨‍🎓</div>
                                    <p className="role-text-muted">No students found</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Student Detail Modal */}
            {selectedStudent && (
                <UserDetailModal
                    user={selectedStudent}
                    onClose={() => setSelectedStudent(null)}
                    canDelete={false}
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
