'use client'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import CoursePreviewModal from '@/components/course/CoursePreviewModal'

const gradients = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
]

export default function SuperAdminCoursesPage() {
    const router = useRouter()
    const [userRole, setUserRole] = useState<'SUPERADMIN' | 'ADMIN'>('SUPERADMIN')
    const [courses, setCourses] = useState<any[]>([])
    const [colleges, setColleges] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [previewCourseId, setPreviewCourseId] = useState<number | null>(null)
    const [assignCourseId, setAssignCourseId] = useState<number | null>(null)
    const [selectedColleges, setSelectedColleges] = useState<number[]>([])
    const [originalAssignedColleges, setOriginalAssignedColleges] = useState<number[]>([])
    const [collegeSearch, setCollegeSearch] = useState('')

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (!['SUPERADMIN', 'ADMIN', 'INSTRUCTOR', 'CONTENT_CREATOR'].includes(u.role)) { router.push('/login'); return }
        setUserRole(u.role)

        const apiUrl = API_URL
        Promise.all([
            apiFetch(`${apiUrl}/courses`, { credentials: 'include' }).then(r => r.json()),
            apiFetch(`${apiUrl}/colleges`, { credentials: 'include' }).then(r => r.json()),
        ])
            .then(([coursesData, collegesData]) => {
                if (Array.isArray(coursesData)) setCourses(coursesData)
                if (Array.isArray(collegesData)) setColleges(collegesData)
            })
            .catch(() => { })
            .finally(() => setLoading(false))
    }, [])

    const handleDelete = async (courseId: number) => {
        if (!confirm('Delete this course permanently?')) return
        await apiFetch(`${API_URL}/superadmin/courses/${courseId}`, {
            method: 'DELETE', credentials: 'include',
        })
        setCourses(prev => prev.filter(c => c.id !== courseId))
    }

    const handleAssign = async () => {
        if (!assignCourseId) return
        try {
            const res = await apiFetch(
                `${API_URL}/courses/${assignCourseId}/assign`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ collegeIds: selectedColleges }),
                },
            )
            if (res.ok) {
                const addedCount = selectedColleges.filter(id => !originalAssignedColleges.includes(id)).length
                const removedCount = originalAssignedColleges.filter(id => !selectedColleges.includes(id)).length
                let message = 'Course assignments updated successfully.'

                if (addedCount > 0 && removedCount === 0) {
                    message = 'Course successfully assigned to the selected College/University. The course is now available for all users of this college.'
                } else if (removedCount > 0 && addedCount === 0) {
                    message = 'Course successfully removed from the selected College/University.'
                } else if (addedCount === 0 && removedCount === 0) {
                    message = 'No changes were made to course assignments.'
                }

                const updatedIds = [...selectedColleges]
                setCourses((prev: any[]) =>
                    prev.map(c => {
                        if (c.id !== assignCourseId) return c
                        const newAssigned = colleges.filter((col: any) => updatedIds.includes(col.id))
                        return { ...c, assignedColleges: newAssigned }
                    }),
                )
                setAssignCourseId(null)
                setSelectedColleges([])
                setOriginalAssignedColleges([])
                alert(message)
            } else {
                const data = await res.json().catch(() => ({}))
                alert(data.message || 'Failed to assign course')
            }
        } catch (e) {
            console.error(e)
            alert('Error assigning course')
        }
    }

    const closeAssignModal = () => {
        setAssignCourseId(null)
        setSelectedColleges([])
        setOriginalAssignedColleges([])
        setCollegeSearch('')
    }

    // For an approved course, resolve the effective home college ID:
    // Priority: course.collegeId (FK) → instructor.collegeId → instructor.collegeName match
    const resolveHomeCollegeId = (course: any): number | null => {
        if (course.collegeId) return Number(course.collegeId)
        if (course.instructor?.collegeId) return Number(course.instructor.collegeId)
        // Legacy fallback: match instructor's collegeName string against the colleges list
        if (course.instructor?.collegeName) {
            const matched = colleges.find((col: any) =>
                col.name.trim().toLowerCase() === course.instructor.collegeName.trim().toLowerCase()
            )
            if (matched) return Number(matched.id)
        }
        return null
    }

    // All effective college IDs already having this course = M2M assigned + home college
    // Use Number() everywhere to guard against JSON serializing integers as strings
    const getEffectiveAssignedIds = (course: any): number[] => {
        const m2mIds: number[] = (course.assignedColleges?.map((c: any) => Number(c.id)) || []) as number[]
        if (course.status === 'APPROVED') {
            const homeId = resolveHomeCollegeId(course)
            if (homeId !== null) {
                return Array.from(new Set([...m2mIds, homeId]))
            }
        }
        return m2mIds
    }

    const filtered = courses.filter(c =>
        c.title?.toLowerCase().includes(search.toLowerCase()) ||
        c.instructor?.name?.toLowerCase().includes(search.toLowerCase()),
    )

    // ── Modal state helpers ──────────────────────────────────────────────────
    const assignedCourse = courses.find(c => c.id === assignCourseId)
    // Resolve home college with fallback chain: FK → instructor FK → instructor name match
    const homeCollegeId: number | null = assignedCourse ? resolveHomeCollegeId(assignedCourse) : null
    const isHomeLocked = (id: number) => Number(id) === homeCollegeId
    const alreadyAssigned = (id: number) => originalAssignedColleges.map(Number).includes(Number(id))
    const isSelected = (id: number) => selectedColleges.map(Number).includes(Number(id))
    const newlyAdding = selectedColleges.filter(id => !originalAssignedColleges.map(Number).includes(Number(id)))
    const removing = originalAssignedColleges.filter(id => !selectedColleges.map(Number).includes(Number(id)) && !isHomeLocked(id))

    const sortedColleges = [...colleges].sort((a, b) => {
        const aHome = isHomeLocked(a.id) ? 0 : 1
        const bHome = isHomeLocked(b.id) ? 0 : 1
        if (aHome !== bHome) return aHome - bHome
        const aAssigned = alreadyAssigned(a.id) ? 0 : 1
        const bAssigned = alreadyAssigned(b.id) ? 0 : 1
        if (aAssigned !== bAssigned) return aAssigned - bAssigned
        return a.name.localeCompare(b.name)
    })

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role={userRole} />
            <Navbar title="All Courses" />
            <main className="page-content">
                {/* Header */}
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Course Management</h1>
                        <p className="text-slate-600 dark:text-gray-400">View and manage all courses on the platform</p>
                    </div>
                    <button
                        onClick={() => router.push(`/dashboard/${userRole.toLowerCase()}/courses/create`)}
                        className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
                    >
                        ➕ Create New Course
                    </button>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                    {[
                        { label: 'Total Courses', value: courses.length, icon: '📚', gradient: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
                        { label: 'Approved', value: courses.filter(c => c.status === 'APPROVED').length, icon: '✅', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
                        { label: 'Pending Approval', value: courses.filter(c => c.status === 'PENDING_APPROVAL').length, icon: '⏳', gradient: 'linear-gradient(135deg,#f59e0b,#d97706)' },
                        { label: 'Rejected', value: courses.filter(c => c.status === 'REJECTED').length, icon: '❌', gradient: 'linear-gradient(135deg,#ef4444,#dc2626)' },
                    ].map((s, i) => (
                        <div key={i} className="stat-card">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-3"
                                style={{ background: s.gradient }}>{s.icon}</div>
                            <p className="text-2xl font-bold text-slate-900 dark:text-white mb-0.5">{s.value}</p>
                            <p className="text-slate-500 dark:text-gray-400 text-xs">{s.label}</p>
                        </div>
                    ))}
                </div>

                {/* Search */}
                <div className="relative mb-6">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search by title or instructor..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="input-field pl-10 max-w-md"
                    />
                </div>

                {/* Course Grid */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filtered.map((course, i) => {
                            const isRejected = course.status === 'REJECTED'
                            const isApproved = course.status === 'APPROVED'
                            const isPending = course.status === 'PENDING_APPROVAL'
                            const effectiveIds = getEffectiveAssignedIds(course)

                            return (
                                <div key={course.id} className="course-card group">
                                    {/* Thumbnail */}
                                    <div
                                        className="h-44 relative overflow-hidden bg-slate-950"
                                        style={{ background: course.thumbnail ? undefined : (isRejected ? 'linear-gradient(135deg,#374151,#1f2937)' : gradients[i % gradients.length]) }}
                                    >
                                        {course.thumbnail ? (
                                            <img
                                                src={course.thumbnail}
                                                alt={course.title}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-40 group-hover:scale-110 transition-transform duration-300">
                                                {isRejected ? '🚫' : '📚'}
                                            </div>
                                        )}

                                        {/* Top Left Badges */}
                                        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
                                            {course.category && (
                                                <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-wider border border-white/10">
                                                    {course.category}
                                                </span>
                                            )}
                                            {course.level && (
                                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold backdrop-blur-md self-start">
                                                    {course.level}
                                                </span>
                                            )}
                                        </div>

                                        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10 items-end">
                                            {/* Status badge */}
                                            <span className={`badge ${isApproved ? 'badge-student' : isPending ? 'badge-instructor' : 'bg-red-500/30 text-red-300 border border-red-500/40'}`}>
                                                {isApproved ? '✅ Approved' : isPending ? '⏳ Pending' : '❌ Rejected'}
                                            </span>
                                            {/* Published badge */}
                                            {isApproved && (
                                                <span className={`badge ${course.published ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}`}>
                                                    {course.published ? '🌐 Published' : '📝 Draft'}
                                                </span>
                                            )}
                                            {/* Assigned colleges count */}
                                            {isApproved && effectiveIds.length > 0 && (
                                                <span className="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                                    🏛️ {effectiveIds.length} College{effectiveIds.length !== 1 ? 's' : ''}
                                                </span>
                                            )}
                                            {course.approver?.role === 'SUPERADMIN' && (
                                                <span className="badge bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                                                    👑 Assigned by Superadmin
                                                </span>
                                            )}
                                        </div>
                                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded text-white/80 text-[10px] font-semibold border border-white/10 z-10">
                                            ID: #{course.id}
                                        </div>
                                    </div>

                                    {/* Rejection reason banner */}
                                    {isRejected && (
                                        <div className="mx-4 mt-3 px-3 py-2.5 bg-red-500/10 border border-red-500/30 rounded-xl">
                                            <div className="flex items-start gap-2">
                                                <span className="text-red-400 text-sm mt-0.5 flex-shrink-0">⚠️</span>
                                                <div>
                                                    <p className="text-red-400 text-xs font-semibold mb-0.5">Rejected by Admin</p>
                                                    <p className="text-red-300/80 text-xs leading-relaxed line-clamp-2">
                                                        {course.rejectionReason || 'No reason provided'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="p-5">
                                        <h3 className={`font-semibold mb-1 line-clamp-1 ${isRejected ? 'text-gray-400' : 'text-white'}`}>
                                            {course.title}
                                        </h3>
                                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{course.description || 'No description'}</p>
                                        <p className="text-[var(--text-secondary)] text-xs mb-4">
                                            by <span className="text-primary-400">{course.instructor?.role === 'SUPERADMIN' ? 'Superadmin' : (course.instructor?.name || 'Unknown Instructor')}</span>
                                        </p>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => router.push(`/dashboard/${userRole.toLowerCase()}/courses/${course.id}/builder`)}
                                                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 cursor-pointer"
                                                style={{ background: 'rgba(79,70,229,0.15)', color: '#818cf8', border: '1px solid rgba(79,70,229,0.3)' }}
                                            >
                                                ✏️ Edit
                                            </button>

                                            <button
                                                onClick={() => setPreviewCourseId(course.id)}
                                                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 cursor-pointer"
                                                style={{ background: 'rgba(99,102,241,0.1) ', color: '#a5b4fc', border: '1px solid rgba(99,102,241,0.2)' }}
                                            >
                                                Preview
                                            </button>

                                            <button
                                                onClick={() => {
                                                    const ids = getEffectiveAssignedIds(course)
                                                    setAssignCourseId(course.id)
                                                    setSelectedColleges(ids)
                                                    setOriginalAssignedColleges(ids)
                                                }}
                                                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 cursor-pointer"
                                                style={{ background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', border: '1px solid rgba(16,185,129,0.3)' }}
                                            >
                                                🏛️ Assign
                                            </button>

                                            <button
                                                onClick={() => handleDelete(course.id)}
                                                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all hover:scale-105 cursor-pointer"
                                                style={{ background: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}
                                            >
                                                Delete
                                            </button>


                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="text-center py-20 glass-card">
                        <div className="text-6xl mb-4">📚</div>
                        <p className="text-white font-semibold text-lg mb-1">No courses yet</p>
                        <p className="text-gray-400 text-sm">Courses created by instructors will appear here</p>
                    </div>
                )}
            </main>

            <CoursePreviewModal
                isOpen={!!previewCourseId}

                courseId={previewCourseId}
                onClose={() => setPreviewCourseId(null)}
            />

            {/* ── Assignment Modal ─────────────────────────────────────────── */}
            {assignCourseId && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden">

                        {/* Header */}
                        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-white">Assign to Colleges</h3>
                                    <p className="text-indigo-200 text-xs mt-0.5 line-clamp-1">
                                        📚 {assignedCourse?.title || `Course #${assignCourseId}`}
                                    </p>
                                </div>
                                <button
                                    onClick={closeAssignModal}
                                    className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors text-xl leading-none"
                                >×</button>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex flex-wrap gap-3 px-5 py-2.5 bg-slate-50 border-b border-slate-200 text-xs">
                            {homeCollegeId && (
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                                    <span className="text-slate-600 font-medium">🏠 Home (locked)</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                                <span className="text-slate-600 font-medium">Already assigned</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block"></span>
                                <span className="text-slate-600 font-medium">Newly adding</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block"></span>
                                <span className="text-slate-600 font-medium">Removing</span>
                            </div>
                        </div>

                        {/* Search Bar */}
                        <div className="px-5 py-3 border-b border-slate-100 bg-white">
                            <div className="relative">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input
                                    type="text"
                                    placeholder="Search for a college..."
                                    value={collegeSearch}
                                    onChange={(e) => setCollegeSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                                />
                            </div>
                        </div>

                        {/* College list */}
                        <div className="max-h-64 overflow-y-auto p-3 space-y-1.5 bg-white">
                            {(() => {
                                const filteredColleges = sortedColleges.filter(c =>
                                    c.name.toLowerCase().includes(collegeSearch.toLowerCase())
                                )

                                if (filteredColleges.length === 0) {
                                    return (
                                        <div className="text-center py-10 text-slate-400 text-sm">
                                            <div className="text-4xl mb-2">🔍</div>
                                            {collegeSearch ? `No matches for "${collegeSearch}"` : "No colleges found"}
                                        </div>
                                    )
                                }

                                return filteredColleges.map((c: any) => {
                                    const isHome = isHomeLocked(c.id)
                                    const wasAssigned = alreadyAssigned(c.id)
                                    const nowSelected = isSelected(c.id)
                                    const isNewlyAdding = nowSelected && !wasAssigned && !isHome
                                    const isRemoving = wasAssigned && !nowSelected && !isHome

                                    let rowClass = 'border border-transparent hover:bg-slate-50'
                                    if (isHome) rowClass = 'border border-amber-200 bg-amber-50'
                                    else if (wasAssigned && nowSelected) rowClass = 'border border-emerald-200 bg-emerald-50'
                                    else if (isNewlyAdding) rowClass = 'border border-indigo-200 bg-indigo-50'
                                    else if (isRemoving) rowClass = 'border border-red-200 bg-red-50'

                                    let cbClass = 'bg-white border-slate-300'
                                    if (isHome) cbClass = 'bg-amber-400 border-amber-400'
                                    else if (wasAssigned && nowSelected) cbClass = 'bg-emerald-500 border-emerald-500'
                                    else if (isNewlyAdding) cbClass = 'bg-indigo-500 border-indigo-500'
                                    else if (isRemoving) cbClass = 'bg-white border-red-400'

                                    const textClass =
                                        isHome ? 'text-amber-800'
                                            : wasAssigned && nowSelected ? 'text-emerald-800'
                                                : isNewlyAdding ? 'text-indigo-800'
                                                    : isRemoving ? 'text-red-700'
                                                        : 'text-slate-700'

                                    return (
                                        <label
                                            key={c.id}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all select-none ${rowClass} ${isHome ? 'cursor-default' : 'cursor-pointer'}`}
                                        >
                                            {/* Custom checkbox */}
                                            <div className="relative flex-shrink-0">
                                                <input
                                                    type="checkbox"
                                                    checked={nowSelected}
                                                    disabled={isHome}
                                                    onChange={(e) => {
                                                        if (isHome) return
                                                        const nid = Number(c.id)
                                                        if (e.target.checked) setSelectedColleges([...selectedColleges, nid])
                                                        else setSelectedColleges(selectedColleges.filter((id: number) => Number(id) !== nid))
                                                    }}
                                                    className="sr-only"
                                                />
                                                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${cbClass}`}>
                                                    {nowSelected && (
                                                        <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
                                                            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Name */}
                                            <div className="flex-1 min-w-0">
                                                <span className={`text-sm font-semibold block truncate ${textClass}`}>
                                                    🏛️ {c.name}
                                                </span>
                                            </div>

                                            {/* Status badge */}
                                            {isHome && (
                                                <span className="flex-shrink-0 text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                                                    🏠 Home
                                                </span>
                                            )}
                                            {!isHome && wasAssigned && nowSelected && (
                                                <span className="flex-shrink-0 text-xs bg-emerald-100 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                                                    ✓ Assigned
                                                </span>
                                            )}
                                            {isNewlyAdding && (
                                                <span className="flex-shrink-0 text-xs bg-indigo-100 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                                                    + Adding
                                                </span>
                                            )}
                                            {isRemoving && (
                                                <span className="flex-shrink-0 text-xs bg-red-100 text-red-600 border border-red-200 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
                                                    − Removing
                                                </span>
                                            )}
                                        </label>
                                    )
                                })
                            })()}
                        </div>

                        {/* Summary bar */}
                        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200">
                            <div className="flex items-center justify-around text-center">
                                {homeCollegeId && (
                                    <>
                                        <div>
                                            <div className="text-lg font-bold text-amber-500">1</div>
                                            <div className="text-xs text-slate-500">Home</div>
                                        </div>
                                        <div className="w-px h-8 bg-slate-200"></div>
                                    </>
                                )}
                                <div>
                                    <div className="text-lg font-bold text-emerald-600">
                                        {originalAssignedColleges.filter(id => selectedColleges.includes(id) && !isHomeLocked(id)).length}
                                    </div>
                                    <div className="text-xs text-slate-500">Keeping</div>
                                </div>
                                <div className="w-px h-8 bg-slate-200"></div>
                                <div>
                                    <div className="text-lg font-bold text-indigo-600">{newlyAdding.length}</div>
                                    <div className="text-xs text-slate-500">Adding</div>
                                </div>
                                <div className="w-px h-8 bg-slate-200"></div>
                                <div>
                                    <div className="text-lg font-bold text-red-500">{removing.length}</div>
                                    <div className="text-xs text-slate-500">Removing</div>
                                </div>
                                <div className="w-px h-8 bg-slate-200"></div>
                                <div>
                                    <div className="text-lg font-bold text-slate-700">{selectedColleges.length}</div>
                                    <div className="text-xs text-slate-500">Total</div>
                                </div>
                            </div>
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-3 px-6 py-4 border-t border-slate-200">
                            <button
                                onClick={closeAssignModal}
                                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAssign}
                                className="flex-1 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-200 text-sm"
                            >
                                Save Assignment
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
