'use client'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'

interface Course { id: number; title: string; description: string; thumbnail?: string; category?: string; level?: string; price?: number; duration?: number; lessonCount?: number; moduleCount?: number; instructor?: { name: string; role?: string } }
interface CourseCardProps { course: Course; isEnrolled: boolean; onEnroll: (id: number) => void; enrollingId: number | null; index: number; isSaved?: boolean; saving?: boolean; onSave?: (saved: boolean) => void }

export default function CourseCard({ course, isEnrolled, onEnroll, enrollingId, isSaved, saving, onSave }: CourseCardProps) {
  return <article className="portal-catalog-course">
    <Link href={`/dashboard/student/courses/${course.id}`} className="portal-catalog-cover" aria-label={`View ${course.title}`}>
      {course.thumbnail ? <img src={course.thumbnail} alt="" loading="lazy" /> : <BookOpen aria-hidden="true" />}
      {isEnrolled && <span>Enrolled</span>}
    </Link>
    <div className="portal-catalog-body"><p className="portal-catalog-category">{[course.category, course.level].filter(Boolean).join(' · ') || 'Course'}</p>
      <h2><Link href={`/dashboard/student/courses/${course.id}`}>{course.title}</Link></h2>
      {onSave && <button className="portal-button secondary" disabled={saving} aria-pressed={!!isSaved} onClick={() => onSave(!isSaved)}>{isSaved ? 'Unsave course' : 'Save course'}</button>}
      {course.description && <p className="portal-catalog-description">{course.description}</p>}
      <p className="portal-catalog-instructor">{course.instructor?.name || 'Instructor not listed'}</p>
      <div className="portal-catalog-meta"><span>{course.lessonCount ?? 0} lessons</span>{!!course.duration && <span>{course.duration} hours</span>}</div>
      <div className="portal-catalog-action"><span>{Number(course.price) > 0 ? `Fee: ${course.price}` : 'Free'}</span>{isEnrolled ? <Link className="portal-button secondary" href={`/dashboard/student/courses/${course.id}/learn`}>Continue</Link> : <button className="portal-button" disabled={enrollingId === course.id} onClick={() => onEnroll(course.id)}>{enrollingId === course.id ? 'Enrolling…' : 'Enroll'}</button>}</div>
    </div>
  </article>
}
