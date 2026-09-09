'use client'
import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import StudentReferenceShell from '@/components/layout/StudentReferenceShell'
import CourseGrid from '@/components/course/CourseGrid'
import { api } from '@/lib/api'

function CourseCatalog() {
  const params = useSearchParams(), router = useRouter()
  const [courses, setCourses] = useState<any[]>([]), [enrollments, setEnrollments] = useState<number[]>([])
  const [category, setCategory] = useState(''), [level, setLevel] = useState(''), [search, setSearch] = useState(params.get('q') || '')
  const [sort, setSort] = useState('newest'), [filter, setFilter] = useState('all'), [page, setPage] = useState(1)
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [actionError, setActionError] = useState('')
  const [enrollingId, setEnrollingId] = useState<number | null>(null), [revision, setRevision] = useState(0)
  useEffect(() => { setSearch(params.get('q') || ''); setPage(1) }, [params])
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError('')
    const timer = setTimeout(async () => {
      try {
        const query = new URLSearchParams({ page: String(page), limit: '12', category, level, search, sort, enrollment: filter })
        const [catalog, mine] = await Promise.all([api.get(`/courses/public/browse?${query}`, { signal: controller.signal }), api.get('/enrollments/my', { signal: controller.signal })])
        if (controller.signal.aborted) return
        setCourses(catalog.data.courses || []); setPagination(catalog.data.pagination)
        setEnrollments(mine.data.map((enrollment: any) => enrollment.courseId))
      } catch (failure: any) {
        if (controller.signal.aborted) return
        if (failure.response?.status === 401) router.replace('/login')
        else setError('The catalog could not be loaded. Please try again.')
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }, 250)
    return () => { clearTimeout(timer); controller.abort() }
  }, [page, category, level, search, sort, filter, revision, router])
  const change = (setter: (value: string) => void, value: string) => { setter(value); setPage(1) }
  const enroll = async (courseId: number) => {
    setEnrollingId(courseId); setActionError('')
    try { await api.post('/enrollments', { courseId }); setEnrollments(previous => Array.from(new Set([...previous, courseId]))); setRevision(value => value + 1) }
    catch (failure: any) { setActionError(failure.response?.data?.message || 'Enrollment could not be saved. Please try again.') }
    finally { setEnrollingId(null) }
  }
  return <div className="portal-page"><StudentReferenceShell active="courses" /><main id="student-main" tabIndex={-1} className="portal-main">
    <div className="portal-page-heading"><div><p className="portal-eyebrow">Discover your next subject</p><h1>Course Catalog</h1><p>Explore published courses available to your institution.</p></div></div>
    <div className="portal-tabs" aria-label="Filter course enrollment">{[['all', 'All courses'], ['available', 'Available to enroll'], ['enrolled', 'Enrolled']].map(([value, label]) => <button key={value} aria-pressed={filter === value} onClick={() => change(setFilter, value)}>{label}</button>)}</div>
    <div className="portal-filters"><label>Search courses<input type="search" value={search} placeholder="Course title or description" onChange={event => change(setSearch, event.target.value)} /></label><label>Category<input value={category} placeholder="All categories" onChange={event => change(setCategory, event.target.value)} /></label><label>Level<select value={level} onChange={event => change(setLevel, event.target.value)}><option value="">All levels</option>{['Beginner', 'Intermediate', 'Advanced', 'Expert'].map(value => <option key={value}>{value}</option>)}</select></label><label>Sort by<select value={sort} onChange={event => change(setSort, event.target.value)}><option value="newest">Newest first</option><option value="title">Course title</option><option value="updated">Recently updated</option></select></label></div>
    {actionError && <p role="alert" className="portal-error">{actionError}</p>}
    {error ? <div className="portal-error" role="alert">{error}<button onClick={() => setRevision(value => value + 1)} className="portal-button secondary">Try again</button></div> : loading ? <p className="portal-empty" role="status">Loading courses…</p> : <><p className="portal-result-count" aria-live="polite">{pagination.total} {pagination.total === 1 ? 'course' : 'courses'} found</p>{courses.length ? <CourseGrid courses={courses} enrolledIds={enrollments} onEnroll={enroll} enrollingId={enrollingId} /> : <div className="portal-empty"><h2>No courses found</h2><p>Try a different search or clear the filters.</p><button className="portal-button secondary" onClick={() => { setSearch(''); setCategory(''); setLevel(''); setFilter('all'); setPage(1) }}>Clear filters</button></div>}
    {pagination.totalPages > 1 && <nav aria-label="Catalog pages" className="portal-pagination"><button className="portal-button secondary" onClick={() => setPage(value => value - 1)} disabled={page <= 1}>Previous</button><span>Page {page} of {pagination.totalPages}</span><button className="portal-button secondary" onClick={() => setPage(value => value + 1)} disabled={page >= pagination.totalPages}>Next</button></nav>}</>}
  </main></div>
}

export default function StudentCoursesPage() { return <Suspense fallback={<p role="status">Loading catalog…</p>}><CourseCatalog /></Suspense> }
