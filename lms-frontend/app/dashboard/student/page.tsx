'use client'
import Link from 'next/link'
import { ArrowRight, BookOpen, CheckCircle2 } from 'lucide-react'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import LearningCourseList from '@/components/student/LearningCourseList'
import UpcomingExams from '@/components/student/UpcomingExams'
import { learningHref, learningStatus, useStudentLearning } from '@/lib/useStudentLearning'

export default function StudentDashboard() {
  const { courses, user, stats, loading, error, reload } = useStudentLearning()
  const active = courses.find(course => learningStatus(course) === 'in-progress') || courses.find(course => learningStatus(course) === 'not-started')
  const completed = courses.filter(course => learningStatus(course) === 'completed').length
  const completedLessons = courses.reduce((sum, course) => sum + course.completedLessons, 0)
  const totalLessons = courses.reduce((sum, course) => sum + course.totalLessons, 0)
  return <div className="portal-page"><StudentReferenceShell active="dashboard" /><main id="student-main" tabIndex={-1} className="portal-main">
    <div className="portal-page-heading"><div><p className="portal-eyebrow">Learning workspace</p><h1>Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''}</h1><p>A little progress today brings your next milestone closer.</p></div><Link className="portal-link" href="/dashboard/student/courses">Explore courses<ArrowRight size={16} /></Link></div>
    {error ? <div role="alert" className="portal-error">{error}<button onClick={reload} className="portal-button secondary">Try again</button></div> : loading ? <p className="portal-empty" role="status">Loading your workspace…</p> : <>
      <section className="portal-resume" aria-labelledby="resume-title">
        <div className="portal-resume-content"><p className="portal-eyebrow">{active ? 'Your next step' : completed ? 'Milestone reached' : 'Start your journey'}</p>
          <h2 id="resume-title">{active?.title || (completed ? 'Ready for your next course?' : 'Find something you want to learn')}</h2>
          <p>{active ? active.nextLessonTitle ? `Up next: ${active.nextLessonTitle}` : 'Open the course to explore its lessons.' : completed ? `You have completed ${completed} ${completed === 1 ? 'course' : 'courses'}. Explore a new subject or revisit your learning.` : 'Explore courses from your institution and build your own learning path.'}</p>
          {active && <div className="portal-resume-progress"><progress max={100} value={active.progressPercent} aria-label="Course completion" /><span>{active.progressPercent}% complete · {active.completedLessons} / {active.totalLessons} lessons</span></div>}
          <Link className="portal-button" href={active ? learningHref(active) : '/dashboard/student/courses'}>{active ? learningStatus(active) === 'not-started' ? 'Start learning' : 'Continue learning' : 'Explore courses'}<ArrowRight size={18} aria-hidden="true" /></Link>
        </div><div className="portal-resume-art">{active?.thumbnail ? <img src={active.thumbnail} alt="" /> : completed ? <CheckCircle2 aria-hidden="true" /> : <BookOpen aria-hidden="true" />}</div>
      </section>
      <dl className="portal-summary"><div><dt>Enrolled courses</dt><dd>{courses.length}</dd></div><div><dt>Lessons completed</dt><dd>{completedLessons}<small> / {totalLessons}</small></dd></div><div><dt>Learning streak</dt><dd>{stats?.streak || 0}<small> days</small></dd></div><div><dt>Certificates</dt><dd><Link href="/dashboard/student/certificates">{stats?.certificates || 0}</Link></dd></div></dl>
      <UpcomingExams />
      <section className="portal-section"><div className="portal-section-heading"><h2>Your courses</h2><Link className="portal-link" href="/dashboard/student/my-learning">View all<ArrowRight size={16} /></Link></div>{courses.length ? <LearningCourseList courses={courses.slice(0, 4)} /> : <div className="portal-empty"><p>Your enrolled courses will appear here.</p><Link href="/dashboard/student/courses" className="portal-link">Find your first course<ArrowRight size={16} /></Link></div>}</section>
      <div className="portal-next-links"><Link href="/dashboard/student/progress"><h2>See your progress</h2><p>Review completed lessons and course milestones.</p><ArrowRight aria-hidden="true" /></Link><Link href="/dashboard/student/forums"><h2>Learn with others</h2><p>Ask a question or join an educational discussion.</p><ArrowRight aria-hidden="true" /></Link></div>
    </>}
  </main></div>
}
