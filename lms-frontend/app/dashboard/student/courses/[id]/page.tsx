'use client'

import { apiFetch } from '@/lib/apiFetch'

import { API_URL } from '@/lib/api'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import { toast } from '@/lib/toast'
import { EmptyState, Loading } from '@/components/ui'
import { api } from '@/lib/api'
import { getAuthHeaders } from '@/lib/authHeaders'
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, ChevronDown, Clock3, FileText, Layers, ListTree, Loader2, PlayCircle, SearchX, Target, UserRound, Users } from 'lucide-react'
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
            toast.success('You are enrolled. Happy learning!')
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Enrollment failed. Please try again.')
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

    const shell = (content: React.ReactNode) => (
        <div className="portal-page">
            <StudentReferenceShell active="courses" />
            <main id="student-main" tabIndex={-1} className="portal-main">
                <Link href="/dashboard/student/courses" className="ui-back"><ArrowLeft aria-hidden="true" /> Course catalog</Link>
                {content}
            </main>
        </div>
    )

    if (loading) return shell(<Loading label="Loading course" />)

    if (error || !course) return shell(
        <EmptyState icon={SearchX} title="Course unavailable" action={<Link href="/dashboard/student/courses" className="ui-btn ui-btn-primary">Browse courses</Link>}>
            {error || 'This course may not exist, is not yet approved, or is not available to your college.'}
        </EmptyState>
    )

    const totalLectures = course.modules?.reduce((acc, m) =>
        acc + (m.chapters?.reduce((accChapter, c) => accChapter + (c.lessons?.length || 0), 0) || 0), 0
    ) || 0
    const totalChapters = course.modules?.reduce((acc, m) => acc + (m.chapters?.length || 0), 0) || 0
    const learnHref = `/dashboard/student/courses/${courseId}/learn`
    const aboutSections = [
        { key: 'objectives', title: 'What you will learn', icon: Target, body: course.objectives },
        { key: 'prerequisites', title: 'Prerequisites', icon: ListTree, body: course.prerequisites },
        { key: 'audience', title: 'Who this course is for', icon: Users, body: course.targetAudience },
    ].filter(section => section.body)

    return shell(
        <>
            {/* Hero */}
            <section className="ui-card overflow-hidden mb-8">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
                    <div className="p-8 lg:p-10">
                        <div className="flex flex-wrap gap-2 mb-4">
                            {course.category && <span className="ui-badge is-gold no-dot">{course.category}</span>}
                            {course.level && <span className="ui-badge is-accent no-dot">{course.level}</span>}
                            {isEnrolled && <span className="ui-badge is-success">Enrolled</span>}
                        </div>
                        <h1 className="font-display text-4xl font-semibold role-text-primary leading-tight">{course.title}</h1>
                        {course.description && (
                            <div className="role-text-secondary mt-4 leading-7 max-w-3xl">
                                <MarkdownRenderer content={course.description} />
                            </div>
                        )}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 mt-6">
                            {course.instructor?.name && (
                                <div className="ui-person">
                                    <span className="ui-avatar">{course.instructor.name.charAt(0).toUpperCase()}</span>
                                    <div><small>Instructor</small><strong>{course.instructor.name}</strong></div>
                                </div>
                            )}
                            <ul className="ui-meta">
                                <li><Layers /> {course.modules?.length || 0} modules</li>
                                <li><BookOpen /> {totalChapters} chapters</li>
                                <li><FileText /> {totalLectures} lessons</li>
                                {!!course.duration && <li><Clock3 /> {course.duration} hours</li>}
                            </ul>
                        </div>
                    </div>

                    <aside className="p-8 lg:border-l border-t lg:border-t-0 border-[var(--border)] bg-[var(--bg-raised)] flex flex-col">
                        <div className="h-36 rounded-xl overflow-hidden mb-6 bg-[#1f3a5f] grid place-items-center" style={{ boxShadow: 'inset 0 -3px 0 #9a7a43' }}>
                            {course.thumbnail
                                ? <img src={course.thumbnail} alt="" className="w-full h-full object-cover" />
                                : <span className="font-display text-6xl font-semibold text-white/90">{course.title.trim().charAt(0)}</span>}
                        </div>
                        <p className="text-sm role-text-muted">Course fee</p>
                        <p className="font-display text-3xl font-semibold role-text-primary">{course.price && course.price > 0 ? course.price : 'Free'}</p>
                        <div className="mt-6">
                            {isEnrolled ? (
                                <>
                                    <button onClick={() => router.push(`${learnHref}?start=true`)} className="ui-btn ui-btn-primary ui-btn-lg ui-btn-block">
                                        <PlayCircle aria-hidden="true" /> {completedLessons.length > 0 ? 'Resume course' : 'Start course'}
                                    </button>
                                    <p className="flex items-center justify-center gap-1.5 mt-3 text-sm text-[var(--success)]"><CheckCircle2 className="w-4 h-4" aria-hidden="true" /> {completedLessons.length} lessons completed</p>
                                </>
                            ) : (
                                <button onClick={handleEnroll} disabled={enrolling} className="ui-btn ui-btn-primary ui-btn-lg ui-btn-block">
                                    {enrolling ? <><Loader2 className="animate-spin" aria-hidden="true" /> Enrolling…</> : <>Enroll now <ArrowRight aria-hidden="true" /></>}
                                </button>
                            )}
                        </div>
                    </aside>
                </div>
            </section>

            <div className={`grid gap-8 ${aboutSections.length ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : ''} items-start`}>
                {/* Curriculum */}
                <section className="min-w-0">
                    <div className="ui-section-head">
                        <div>
                            <h2 className="ui-section-title">Curriculum</h2>
                            <p className="ui-section-sub">{course.modules?.length || 0} modules · {totalChapters} chapters · {totalLectures} lessons</p>
                        </div>
                    </div>

                    {course.modules && course.modules.length > 0 ? (
                        <div className="grid gap-3">
                            {course.modules.map((module, moduleIndex) => {
                                const open = expandedModules.has(module.id)
                                return (
                                    <div key={module.id} className="ui-card overflow-hidden">
                                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                                            <button onClick={() => toggleModule(module.id)} aria-expanded={open} className="flex items-center gap-4 text-left flex-1 min-w-0">
                                                <span className="grid place-items-center w-10 h-10 rounded-lg bg-[var(--accent-soft)] text-[var(--accent-text)] font-display font-semibold shrink-0">{moduleIndex + 1}</span>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold role-text-primary">{module.title}</p>
                                                    <p className="text-xs role-text-muted mt-0.5">{module.chapters?.length || 0} chapters{module.description ? ` · ${module.description}` : ''}</p>
                                                </div>
                                                <ChevronDown className={`w-5 h-5 role-text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                                            </button>
                                            {isEnrolled && (
                                                <button onClick={() => router.push(`${learnHref}?chapterId=${module.id}&start=true`)} className="ui-btn ui-btn-secondary ui-btn-sm shrink-0">
                                                    <PlayCircle aria-hidden="true" /> Start module
                                                </button>
                                            )}
                                        </div>
                                        {open && module.chapters?.length > 0 && (
                                            <ul className="border-t border-[var(--border)] bg-[var(--bg-raised)]" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                                                {module.chapters.map((chapter, chapterIndex) => (
                                                    <li key={chapter.id} className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 border-[var(--border)]">
                                                        <span className="text-xs font-semibold role-text-muted w-10 shrink-0 ui-num">{moduleIndex + 1}.{chapterIndex + 1}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm role-text-primary">{chapter.title}</p>
                                                            {chapter.description && <p className="text-xs role-text-muted mt-0.5 truncate">{chapter.description}</p>}
                                                        </div>
                                                        <span className="text-xs role-text-muted shrink-0">{chapter.lessons?.length || 0} lessons</span>
                                                        {isEnrolled && (
                                                            <button onClick={() => router.push(`${learnHref}?moduleId=${chapter.id}&start=true`)} className="ui-btn ui-btn-ghost ui-btn-sm shrink-0">Open</button>
                                                        )}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <EmptyState icon={Layers} title="Curriculum coming soon">Modules and lessons have not been published for this course yet.</EmptyState>
                    )}
                </section>

                {aboutSections.length > 0 && (
                    <aside className="grid gap-5">
                        {aboutSections.map(({ key, title, icon: Icon, body }) => (
                            <section key={key} className="ui-card ui-card-pad">
                                <h3 className="flex items-center gap-2 font-display text-lg font-semibold role-text-primary mb-3"><Icon className="w-5 h-5 text-[var(--gold)]" aria-hidden="true" /> {title}</h3>
                                <div className="role-text-secondary text-sm leading-7"><MarkdownRenderer content={body as string} /></div>
                            </section>
                        ))}
                        {course.instructor?.name && (
                            <section className="ui-card ui-card-pad">
                                <h3 className="flex items-center gap-2 font-display text-lg font-semibold role-text-primary mb-3"><UserRound className="w-5 h-5 text-[var(--gold)]" aria-hidden="true" /> Instructor</h3>
                                <p className="role-text-secondary text-sm">{course.instructor.name}</p>
                            </section>
                        )}
                    </aside>
                )}
            </div>
        </>
    )
}
