'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { getAuthHeaders } from '@/lib/authHeaders'

interface CourseProgress {
    id: number
    course: { id: number; title: string; thumbnail?: string; category?: string }
    completedLessons: number
    totalLessons: number
    progressPercent: number
    enrolledAt: string
    lastActivity?: string
}

const Skeleton = ({ className = '' }: { className?: string }) => (
    <div className={`bg-[var(--bg-raised)] animate-pulse rounded-2xl ${className}`} />
)

export default function StudentProgressPage() {
    const router = useRouter()
    const [enrollments, setEnrollments] = useState<CourseProgress[]>([])
    const [stats, setStats] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'STUDENT') { router.push(`/dashboard/${u.role.toLowerCase()}`); return }

        const headers = getAuthHeaders()
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

        Promise.all([
            fetch(`${apiBase}/enrollments/my`, { headers }).then(r => r.json()),
            fetch(`${apiBase}/student/stats`, { headers }).then(r => r.json()),
        ]).then(([enrollmentData, statsData]) => {
            if (Array.isArray(enrollmentData)) {
                const mapped = enrollmentData.map((e: any) => ({
                    id: e.id,
                    course: e.course,
                    completedLessons: e.completedLessons ?? 0,
                    totalLessons: e.course?.lessonCount ?? 0,
                    progressPercent: e.course?.lessonCount
                        ? Math.round(((e.completedLessons ?? 0) / e.course.lessonCount) * 100)
                        : 0,
                    enrolledAt: e.enrolledAt,
                    lastActivity: e.lastActivity,
                }))
                setEnrollments(mapped)
            }
            if (statsData && !statsData.message) setStats(statsData)
        }).catch(() => { }).finally(() => setLoading(false))
    }, [])

    const overallProgress = enrollments.length
        ? Math.round(enrollments.reduce((sum, e) => sum + e.progressPercent, 0) / enrollments.length)
        : 0
    const completedCourses = enrollments.filter(e => e.progressPercent >= 100).length
    const inProgress = enrollments.filter(e => e.progressPercent > 0 && e.progressPercent < 100).length
    const notStarted = enrollments.filter(e => e.progressPercent === 0).length

    const getProgressColor = (pct: number) => {
        if (pct >= 80) return 'from-emerald-500 to-teal-400'
        if (pct >= 50) return 'from-indigo-500 to-blue-400'
        if (pct > 0) return 'from-amber-500 to-orange-400'
        return 'from-gray-500 to-gray-400'
    }

    return (
        <div className="min-h-screen bg-[var(--bg-base)]">
            <Sidebar role="STUDENT" />
            <Navbar title="My Progress" />
            <main className="page-content pt-24 pb-12">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-black text-[var(--text-primary)] mb-1">Learning Progress</h1>
                    <p className="text-[var(--text-secondary)]">Track your journey across all enrolled courses</p>
                </div>

                {/* Summary Stats */}
                {loading ? (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Overall Progress', value: `${overallProgress}%`, icon: '📊', color: 'from-indigo-500 to-purple-500' },
                            { label: 'Completed', value: completedCourses, icon: '✅', color: 'from-emerald-500 to-teal-500' },
                            { label: 'In Progress', value: inProgress, icon: '⏳', color: 'from-amber-500 to-orange-500' },
                            { label: 'Not Started', value: notStarted, icon: '📚', color: 'from-gray-500 to-slate-500' },
                        ].map((s, i) => (
                            <div key={i} className="glass-card p-6 flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-2xl shadow-lg flex-shrink-0`}>
                                    {s.icon}
                                </div>
                                <div>
                                    <p className="text-2xl font-black text-[var(--text-primary)]">{s.value}</p>
                                    <p className="text-xs text-[var(--text-secondary)] font-semibold">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Course Progress List */}
                <div className="glass-card p-6">
                    <h2 className="text-xl font-black text-[var(--text-primary)] mb-6 flex items-center gap-3">
                        <span className="w-2 h-6 bg-indigo-500 rounded-full" />
                        Course-by-Course Breakdown
                    </h2>

                    {loading ? (
                        <div className="space-y-4">
                            {[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}
                        </div>
                    ) : enrollments.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">📚</div>
                            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">No enrollments yet</h3>
                            <p className="text-[var(--text-secondary)] mb-6">Enroll in a course to start tracking your progress</p>
                            <button
                                onClick={() => router.push('/dashboard/student/courses')}
                                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all"
                            >
                                Browse Courses
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {enrollments.map((e) => (
                                <div
                                    key={e.id}
                                    onClick={() => router.push(`/dashboard/student/courses/${e.course?.id}/learn`)}
                                    className="group p-5 rounded-2xl bg-[var(--bg-raised)] hover:bg-[var(--bg-hover)] border border-[var(--border)] hover:border-indigo-500/30 cursor-pointer transition-all duration-200"
                                >
                                    <div className="flex items-start justify-between gap-4 mb-4">
                                        <div className="flex items-center gap-4">
                                            <div
                                                className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${getProgressColor(e.progressPercent)} flex items-center justify-center text-2xl shadow-lg flex-shrink-0`}
                                            >
                                                {e.progressPercent >= 100 ? '🏆' : e.progressPercent > 0 ? '📖' : '📚'}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-[var(--text-primary)] group-hover:text-indigo-400 transition-colors line-clamp-1">
                                                    {e.course?.title}
                                                </h3>
                                                <p className="text-xs text-[var(--text-secondary)] mt-1">
                                                    {e.course?.category} • Enrolled {new Date(e.enrolledAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <span className={`text-2xl font-black ${e.progressPercent >= 80 ? 'text-emerald-400' : e.progressPercent >= 40 ? 'text-indigo-400' : 'text-amber-400'}`}>
                                                {e.progressPercent}%
                                            </span>
                                            <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">complete</p>
                                        </div>
                                    </div>

                                    {/* Progress bar */}
                                    <div className="relative h-3 bg-[var(--border)] rounded-full overflow-hidden">
                                        <div
                                            className={`h-full bg-gradient-to-r ${getProgressColor(e.progressPercent)} rounded-full transition-all duration-700`}
                                            style={{ width: `${e.progressPercent}%` }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <p className="text-[11px] text-[var(--text-muted)]">
                                            {e.completedLessons} of {e.totalLessons || '?'} lessons completed
                                        </p>
                                        {e.progressPercent >= 100 ? (
                                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wide">✓ Completed</span>
                                        ) : (
                                            <span className="text-[10px] font-semibold text-indigo-400 group-hover:underline">Continue →</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    )
}
