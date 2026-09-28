'use client'
import Link from 'next/link'
import { ArrowRight, Bookmark, BookOpen, Layers, Loader2, UserRound } from 'lucide-react'

interface Course { id: number; title: string; description: string; thumbnail?: string; category?: string; level?: string; price?: number; duration?: number; lessonCount?: number; moduleCount?: number; instructor?: { name: string; role?: string } }
interface CourseCardProps { course: Course; isEnrolled: boolean; onEnroll: (id: number) => void; enrollingId: number | null; index: number; isSaved?: boolean; saving?: boolean; onSave?: (saved: boolean) => void }

const COVERS = ['#1f3a5f', '#722e3d', '#24436b', '#7c5f33', '#2f5e4e', '#3d3f4a']

export default function CourseCard({ course, isEnrolled, onEnroll, enrollingId, isSaved, saving, onSave }: CourseCardProps) {
  const cover = COVERS[course.id % COVERS.length]
  const enrolling = enrollingId === course.id
  return (
    <article className="course-tile">
      <div className="course-tile-cover" style={{ background: course.thumbnail ? undefined : cover }}>
        <Link href={`/dashboard/student/courses/${course.id}`} aria-label={`View ${course.title}`} className="absolute inset-0">
          {course.thumbnail
            ? <img src={course.thumbnail} alt="" loading="lazy" decoding="async" />
            : <span className="course-tile-monogram" aria-hidden="true">{course.title.trim().charAt(0)}</span>}
        </Link>
        {isEnrolled && <span className="ui-badge is-success course-tile-flag">Enrolled</span>}
        {onSave && (
          <button
            className="course-tile-save"
            disabled={saving}
            aria-pressed={!!isSaved}
            aria-label={isSaved ? 'Remove from saved courses' : 'Save course'}
            title={isSaved ? 'Saved' : 'Save for later'}
            onClick={() => onSave(!isSaved)}
          >
            <Bookmark aria-hidden="true" fill={isSaved ? 'currentColor' : 'none'} />
          </button>
        )}
      </div>

      <div className="course-tile-body">
        <p className="course-tile-eyebrow">{[course.category, course.level].filter(Boolean).join(' · ') || 'Course'}</p>
        <h2 className="course-tile-title"><Link href={`/dashboard/student/courses/${course.id}`}>{course.title}</Link></h2>
        {course.description && <p className="course-tile-desc">{course.description}</p>}
        <ul className="ui-meta mt-auto pt-3">
          <li><BookOpen /> {course.lessonCount ?? 0} lessons</li>
          {!!course.moduleCount && <li><Layers /> {course.moduleCount} modules</li>}
          <li className="min-w-0"><UserRound /> <span className="truncate">{course.instructor?.name || 'Instructor'}</span></li>
        </ul>
      </div>

      <div className="course-tile-foot">
        <span className="course-tile-price">{Number(course.price) > 0 ? `Fee ${course.price}` : 'Free'}</span>
        {isEnrolled
          ? <Link className="ui-btn ui-btn-secondary ui-btn-sm" href={`/dashboard/student/courses/${course.id}/learn`}>Continue <ArrowRight aria-hidden="true" /></Link>
          : <button className="ui-btn ui-btn-primary ui-btn-sm" disabled={enrolling} onClick={() => onEnroll(course.id)}>
              {enrolling ? <><Loader2 className="animate-spin" aria-hidden="true" /> Enrolling…</> : 'Enroll'}
            </button>}
      </div>
    </article>
  )
}
