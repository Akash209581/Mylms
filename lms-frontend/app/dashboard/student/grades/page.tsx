'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import { api } from '@/lib/api'

export default function StudentGradesPage() {
  const [exams, setExams] = useState<any[]>([])
  const [quizzes, setQuizzes] = useState<any[]>([])
  const [tests, setTests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/student/exams').then((r) => r.data).catch(() => []),
      api.get('/student/dashboard-details').then((r) => r.data).catch(() => ({})),
    ]).then(([examList, details]) => {
      setExams(Array.isArray(examList) ? examList : [])
      setQuizzes(details?.assignedQuizzes || [])
      setTests(details?.assignedTests || [])
    }).finally(() => setLoading(false))
  }, [])

  const graded = exams.filter((e) => e.attemptStatus === 'SUBMITTED' || e.attemptStatus === 'EVALUATED')

  return (
    <div className="portal-page">
      <StudentReferenceShell active="grades" />
      <main id="student-main" tabIndex={-1} className="portal-main">
        <div className="portal-page-heading">
          <div>
            <p className="portal-eyebrow">Results</p>
            <h1>Grades</h1>
            <p>Exam scores and lesson assessments from your enrolled courses.</p>
          </div>
        </div>

        {loading ? (
          <p className="portal-empty" role="status">Loading your grades…</p>
        ) : (
          <>
            <section className="portal-section" aria-labelledby="exam-grades">
              <div className="portal-section-heading">
                <h2 id="exam-grades">Exam results</h2>
                <Link className="portal-link" href="/dashboard/student/exams">All exams<ArrowRight size={16} /></Link>
              </div>
              {graded.length === 0 ? (
                <div className="portal-empty"><p>No submitted exam results yet.</p></div>
              ) : (
                <ul className="portal-course-list">
                  {graded.map((exam) => (
                    <li key={exam.id}>
                      <div className="portal-course-info">
                        <small>{exam.status}</small>
                        <h3><Link href={`/dashboard/student/exams/${exam.id}/result?attemptId=${exam.attemptId}`}>{exam.title}</Link></h3>
                        <p>{exam.passed ? 'Passed' : 'Not passed'} · {exam.totalScore ?? 0} / {exam.totalMarks} marks</p>
                      </div>
                      <Link className="portal-link" href={`/dashboard/student/exams/${exam.id}/result?attemptId=${exam.attemptId}`}>View</Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="portal-section" style={{ marginTop: 32 }} aria-labelledby="lesson-grades">
              <div className="portal-section-heading">
                <h2 id="lesson-grades">Lesson assessments</h2>
              </div>
              {quizzes.length + tests.length === 0 ? (
                <div className="portal-empty"><p>No lesson quizzes or assessments are assigned in your courses.</p></div>
              ) : (
                <ul className="portal-course-list">
                  {[...quizzes, ...tests].map((item) => (
                    <li key={`${item.courseId}-${item.id}`}>
                      <div className="portal-course-info">
                        <small>{item.courseTitle}</small>
                        <h3><Link href={`/dashboard/student/courses/${item.courseId}`}>{item.title}</Link></h3>
                        <p>{item.completed ? 'Completed' : 'Not completed'} · {item.questionsCount || 0} questions</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
