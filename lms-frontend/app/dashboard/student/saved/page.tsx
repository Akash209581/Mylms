'use client'
import Link from 'next/link'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import { useSavedCourses } from '@/lib/useSavedCourses'

export default function SavedCoursesPage() {
  const { courses, loading, error, busy, reload, toggle } = useSavedCourses()
  return <div className="portal-page"><StudentReferenceShell active="saved" /><main id="student-main" tabIndex={-1} className="portal-main">
    <div className="portal-page-heading"><div><p className="portal-eyebrow">Your reading list</p><h1>Saved courses</h1><p>Keep courses here to explore later. Saving does not enroll you.</p></div><Link className="portal-button secondary" href="/dashboard/student/courses">Explore courses</Link></div>
    {error && <p role="alert" className="portal-error">{error}<button onClick={reload}>Retry</button></p>}
    {loading ? <p role="status">Loading saved courses…</p> : courses.length ? <ul className="portal-course-list">{courses.map(({ courseId, course }) => <li key={courseId}>
      <div className="portal-course-info"><h2><Link href={`/dashboard/student/courses/${courseId}`}>{course.title}</Link></h2><p>{[course.category, course.level].filter(Boolean).join(' · ')}</p></div>
      <Link className="portal-button secondary" href={`/dashboard/student/courses/${courseId}`}>View course</Link>
      <button className="portal-button secondary" disabled={busy.includes(courseId)} onClick={() => void toggle(courseId, false)} aria-label={`Remove ${course.title} from saved courses`}>Remove</button>
    </li>)}</ul> : !error && <div className="portal-empty"><h2>No saved courses yet</h2><p>Use Save course in the catalog to build your list.</p></div>}
  </main></div>
}
