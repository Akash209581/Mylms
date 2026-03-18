'use client'

import { useCallback, useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { getAuthHeaders } from '@/lib/authHeaders'

// Dynamically import the cell-based notebook editor to avoid SSR issues
type LessonEditorProps = {
  lessonId: number
  initialContent?: Record<string, any> | null
  lessonTitle?: string
  onSave: (content: Record<string, any>) => Promise<void>
  readOnly?: boolean
}
const LessonEditor = dynamic<LessonEditorProps>(
  () => import('../../../../../components/editor/LessonEditor'),
  { ssr: false, loading: () => <div className="nb-editor animate-pulse min-h-[480px]" /> }
)

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
interface Lesson {
  id: number
  title: string
  description?: string
  moduleId: number
  type: string
  published: boolean
  content?: Record<string, any> | null
  version?: number
  lastEditedBy?: string
  updatedAt?: string
  module?: {
    id: number
    title: string
    courseId: number
    course?: {
      id: number
      title: string
    }
  }
}

/* ─────────────────────────────────────────────
   Page Component
───────────────────────────────────────────── */
export default function EditLessonPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = Number(params.id)

  const [user, setUser] = useState<any>(null)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [courseTitle, setCourseTitle] = useState('')
  const [courseStatus, setCourseStatus] = useState<string>('')
  const [isReadOnly, setIsReadOnly] = useState(false)
  const hasInitialized = useRef(false)

  /* ── Auth + Fetch ── */
  useEffect(() => {
    const stored = localStorage.getItem('user')
    if (!stored) { router.push('/login'); return }

    const u = JSON.parse(stored)
    const allowedRoles = ['INSTRUCTOR', 'ADMIN', 'SUPERADMIN']
    if (!allowedRoles.includes(u.role)) {
      router.push(`/dashboard/${u.role.toLowerCase()}`)
      return
    }
    setUser(u)

    if (hasInitialized.current) return
    hasInitialized.current = true

    fetchLessonData()
  }, [courseId])

  const fetchLessonData = async () => {
    setLoading(true)
    setError(null)
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

      // 1. Fetch the course
      let res = await fetch(`${API}/courses/${courseId}`, {
        credentials: 'include',
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        throw new Error(`Course not found (HTTP ${res.status})`)
      }
      const courseData = await res.json()
      if (!courseData || !courseData.id) throw new Error('Course not found')

      setCourseTitle(courseData.title)
      setCourseStatus(courseData.status)

      // Ownership and Role Check
      const stored = localStorage.getItem('user')
      const u = stored ? JSON.parse(stored) : null
      
      if (u && u.role !== 'SUPERADMIN') {
        // If course created by SUPERADMIN, it's view-only for everyone else
        if (courseData.instructor?.role === 'SUPERADMIN') {
          setIsReadOnly(true)
        }
        // If course created by another instructor, it's view-only (or forbidden, but view-only is safer for UI)
        else if (courseData.instructorId !== u.id) {
           setIsReadOnly(true)
        }
      }

      // 2. See if there is a module and lesson
      let targetLesson: Lesson | null = courseData.modules?.[0]?.lessons?.[0]

      // 3. If no lesson exists, auto-create one!
      if (!targetLesson) {
        let targetModuleId = courseData.modules?.[0]?.id

        if (!targetModuleId) {
          // Create a module
          const modRes = await fetch(`${API}/modules`, {
            method: 'POST',
            credentials: 'include',
            headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId, title: 'Main Module', order: 1 })
          })
          if (!modRes.ok) throw new Error('Failed to create default module')
          const newModule = await modRes.json()
          targetModuleId = newModule.id
        }

        // Create a lesson
        const lessRes = await fetch(`${API}/lessons`, {
          method: 'POST',
          credentials: 'include',
          headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ moduleId: targetModuleId, title: 'Course Content', type: 'article', order: 1, published: true })
        })
        if (!lessRes.ok) throw new Error('Failed to create default lesson')
        targetLesson = await lessRes.json()
      }

      setLesson(targetLesson)

    } catch (e: any) {
      setError(e.message || 'Failed to load or create lesson for this course')
    } finally {
      setLoading(false)
    }
  }

  /* ── Save handler (called by LessonEditor via debounced auto-save) ── */
  const handleSave = useCallback(async (content: Record<string, any>) => {
    if (!lesson?.id) return
    const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
    const res = await fetch(`${API}/lessons/${lesson.id}/content`, {
      method: 'PUT',
      credentials: 'include',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Save failed (HTTP ${res.status})`)
    }
    const updated = await res.json()
    // Quietly update local version info
    setLesson(prev => prev ? {
      ...prev,
      content: updated.content,
      version: updated.version,
      lastEditedBy: updated.lastEditedBy,
      updatedAt: updated.updatedAt,
    } : prev)
  }, [lesson?.id])

  /* ── Handle Submit ── */
  const handleSubmitForApproval = async () => {
    if (!confirm('Are you sure you want to submit this course for admin approval?')) return
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
      const res = await fetch(`${API}/courses/${courseId}/submit`, {
        method: 'POST',
        credentials: 'include',
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to submit.')
      }
      alert('Course submitted for approval successfully.')
      setCourseStatus('PENDING_APPROVAL')
    } catch (e: any) {
      console.error(e)
      alert(e.message || 'Failed to submit course.')
    }
  }

  /* ── Breadcrumb navigation ── */
  const displayCourseId = courseId
  const displayCourseTitle = courseTitle || lesson?.module?.course?.title || `Course #${courseId}`
  const moduleTitle = lesson?.module?.title

  /* ── Render states ── */
  if (loading) return <LoadingState user={user} />
  if (error) return <ErrorState error={error} user={user} onRetry={fetchLessonData} onBack={() => router.back()} />

  return (
    <div className="min-h-screen bg-mesh">
      <Sidebar role={user?.role} />
      <Navbar title="Lesson Editor" />

      <main className="page-content">
        {/* ── Top Bar ── */}
        <div className="flex items-center justify-between mb-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm font-medium" aria-label="Breadcrumb">
            <button
              onClick={() => router.push('/dashboard/instructor/courses')}
              className="text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              My Courses
            </button>
            {displayCourseId && (
              <>
                <span className="text-slate-400">/</span>
                <button
                  onClick={() => router.push(`/dashboard/instructor/courses`)}
                  className="text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  {displayCourseTitle}
                </button>
              </>
            )}
            {moduleTitle && (
              <>
                <span className="text-slate-400">/</span>
                <span className="text-[var(--text-secondary)]">{moduleTitle}</span>
              </>
            )}
            <span className="text-slate-400">/</span>
            <span className="text-[var(--text-primary)]">Edit Lesson</span>
          </nav>

          {/* Meta info */}
          <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
            {lesson?.version && lesson.version > 1 && (
              <span className="px-2 py-1 bg-[var(--bg-hover)] rounded-lg font-mono">v{lesson.version}</span>
            )}
            {lesson?.lastEditedBy && (
              <span>Last edited by <strong className="text-[var(--text-primary)]">{lesson.lastEditedBy}</strong></span>
            )}
            {lesson?.updatedAt && (
              <span>{new Date(lesson.updatedAt).toLocaleString()}</span>
            )}
          </div>
        </div>

        {/* ── Editor Layout ── */}
        <div className="editor-page-layout">

          {/* ── Lesson Header Card ── */}
          <div className="glass-card p-6 mb-2">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Type badge */}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider mb-3"
                  style={{
                    background: lesson?.type === 'video' ? '#ede9fe' : '#e0f2fe',
                    color: lesson?.type === 'video' ? '#7c3aed' : '#0369a1',
                  }}>
                  {lesson?.type === 'video' ? '🎥' : '📄'} {lesson?.type || 'lesson'}
                </span>

                {/* Title */}
                <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
                  {lesson?.title}
                </h1>

                {lesson?.description && (
                  <p className="text-sm text-[var(--text-secondary)] mt-1">{lesson.description}</p>
                )}
              </div>

              {/* Status and Action Buttons */}
              <div className="flex flex-col items-end gap-3 ml-4">
                {/* Published toggle (visual only — future feature) */}
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold ${lesson?.published
                      ? 'bg-green-100 text-green-700'
                      : 'bg-[var(--bg-hover)] text-[var(--text-secondary)]'
                      }`}
                  >
                    {lesson?.published ? '✓ Published content' : 'Draft content'}
                  </span>
                </div>

                {/* Submit Course Button */}
                {!isReadOnly && (courseStatus === 'DRAFT' || courseStatus === 'REJECTED') && (
                  <button
                    onClick={handleSubmitForApproval}
                    className="btn-primary text-sm px-4 py-2 shadow-sm rounded-lg"
                  >
                    {courseStatus === 'REJECTED' ? 'Resubmit Course' : 'Submit Course'}
                  </button>
                )}

                {isReadOnly && (
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1">
                        🔒 View Only Mode
                    </span>
                )}

                {courseStatus === 'PENDING_APPROVAL' && (
                  <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-3 py-1.5 rounded-lg border border-yellow-200">
                    ⏳ Pending Admin Approval
                  </span>
                )}
                {courseStatus === 'APPROVED' && (
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
                    ✅ Course Approved
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* ── How-to hint ── */}
          <div className="flex items-start gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-sm text-indigo-700 mb-2">
            <span className="text-lg">💡</span>
            <div>
              <strong>Cell-based content editor</strong> — Each block (heading, subheading, text, code, image, divider) is its own cell, just like Google Colab.
              <span className="mx-1">·</span>Hover between cells to reveal the <strong>+</strong> button and choose a cell type.
              <span className="mx-1">·</span>Click a cell to edit it; use the toolbar for <strong>Bold</strong>, <em>Italic</em>, Link, Image and inline code.
              <span className="mx-1">·</span>Changes <strong>auto-save</strong> after 2.5 s.
            </div>
          </div>

          {/* ── Markdown Editor ── */}
          {lesson?.id && (
            <LessonEditor
              lessonId={lesson.id}
              initialContent={lesson.content ?? null}
              lessonTitle={lesson.title}
              onSave={handleSave}
              readOnly={isReadOnly}
            />
          )}

          {/* ── Footer ── */}
          <div className="flex items-center justify-between pt-2 pb-6 text-xs text-slate-400">
            <span>Content is saved as a cell notebook — rendered block-by-block when students view the lesson.</span>
            <button
              onClick={() => router.back()}
              className="btn-secondary text-xs py-2 px-4"
            >
              &larr; Back
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Loading skeleton
───────────────────────────────────────────── */
function LoadingState({ user }: { user: any }) {
  return (
    <div className="min-h-screen bg-mesh">
      <Sidebar role={user?.role} />
      <Navbar title="Lesson Editor" />
      <main className="page-content">
        <div className="editor-page-layout">
          <div className="glass-card p-6 animate-pulse mb-4">
            <div className="h-4 bg-slate-200 rounded w-1/4 mb-3" />
            <div className="h-7 bg-slate-200 rounded w-2/3 mb-2" />
            <div className="h-4 bg-slate-200 rounded w-1/2" />
          </div>
          <div className="editor-surface animate-pulse min-h-[480px]" />
        </div>
      </main>
    </div>
  )
}

/* ─────────────────────────────────────────────
   Error state
───────────────────────────────────────────── */
function ErrorState({
  error, user, onRetry, onBack,
}: { error: string; user: any; onRetry: () => void; onBack: () => void }) {
  return (
    <div className="min-h-screen bg-mesh">
      <Sidebar role={user?.role} />
      <Navbar title="Lesson Editor" />
      <main className="page-content">
        <div className="editor-page-layout">
          <div className="glass-card p-8 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Failed to load lesson</h2>
            <p className="text-[var(--text-secondary)] text-sm mb-6">{error}</p>
            <div className="flex gap-3 justify-center">
              <button onClick={onRetry} className="btn-primary">Retry</button>
              <button onClick={onBack} className="btn-secondary">Go Back</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
