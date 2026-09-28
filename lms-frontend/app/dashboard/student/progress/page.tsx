'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, BookOpen, CircleCheck, Clock3, GraduationCap } from 'lucide-react'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import { api } from '@/lib/api'
import { hasRole } from '@/lib/roleUtils'
import { EmptyState, PageHeader, Stat } from '@/components/ui'

interface CourseProgress { id: number; course: { id: number; title: string; thumbnail?: string; category?: string }; completedLessons: number; totalLessons: number; progressPercent: number; enrolledAt: string }

export default function StudentProgressPage() {
  const router = useRouter()
  const [enrollments, setEnrollments] = useState<CourseProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || 'null')
      if (!user) { router.replace('/login'); return }
      if (!hasRole(user, 'STUDENT')) { router.replace(`/dashboard/${String(user.role).toLowerCase()}`); return }
    } catch { router.replace('/login'); return }
    api.get('/student/dashboard-details')
      .then(({ data }) => {
        if (!Array.isArray(data?.coursesProgress)) return
        setEnrollments(data.coursesProgress.map((e: any) => ({
          id: e.id ?? e.courseId,
          course: { id: e.courseId, title: e.title, thumbnail: e.thumbnail, category: e.category },
          completedLessons: e.completedLessons ?? 0,
          totalLessons: e.totalLessons ?? 0,
          progressPercent: e.progressPercent ?? 0,
          enrolledAt: e.enrolledAt,
        })))
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [router])

  const overall = enrollments.length ? Math.round(enrollments.reduce((sum, item) => sum + item.progressPercent, 0) / enrollments.length) : 0
  const completed = enrollments.filter(item => item.progressPercent >= 100).length
  const active = enrollments.filter(item => item.progressPercent > 0 && item.progressPercent < 100).length
  const untouched = enrollments.filter(item => item.progressPercent === 0).length
  const sorted = [...enrollments].sort((a, b) => {
    const rank = (p: number) => (p > 0 && p < 100 ? 0 : p === 0 ? 1 : 2)
    return rank(a.progressPercent) - rank(b.progressPercent) || b.progressPercent - a.progressPercent
  })

  return (
    <div className="portal-page">
      <StudentReferenceShell active="progress" />
      <main id="student-main" tabIndex={-1} className="portal-main">
        <PageHeader eyebrow="Your journey" title="Learning progress" description="How far you've come in every course you're enrolled in." />

        <div className="grid gap-4 mb-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
          {loading ? [1, 2, 3, 4].map(i => <div key={i} className="ui-skeleton h-[108px]" />) : <>
            <Stat label="Overall progress" value={`${overall}%`} icon={GraduationCap} />
            <Stat label="Completed" value={completed} icon={CircleCheck} tone="success" />
            <Stat label="In progress" value={active} icon={Clock3} tone="gold" />
            <Stat label="Not started" value={untouched} icon={BookOpen} />
          </>}
        </div>

        <section>
          <div className="ui-section-head">
            <div>
              <h2 className="ui-section-title">Course by course</h2>
              <p className="ui-section-sub">Courses in progress are listed first.</p>
            </div>
          </div>

          {loading ? (
            <div className="grid gap-3">{[1, 2, 3].map(i => <div key={i} className="ui-skeleton h-24" />)}</div>
          ) : enrollments.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No enrollments yet" action={<Link href="/dashboard/student/courses" className="ui-btn ui-btn-primary">Browse courses <ArrowRight aria-hidden="true" /></Link>}>
              Enrol in a course to start tracking your progress here.
            </EmptyState>
          ) : (
            <div className="grid gap-3">
              {sorted.map(item => {
                const done = item.progressPercent >= 100
                return (
                  <Link key={item.id} href={`/dashboard/student/courses/${item.course?.id}/learn`} className="ui-card ui-card-interactive p-5 no-underline">
                    <div className="flex items-center gap-4">
                      <span className={`ui-icon-tile ${done ? 'is-success' : ''}`} aria-hidden="true">{done ? <CircleCheck /> : <BookOpen />}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold tracking-[0.1em] uppercase text-[var(--gold)]">{item.course?.category || 'Course'}</p>
                        <p className="font-display text-lg font-semibold role-text-primary truncate">{item.course?.title}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-display text-2xl font-semibold role-text-primary ui-num">{item.progressPercent}%</p>
                        <p className="text-xs role-text-muted ui-num">{item.completedLessons} / {item.totalLessons || 0} lessons</p>
                      </div>
                    </div>
                    <div className={`ui-progress mt-4 ${done ? 'is-success' : ''}`} role="progressbar" aria-valuenow={item.progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label={`${item.course?.title} progress`}>
                      <span style={{ width: `${Math.min(100, item.progressPercent)}%` }} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
