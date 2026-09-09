'use client'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api } from '@/lib/api'
import { getAuthHeaders } from '@/lib/authHeaders'
import { CheckCircle2, ChevronRight } from 'lucide-react'
import MarkdownRenderer from '@/components/editor/MarkdownRenderer'

interface Resource {
    id: number
    title: string
    fileUrl: string
    type: string
    fileSize?: number
}

interface Lesson {
    id: number
    title: string
    description?: string
    videoUrl?: string
    contentUrl?: string
    duration?: number
    type: string
    published: boolean
    order: number
    resources?: Resource[]
}

interface Chapter {

    id: number
    title: string
    description?: string
    order: number
    lessons: Lesson[]
}

interface Module {
    id: number
    title: string
    description?: string
    order: number
    chapters: Chapter[]
}


interface Course {
    id: number
    title: string
    description?: string
    thumbnail?: string
    category?: string
    level?: string
    price?: number
    duration?: number
    objectives?: string
    prerequisites?: string
    targetAudience?: string
    status: string
    published: boolean
    instructor?: {
        id: number
        name: string
        email: string
    }
    modules?: Module[]
}

const levelColors: Record<string, string> = {
    'Beginner': 'bg-green-500/20 text-green-400 border-green-500/30',
    'Intermediate': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'Advanced': 'bg-red-500/20 text-red-400 border-red-500/30',
    'Expert': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

const typeIcons: Record<string, string> = {
    'video': '🎥',
    'article': '📄',
    'quiz': '📝',
    'test': '📝',
    'assessment': '🏆',
    'assignment': '📋',
}

export default function StudentCourseDetailsPage() {
    const router = useRouter()
    const params = useParams()
    const courseId = params?.id

    const [course, setCourse] = useState<Course | null>(null)
    const [isEnrolled, setIsEnrolled] = useState(false)
    const [enrolling, setEnrolling] = useState(false)
    const [loading, setLoading] = useState(true)
    const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set())
    const [error, setError] = useState<string>('')
    const [completedLessons, setCompletedLessons] = useState<number[]>([])
    const [completing, setCompleting] = useState<number | null>(null)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) {
            router.push('/login')
            return
        }

        if (courseId) {
            fetchCourseDetails()
            checkEnrollment()
            fetchCompletedLessons()
        }
    }, [courseId])

    const fetchCompletedLessons = async () => {
        try {
            const apiBase = API_URL
            const res = await apiFetch(`${apiBase}/student/completed-lessons?courseId=${courseId}`, {
                headers: getAuthHeaders(),
                // Use query param for GET instead of body if it's a GET request
            })
            const data = await res.json()
            if (Array.isArray(data)) setCompletedLessons(data)
        } catch (error) {
            console.error('Error fetching completed lessons:', error)
        }
    }

    const fetchCourseDetails = async () => {
        setLoading(true)
        setError('')
        try {
            const response = await api.get(`/courses/${courseId}`)
            if (response.data) {
                console.log('Course data:', response.data)
                setCourse(response.data)
                
                // Expand all modules by default
                if (response.data.modules) {
                    setExpandedModules(new Set(response.data.modules.map((m: Module) => m.id)))
                }
            } else {
                setError('Course not found or not accessible')
            }
        } catch (err: any) {
            console.error('Error fetching course:', err)
            if (err.response?.status === 403 || err.response?.status === 404) {
                setError('This course is not available or you do not have permission to view it.')
            } else {
                setError('Failed to load course details')
            }
        } finally {
            setLoading(false)
        }
    }

    const checkEnrollment = async () => {
        try {
            const response = await api.get('/enrollments/my')
            if (Array.isArray(response.data)) {
                const enrolled = response.data.some((e: any) => e.courseId === parseInt(courseId as string))
                setIsEnrolled(enrolled)
            }
        } catch (error) {
            console.error('Error checking enrollment:', error)
        }
    }

    const handleEnroll = async () => {
        setEnrolling(true)
        try {
            await api.post('/enrollments', { courseId: parseInt(courseId as string) })
            setIsEnrolled(true)
        } catch (error) {
            console.error('Error enrolling:', error)
        }
        setEnrolling(false)
    }

    const handleComplete = async (lessonId: number) => {
        setCompleting(lessonId)
        try {
            const apiBase = API_URL
            const completionResponse = await apiFetch(`${apiBase}/student/lessons/${lessonId}/complete`, {
                method: 'POST',
                headers: getAuthHeaders(),
            })
            if (!completionResponse.ok) throw new Error('Could not save lesson progress')
            setCompletedLessons(prev => Array.from(new Set([...prev, lessonId])))
            // Refresh stats in navbar/sidebar by refreshing user
            const refreshRes = await apiFetch(`${apiBase}/auth/me`, { headers: getAuthHeaders() })
            const updatedUser = await refreshRes.json()
            if (updatedUser && !updatedUser.message) {
                localStorage.setItem('user', JSON.stringify(updatedUser))
                window.dispatchEvent(new Event('storage')) // Trigger storage event for navbar to sync
            }
        } catch (error) {
            console.error('Error completing lesson:', error)
        } finally {
            setCompleting(null)
        }
    }

    const toggleModule = (moduleId: number) => {
        setExpandedModules(prev => {
            const newSet = new Set(prev)
            if (newSet.has(moduleId)) {
                newSet.delete(moduleId)
            } else {
                newSet.add(moduleId)
            }
            return newSet
        })
    }

    const formatDuration = (minutes?: number) => {
        if (!minutes) return ''
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        if (hours > 0) {
            return `${hours}h ${mins}m`
        }
        return `${mins}m`
    }

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return ''
        const mb = bytes / (1024 * 1024)
        return `${mb.toFixed(2)} MB`
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-mesh">
                <Sidebar role="STUDENT" />
                <Navbar title="Course Details" />
                <main className="page-content">
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                </main>
            </div>
        )
    }

    if (error || !course) {
        return (
            <div className="min-h-screen bg-mesh">
                <Sidebar role="STUDENT" />
                <Navbar title="Course Details" />
                <main className="page-content">
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🚫</div>
                        <p className="text-white font-semibold text-lg mb-2">{error || 'Course Not Found'}</p>
                        <p className="text-gray-400 text-sm mb-6">
                            This course may not exist, is not yet approved, or you don&apos;t have permission to view it.
                        </p>
                        <button onClick={() => router.push('/dashboard/student/courses')} className="btn-primary">
                            ← Back to Courses
                        </button>
                    </div>
                </main>
            </div>
        )
    }

    const totalChapters = course.modules?.reduce((acc, m) => acc + (m.chapters?.length || 0), 0) || 0
    const totalLectures = course.modules?.reduce((acc, m) => 
        acc + (m.chapters?.reduce((accChapter, c) => accChapter + (c.lessons?.length || 0), 0) || 0), 0
    ) || 0
    
    const totalDuration = course.modules?.reduce((acc, m) => 
        acc + (m.chapters?.reduce((accChapter, c) => 
            accChapter + (c.lessons?.reduce((sum, l) => sum + (l.duration || 0), 0) || 0), 0
        ) || 0), 0
    ) || 0


    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="STUDENT" />
            <Navbar title="Course Details" />
            <main className="page-content max-w-7xl">
                {/* Back Button */}
                <button 
                    onClick={() => router.push('/dashboard/student/courses')}
                    className="btn-secondary mb-6 inline-flex items-center gap-2"
                >
                    ← Back to Courses
                </button>

                {/* Course Header */}
                <div className="glass-card p-8 mb-8">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Course Image */}
                        <div className="lg:w-1/3">
                            <div 
                                className="h-64 rounded-xl overflow-hidden"
                                style={{ 
                                    background: course.thumbnail 
                                        ? `url(${course.thumbnail}) center/cover` 
                                        : 'linear-gradient(135deg, #667eea, #764ba2)' 
                                }}
                            >
                                {!course.thumbnail && (
                                    <div className="h-full flex items-center justify-center text-6xl opacity-50">
                                        📚
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Course Info */}
                        <div className="lg:w-2/3">
                            {/* Category & Level */}
                            <div className="flex flex-wrap gap-2 mb-3">
                                {course.category && (
                                    <span className="badge bg-purple-500/20 text-purple-400 border-purple-500/30">
                                        {course.category}
                                    </span>
                                )}
                                {course.level && (
                                    <span className={`badge border ${levelColors[course.level]}`}>
                                        {course.level}
                                    </span>
                                )}
                                <span className="badge bg-green-500/20 text-green-400 border-green-500/30">
                                    ✅ APPROVED
                                </span>
                                {isEnrolled && (
                                    <span className="badge badge-student">
                                        ✓ Enrolled
                                    </span>
                                )}
                            </div>

                            {/* Title */}
                            <h1 className="text-4xl font-bold text-white mb-4">{course.title}</h1>

                            {/* Description */}
                            <div className="text-gray-300 text-lg mb-4 leading-relaxed prose prose-invert max-w-none">
                                {course.description ? (
                                    <MarkdownRenderer content={course.description} />
                                ) : (
                                    'No description available'
                                )}
                            </div>

                            {/* Instructor */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl">
                                    {course.instructor?.name?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Instructor</p>
                                    <p className="text-white font-semibold">{course.instructor?.name}</p>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="flex flex-wrap gap-6 mb-6">
                                <div className="flex items-center gap-2 text-gray-300">
                                    <span className="text-2xl">📑</span>
                                    <div>
                                        <p className="text-sm text-gray-400">Sections</p>
                                        <p className="font-semibold">{course.modules?.length || 0}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-gray-300">
                                    <span className="text-2xl">🎥</span>
                                    <div>
                                        <p className="text-sm text-gray-400">Lectures</p>
                                        <p className="font-semibold">{totalLectures}</p>
                                    </div>
                                </div>
                                {course.duration && (
                                    <div className="flex items-center gap-2 text-gray-300">
                                        <span className="text-2xl">⏱️</span>
                                        <div>
                                            <p className="text-sm text-gray-400">Duration</p>
                                            <p className="font-semibold">{course.duration}h</p>
                                        </div>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 text-gray-300">
                                    <span className="text-2xl">💰</span>
                                    <div>
                                        <p className="text-sm text-gray-400">Price</p>
                                        <p className="font-semibold">
                                            {course.price && course.price > 0 ? `$${course.price}` : 'FREE'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Enroll / Start Learning Button */}
                            {!isEnrolled && (
                                <button
                                    onClick={handleEnroll}
                                    disabled={enrolling}
                                    className="btn-primary px-8 py-3 text-lg shadow-xl shadow-indigo-500/20 hover:scale-105 transition-all"
                                >
                                    {enrolling ? 'Enrolling...' : '🎓 Enroll Now'}
                                </button>
                            )}
                            {isEnrolled && (
                                <div className="space-y-4">
                                    <div className="flex flex-wrap items-center gap-4">
                                        <button
                                            onClick={() => router.push(`/dashboard/student/courses/${courseId}/learn?start=true`)}
                                            className="btn-primary px-10 py-4 text-xl font-black rounded-2xl shadow-2xl shadow-indigo-500/40 hover:scale-105 transition-all flex items-center gap-3 group"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                                            <span>{completedLessons.length > 0 ? '▶ Resume Course' : '🚀 Start Course'}</span>
                                            <ChevronRight size={24} />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 text-emerald-400 font-bold px-1">
                                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/20 ring-1 ring-emerald-400/30">
                                            <CheckCircle2 size={14} />
                                        </div>
                                        <span className="text-sm">Enrolled & Ready to learn</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Course Content Sections */}
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Left Column - Course Details */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Learning Objectives */}
                        {course.objectives && (
                            <div className="glass-card p-6">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span>🎯</span> Learning Objectives
                                </h3>
                                <div className="text-gray-300 prose prose-invert max-w-none">
                                    <MarkdownRenderer content={course.objectives} />
                                </div>
                            </div>
                        )}

                        {/* Prerequisites */}
                        {course.prerequisites && (
                            <div className="glass-card p-6">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span>📋</span> Prerequisites
                                </h3>
                                <div className="text-gray-300 prose prose-invert max-w-none">
                                    <MarkdownRenderer content={course.prerequisites} />
                                </div>
                            </div>
                        )}

                        {/* Target Audience */}
                        {course.targetAudience && (
                            <div className="glass-card p-6">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span>👥</span> Target Audience
                                </h3>
                                <div className="text-gray-300 prose prose-invert max-w-none">
                                    <MarkdownRenderer content={course.targetAudience} />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Course Curriculum */}
                    <div className="lg:col-span-2">
                        <div className="glass-card p-6">
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                    <span>📚</span> Course Chapters & Modules
                                </h2>
                                {isEnrolled && course.modules && course.modules.length > 0 && (
                                    <button
                                        onClick={() => router.push(`/dashboard/student/courses/${courseId}/learn`)}
                                        className="btn-primary px-4 py-2 text-xs font-bold flex items-center gap-1.5"
                                    >
                                        <span>🚀</span> Start Learning
                                    </button>
                                )}
                            </div>

                            {course.modules && course.modules.length > 0 ? (
                                <div className="space-y-6">
                                    {course.modules.map((module, moduleIndex) => (
                                        <div key={module.id} className="border border-white/10 rounded-xl overflow-hidden bg-slate-900/50">
                                            {/* Chapter Header */}
                                            <div className="p-4 bg-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10">
                                                <button
                                                    onClick={() => toggleModule(module.id)}
                                                    className="flex items-center gap-3 text-left flex-1"
                                                >
                                                    <span className="text-xl">
                                                        {expandedModules.has(module.id) ? '📂' : '📁'}
                                                    </span>
                                                    <div>
                                                        <p className="text-white font-bold text-lg flex items-center gap-2">
                                                            <span className="px-2.5 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-xs">
                                                                Chapter {moduleIndex + 1}
                                                            </span>
                                                            <span>{module.title}</span>
                                                        </p>
                                                        {module.description && (
                                                            <p className="text-gray-400 text-xs mt-1">
                                                                {module.description}
                                                            </p>
                                                        )}
                                                        <p className="text-gray-400 text-[11px] mt-1 font-semibold">
                                                            {module.chapters?.length || 0} Modules inside Chapter
                                                        </p>
                                                    </div>
                                                </button>

                                                {isEnrolled && (
                                                    <button
                                                        onClick={() => router.push(`/dashboard/student/courses/${courseId}/learn?chapterId=${module.id}&start=true`)}
                                                        className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 shadow"
                                                    >
                                                        <span>▶</span> Start Chapter {moduleIndex + 1}
                                                    </button>
                                                )}
                                            </div>

                                            {/* Modules inside Chapter */}
                                            {expandedModules.has(module.id) && (
                                                <div className="p-4 space-y-3 bg-black/20">
                                                    {module.chapters?.map((chapter, chapterIndex) => (
                                                        <div key={chapter.id} className="p-3.5 bg-white/5 rounded-lg border border-white/5 hover:bg-white/10 transition-colors">
                                                            <div className="flex items-center justify-between gap-3">
                                                                <div className="flex items-center gap-3">
                                                                    <span className="text-base">📄</span>
                                                                    <div>
                                                                        <p className="text-white font-medium text-sm flex items-center gap-2">
                                                                            <span className="text-purple-400 text-xs font-bold">
                                                                                Module {moduleIndex + 1}.{chapterIndex + 1}
                                                                            </span>
                                                                            <span>{chapter.title}</span>
                                                                        </p>
                                                                        {chapter.description && (
                                                                            <p className="text-gray-400 text-xs mt-0.5">{chapter.description}</p>
                                                                        )}
                                                                    </div>
                                                                </div>

                                                                {isEnrolled && (
                                                                    <button
                                                                        onClick={() => router.push(`/dashboard/student/courses/${courseId}/learn?moduleId=${chapter.id}&start=true`)}
                                                                        className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline"
                                                                    >
                                                                        Start Module →
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-gray-400">
                                    <p className="text-4xl mb-2">📭</p>
                                    <p>No chapters or modules added to this course yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    </div>
                </main>
        </div>
    )
}
