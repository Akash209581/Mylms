'use client'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { getAuthHeaders } from '@/lib/authHeaders'
import { getRoleBasePath } from '@/lib/roleUtils'

interface Course {
    id: number
    title: string
    category: string
    level: string
    instructor?: { name: string; role: string }
    status: string
}

export default function ContentCreationPage() {
    const router = useRouter()
    const [courses, setCourses] = useState<Course[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [userRole, setUserRole] = useState<string>('SUPERADMIN')

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        try {
            const u = JSON.parse(stored)
            if (u?.role) setUserRole(u.role)
            if (u?.role && !['SUPERADMIN', 'ADMIN', 'INSTRUCTOR', 'CONTENT_CREATOR'].includes(u.role)) {
                router.push('/login')
                return
            }
        } catch (e) {
            console.error(e)
        }
        fetchCourses()
    }, [])

    const fetchCourses = async () => {
        try {
            const API = API_URL
            const res = await apiFetch(`${API}/courses`, {
                headers: getAuthHeaders()
            })
            const data = await res.json()
            if (Array.isArray(data)) {
                setCourses(data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const filtered = courses.filter(c => 
        c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.category?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role={userRole} />
            <Navbar title="Content Creation Console" />
            
            <main className="page-content">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Content Library</h1>
                        <p className="text-gray-400 text-sm">Select a course to build or edit its notebook content</p>
                    </div>
                    
                    <div className="relative w-full md:w-96">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                        <input 
                            type="text"
                            placeholder="Search courses..."
                            className="input-field pl-10"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <div className="text-5xl mb-4">📓</div>
                        <h3 className="text-xl font-bold text-white mb-2">No courses found</h3>
                        <p className="text-gray-400 mb-6">Create a new course first to start building content.</p>
                        <button 
                            onClick={() => router.push(`${getRoleBasePath(userRole)}/courses/create`)}
                            className="btn-primary"
                        >
                            ➕ Create Course
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map(course => (
                            <div key={course.id} className="glass-card group overflow-hidden border border-white/5 hover:border-purple-500/30 transition-all duration-300">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20">
                                            {course.category || 'General'}
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            course.status === 'APPROVED' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                                        }`}>
                                            {course.status}
                                        </span>
                                    </div>
                                    
                                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-purple-400 transition-colors line-clamp-1">
                                        {course.title}
                                    </h3>
                                    
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
                                        <span>👤 {course.instructor?.role === 'SUPERADMIN' ? 'Superadmin' : (course.instructor?.name || 'Instructor')}</span>
                                        <span className="w-1 h-1 rounded-full bg-gray-700"></span>
                                        <span>📊 {course.level || 'All Levels'}</span>
                                    </div>

                                    <div className="flex gap-3">
                                        <button 
                                            onClick={() => router.push(`${getRoleBasePath(userRole)}/edit-lesson/${course.id}`)}
                                            className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold transition-all shadow-lg shadow-purple-900/20"
                                        >
                                            📓 Open Notebook
                                        </button>
                                        <button 
                                            onClick={() => router.push(`${getRoleBasePath(userRole)}/courses/${course.id}/builder`)}
                                            className="px-3 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 transition-all border border-white/10"
                                            title="Structure Builder"
                                        >
                                            🏗️
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    )
}
