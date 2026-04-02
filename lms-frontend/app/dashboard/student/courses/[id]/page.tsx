'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api } from '@/lib/api'

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
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
            const res = await fetch(`${apiBase}/student/completed-lessons`, {
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
            const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"
            await fetch(`${apiBase}/student/lessons/${lessonId}/complete`, {
                method: 'POST',
                headers: getAuthHeaders(),
            })
            setCompletedLessons(prev => [...prev, lessonId])
            // Refresh stats in navbar/sidebar by refreshing user
            const refreshRes = await fetch(`${apiBase}/auth/me`, { headers: getAuthHeaders() })
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
                            <p className="text-gray-300 text-lg mb-4 leading-relaxed">
                                {course.description || 'No description available'}
                            </p>

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

                            {/* Enroll Button */}
                            {!isEnrolled && (
                                <button
                                    onClick={handleEnroll}
                                    disabled={enrolling}
                                    className="btn-primary px-8 py-3 text-lg"
                                >
                                    {enrolling ? 'Enrolling...' : '🎓 Enroll Now'}
                                </button>
                            )}
                            {isEnrolled && (
                                <div className="flex items-center gap-2 text-green-400">
                                    <span className="text-2xl">✓</span>
                                    <span className="font-semibold">You are enrolled in this course</span>
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
                                <p className="text-gray-300 whitespace-pre-line">{course.objectives}</p>
                            </div>
                        )}

                        {/* Prerequisites */}
                        {course.prerequisites && (
                            <div className="glass-card p-6">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span>📋</span> Prerequisites
                                </h3>
                                <p className="text-gray-300 whitespace-pre-line">{course.prerequisites}</p>
                            </div>
                        )}

                        {/* Target Audience */}
                        {course.targetAudience && (
                            <div className="glass-card p-6">
                                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <span>👥</span> Target Audience
                                </h3>
                                <p className="text-gray-300 whitespace-pre-line">{course.targetAudience}</p>
                            </div>
                        )}
                    </div>

                    {/* Right Column - Course Curriculum */}
                    <div className="lg:col-span-2">
                        <div className="glass-card p-6">
                            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                                <span>📚</span> Course Curriculum
                            </h2>

                            {course.modules && course.modules.length > 0 ? (
                                <div className="space-y-4">
                                    {course.modules.map((module, moduleIndex) => (
                                        <div key={module.id} className="border border-white/10 rounded-xl overflow-hidden">
                                            {/* Module Header */}
                                            <button
                                                onClick={() => toggleModule(module.id)}
                                                className="w-full p-4 bg-[var(--bg-surface)]/5 hover:bg-[var(--bg-surface)]/10 transition-colors flex items-center justify-between"
                                            >
                                                <div className="flex items-center gap-3 text-left">
                                                    <span className="text-2xl">
                                                        {expandedModules.has(module.id) ? '📂' : '📁'}
                                                    </span>
                                                    <div>
                                                        <p className="text-white font-semibold text-lg">
                                                            Module {moduleIndex + 1}: {module.title}
                                                        </p>
                                                        {module.description && (
                                                            <p className="text-gray-400 text-sm mt-1">
                                                                {module.description}
                                                            </p>
                                                        )}
                                                        <p className="text-[var(--text-secondary)] text-xs mt-1">
                                                            {module.chapters?.length || 0} chapters
                                                        </p>

                                                    </div>
                                                </div>
                                                <span className="text-gray-400">
                                                    {expandedModules.has(module.id) ? '▼' : '▶'}
                                                </span>
                                            </button>

                                            {/* Chapters */}
                                            {expandedModules.has(module.id) && (
                                                <div className="p-4 space-y-4 bg-black/20">
                                                    {module.chapters?.map((chapter, chapterIndex) => (
                                                        <div key={chapter.id} className="border border-white/5 rounded-lg overflow-hidden">
                                                            <div className="bg-white/5 p-3 flex justify-between items-center">
                                                                <h4 className="text-purple-400 font-medium text-sm">
                                                                    Chapter {moduleIndex+1}.{chapterIndex+1}: {chapter.title}
                                                                </h4>
                                                                <span className="text-[10px] text-gray-500 uppercase">
                                                                    {chapter.lessons?.length || 0} topics
                                                                </span>
                                                            </div>
                                                            <div className="p-2 space-y-2">
                                                                {chapter.lessons?.map((lesson, lessonIndex) => (
                                                                    <div key={lesson.id} className="p-3 bg-[var(--bg-surface)]/5 rounded-lg hover:bg-[var(--bg-surface)]/10 transition-colors">
                                                                        {/* Lesson Header */}
                                                                        <div className="flex items-start justify-between gap-4">
                                                                            <div className="flex items-start gap-3 flex-1">
                                                                                <span className="text-base mt-0.5">
                                                                                    {typeIcons[lesson.type] || '📄'}
                                                                                </span>
                                                                                <div className="flex-1">
                                                                                    <p className="text-white font-medium text-sm">
                                                                                        {moduleIndex + 1}.{chapterIndex+1}.{lessonIndex + 1} {lesson.title}
                                                                                    </p>
                                                                                    
                                                                                    {/* Video URL */}
                                                                                    {lesson.videoUrl && (
                                                                                        <div className="mt-1">
                                                                                            <a 
                                                                                                href={lesson.videoUrl}
                                                                                                target="_blank"
                                                                                                rel="noopener noreferrer"
                                                                                                className="text-blue-400 hover:text-blue-300 text-xs flex items-center gap-1"
                                                                                            >
                                                                                                <span>🎬</span> Watch Video
                                                                                            </a>
                                                                                        </div>
                                                                                    )}

                                                                                    {/* Resources */}
                                                                                    {lesson.resources && lesson.resources.length > 0 && (
                                                                                        <div className="mt-3 space-y-1">
                                                                                            <p className="text-gray-400 text-xs font-semibold">
                                                                                                📎 Resources:
                                                                                            </p>
                                                                                            {lesson.resources.map((resource) => (
                                                                                                <a
                                                                                                    key={resource.id}
                                                                                                    href={resource.fileUrl}
                                                                                                    target="_blank"
                                                                                                    rel="noopener noreferrer"
                                                                                                    className="flex items-center gap-2 text-purple-400 hover:text-purple-300 text-sm"
                                                                                                >
                                                                                                    <span>📥</span>
                                                                                                    <span>{resource.title}</span>
                                                                                                    {resource.fileSize && (
                                                                                                        <span className="text-[var(--text-secondary)] text-xs">
                                                                                                            ({formatFileSize(resource.fileSize)})
                                                                                                        </span>
                                                                                                    )}
                                                                                                </a>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </div>

                                                                            {/* Lesson Duration */}
                                                                            {lesson.duration && (
                                                                                <div className="text-gray-400 text-xs whitespace-nowrap">
                                                                                    {formatDuration(lesson.duration)}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                            {/* Mark as Complete Button */}
                                                                            {isEnrolled && (
                                                                                <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                                                                                    {completedLessons.includes(lesson.id) ? (
                                                                                        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                                                                                            <span>✨</span> Completed
                                                                                        </div>
                                                                                    ) : (
                                                                                        <button
                                                                                            onClick={() => handleComplete(lesson.id)}
                                                                                            disabled={completing === lesson.id}
                                                                                            className="text-xs font-black uppercase tracking-widest px-4 py-2 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-lg hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-50"
                                                                                        >
                                                                                            {completing === lesson.id ? 'Processing...' : 'Mark as Done'}
                                                                                        </button>
                                                                                    )}
                                                                                    <div className="flex gap-2">
                                                                                        <span className="badge bg-blue-500/20 text-blue-400 border-blue-500/30 text-[10px] py-0.5">
                                                                                            {lesson.type}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    ))}
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
                                        <p>No curriculum has been added to this course yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </main>
        </div>
    )
}
