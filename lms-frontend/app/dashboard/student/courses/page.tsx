'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api } from '@/lib/api'
import CourseCatalogHeader from '@/components/course/CourseCatalogHeader'
import SearchBar from '@/components/course/SearchBar'
import FilterPanel from '@/components/course/FilterPanel'
import FeaturedCourses from '@/components/course/FeaturedCourses'
import CourseGrid from '@/components/course/CourseGrid'
import EmptyState from '@/components/course/EmptyState'
import LoadingSkeleton from '@/components/course/LoadingSkeleton'

interface Course {
    id: number
    title: string
    description: string
    thumbnail?: string
    category?: string
    level?: string
    price?: number
    duration?: number
    status: string
    moduleCount?: number
    lessonCount?: number
    instructor?: {
        id: number
        name: string
        role?: string
    }
}

export default function StudentCoursesPage() {
    const router = useRouter()
    const [courses, setCourses] = useState<Course[]>([])
    const [enrollments, setEnrollments] = useState<number[]>([])
    const [filterTab, setFilterTab] = useState<'all' | 'enrolled' | 'available'>('all')
    const [category, setCategory] = useState<string>('')
    const [level, setLevel] = useState<string>('')
    const [search, setSearch] = useState('')
    const [sortBy, setSortBy] = useState<string>('newest')
    const [loading, setLoading] = useState(true)
    const [enrollingId, setEnrollingId] = useState<number | null>(null)
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 12,
        total: 0,
        totalPages: 0,
    })

    const categories = ['Web Development', 'Data Science', 'Mobile Development', 'DevOps', 'AI/ML', 'Cybersecurity']
    const levels = ['Beginner', 'Intermediate', 'Advanced', 'Expert']

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }

        fetchCourses()
        fetchEnrollments()
    }, [pagination.page, category, level, search, sortBy])

    const fetchCourses = async () => {
        setLoading(true)
        try {
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
            })

            if (category) params.append('category', category)
            if (level) params.append('level', level)
            if (search) params.append('search', search)

            const response = await api.get(`/courses/public/browse?${params}`)
            if (response.data) {
                setCourses(response.data.courses || [])
                setPagination(prev => ({
                    ...prev,
                    ...response.data.pagination,
                }))
            }
        } catch (error) {
            console.error('Error fetching courses:', error)
        } finally {
            setLoading(false)
        }
    }

    const fetchEnrollments = async () => {
        try {
            const response = await api.get('/enrollments/my')
            if (Array.isArray(response.data)) {
                setEnrollments(response.data.map((e: any) => e.courseId))
            }
        } catch (error) {
            console.error('Error fetching enrollments:', error)
        }
    }

    const handleEnroll = async (courseId: number) => {
        setEnrollingId(courseId)
        try {
            await api.post('/enrollments', { courseId })
            setEnrollments(prev => [...prev, courseId])
        } catch (error) {
            console.error('Error enrolling:', error)
        }
        setEnrollingId(null)
    }

    const handlePageChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }))
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const clearFilters = () => {
        setCategory('')
        setLevel('')
        setSearch('')
        setSortBy('newest')
        setPagination(prev => ({ ...prev, page: 1 }))
    }

    // Client-side filtering & sorting
    const filteredCourses = useMemo(() => {
        let list = filterTab === 'all'
            ? courses
            : filterTab === 'enrolled'
                ? courses.filter(c => enrollments.includes(c.id))
                : courses.filter(c => !enrollments.includes(c.id))

        if (sortBy === 'rating') {
            list = [...list].sort((a, b) => (b.id % 5) - (a.id % 5))
        } else if (sortBy === 'popular') {
            list = [...list].sort((a, b) => (b.lessonCount || 0) - (a.lessonCount || 0))
        }

        return list
    }, [courses, filterTab, enrollments, sortBy])

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors">
            <Sidebar role="STUDENT" />
            <Navbar title="Course Catalog" />

            <main className="page-content pt-24 pb-16 px-6 lg:px-10 max-w-[1600px] mx-auto space-y-8">
                
                {/* 1. Course Catalog Hero Header */}
                <CourseCatalogHeader
                    totalCourses={pagination.total || courses.length}
                    totalCategories={categories.length}
                    totalInstructors={15}
                    totalStudents={1240}
                />

                {/* 2. Large Search Bar */}
                <SearchBar
                    value={search}
                    onChange={(val) => {
                        setSearch(val)
                        setPagination(prev => ({ ...prev, page: 1 }))
                    }}
                />

                {/* 3. Filter Panel & Sort Controls */}
                <div className="sticky top-20 z-30 pt-2 pb-3 bg-[var(--bg-base)]/90 backdrop-blur-md transition-all">
                    <FilterPanel
                        filterTab={filterTab}
                        setFilterTab={setFilterTab}
                        category={category}
                        setCategory={(cat) => {
                            setCategory(cat)
                            setPagination(prev => ({ ...prev, page: 1 }))
                        }}
                        level={level}
                        setLevel={(lvl) => {
                            setLevel(lvl)
                            setPagination(prev => ({ ...prev, page: 1 }))
                        }}
                        sortBy={sortBy}
                        setSortBy={setSortBy}
                        clearFilters={clearFilters}
                        enrolledCount={enrollments.length}
                        categories={categories}
                        levels={levels}
                    />
                </div>

                {/* 4. Featured Courses Carousel / Grid (only when no active search/filters) */}
                {!search && !category && !level && pagination.page === 1 && (
                    <FeaturedCourses
                        courses={courses}
                        enrolledIds={enrollments}
                        onEnroll={handleEnroll}
                        enrollingId={enrollingId}
                    />
                )}

                {/* 5. Course Grid / Loading Skeleton / Empty State */}
                {loading ? (
                    <LoadingSkeleton />
                ) : filteredCourses.length === 0 ? (
                    <EmptyState
                        onClearFilters={clearFilters}
                        hasFilters={!!(category || level || search)}
                    />
                ) : (
                    <>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">
                                    {filterTab === 'enrolled' ? 'My Enrolled Courses' : filterTab === 'available' ? 'Available Courses' : 'All Approved Courses'}
                                </h2>
                                <span className="text-xs font-bold text-gray-400">
                                    Showing {filteredCourses.length} courses
                                </span>
                            </div>

                            <CourseGrid
                                courses={filteredCourses}
                                enrolledIds={enrollments}
                                onEnroll={handleEnroll}
                                enrollingId={enrollingId}
                            />
                        </div>

                        {/* 6. Modern Rounded Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-8 border-t border-[var(--border)]">
                                <span className="text-xs font-bold text-gray-400">
                                    Page {pagination.page} of {pagination.totalPages} ({pagination.total} total courses)
                                </span>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handlePageChange(pagination.page - 1)}
                                        disabled={pagination.page === 1}
                                        className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-raised)] transition-all"
                                    >
                                        ← Previous
                                    </button>

                                    <div className="flex items-center gap-1.5">
                                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                                            <button
                                                key={p}
                                                onClick={() => handlePageChange(p)}
                                                className={`w-8 h-8 rounded-xl text-xs font-black transition-all ${
                                                    p === pagination.page
                                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                                        : 'bg-[var(--bg-surface)] text-gray-400 border border-[var(--border)] hover:bg-[var(--bg-raised)]'
                                                }`}
                                            >
                                                {p}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={() => handlePageChange(pagination.page + 1)}
                                        disabled={pagination.page === pagination.totalPages}
                                        className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[var(--bg-surface)] text-[var(--text-primary)] border border-[var(--border)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-raised)] transition-all"
                                    >
                                        Next →
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}

            </main>
        </div>
    )
}
