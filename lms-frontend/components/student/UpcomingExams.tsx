'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'

export default function UpcomingExams() {
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/student/exams')
      .then((r) => setExams(Array.isArray(r.data) ? r.data : []))
      .catch(() => setExams([]))
      .finally(() => setLoading(false))
  }, [])

  const upcoming = exams
    .filter((e) => e.status === 'SCHEDULED' || e.status === 'LIVE' || e.attemptStatus === 'IN_PROGRESS')
    .slice(0, 4)

  if (loading || upcoming.length === 0) return null

  return (
    <section className="portal-section" aria-labelledby="upcoming-exams">
      <div className="portal-section-heading">
        <h2 id="upcoming-exams">Upcoming exams</h2>
        <Link className="portal-link" href="/dashboard/student/exams">View all<ArrowRight size={16} /></Link>
      </div>
      <ul className="portal-course-list">
        {upcoming.map((exam) => (
          <li key={exam.id}>
            <div className="portal-course-info">
              <small>{exam.attemptStatus === 'IN_PROGRESS' ? 'In progress' : exam.status}</small>
              <h3>
                <Link href={exam.attemptStatus === 'IN_PROGRESS'
                  ? `/dashboard/student/exams/${exam.id}/attempt?attemptId=${exam.attemptId}`
                  : `/dashboard/student/exams/${exam.id}`}>
                  {exam.title}
                </Link>
              </h3>
              <p>
                {exam.durationMinutes} min · {exam.totalMarks} marks
                {exam.startAt ? ` · ${new Date(exam.startAt).toLocaleString()}` : ''}
              </p>
            </div>
            <Link
              className="portal-link"
              href={exam.attemptStatus === 'IN_PROGRESS'
                ? `/dashboard/student/exams/${exam.id}/attempt?attemptId=${exam.attemptId}`
                : `/dashboard/student/exams/${exam.id}`}
            >
              {exam.attemptStatus === 'IN_PROGRESS' ? 'Resume' : exam.status === 'LIVE' ? 'Start' : 'Details'}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
