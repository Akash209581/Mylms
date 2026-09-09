'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import LearningCourseList from '@/components/student/LearningCourseList'
import { learningStatus, useStudentLearning } from '@/lib/useStudentLearning'

const tabs = [{ id: 'all', label: 'All courses' }, { id: 'not-started', label: 'Not started' }, { id: 'in-progress', label: 'In progress' }, { id: 'completed', label: 'Completed' }]
export default function MyLearningPage() {
  const { courses, loading, error, reload } = useStudentLearning()
  const [status, setStatus] = useState('all'), [search, setSearch] = useState(''), [sort, setSort] = useState('title')
  const filtered = useMemo(() => courses.filter(course => (status === 'all' || learningStatus(course) === status) &&
    `${course.title} ${course.category || ''}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'progress' ? b.progressPercent - a.progressPercent : a.title.localeCompare(b.title)), [courses, status, search, sort])
  return <div className="portal-page"><StudentReferenceShell active="my-learning" /><main id="student-main" tabIndex={-1} className="portal-main">
    <div className="portal-page-heading"><div><p className="portal-eyebrow">Your workspace</p><h1>My Learning</h1><p>Pick up a course, make progress, and keep track of what you have learned.</p></div><Link href="/dashboard/student/courses" className="portal-button secondary">Explore courses</Link></div>
    <div className="portal-tabs" aria-label="Filter courses by progress">{tabs.map(tab => <button key={tab.id} onClick={() => setStatus(tab.id)} aria-pressed={status === tab.id}>{tab.label}<span>{courses.filter(course => tab.id === 'all' || learningStatus(course) === tab.id).length}</span></button>)}</div>
    <div className="portal-filters"><label>Search your courses<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Course title or category" /></label><label>Sort by<select value={sort} onChange={event => setSort(event.target.value)}><option value="title">Course title</option><option value="progress">Progress</option></select></label></div>
    {error ? <div className="portal-error" role="alert">{error}<button className="portal-button secondary" onClick={reload}>Try again</button></div> : loading ? <p role="status" className="portal-empty">Loading your learning…</p> : filtered.length ? <><p className="portal-result-count" aria-live="polite">{filtered.length} {filtered.length === 1 ? 'course' : 'courses'}</p><LearningCourseList courses={filtered} /></> : <div className="portal-empty"><h2>{courses.length ? 'No courses match these filters' : 'Your next chapter starts here'}</h2><p>{courses.length ? 'Try another search or progress filter.' : 'Explore the catalog and enroll in a course to begin.'}</p>{!courses.length && <Link className="portal-button" href="/dashboard/student/courses">Explore courses</Link>}</div>}
  </main></div>
}
