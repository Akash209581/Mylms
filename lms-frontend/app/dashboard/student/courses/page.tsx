'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { api } from '@/lib/api'
import CoursePreviewModal from '@/components/course/CoursePreviewModal'

const gradients = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
]

const levelColors: Record<string, string> = {
    'Beginner': 'bg-green-500/20 text-green-400 border-green-500/30',
    'Intermediate': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'Advanced': 'bg-red-500/20 text-red-400 border-red-500/30',
    'Expert': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
}

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
    }
}

export default function StudentCoursesPage() {
    const router = useRouter()
    const [courses, setCourses] = useState<Course[]>([])
    const [enrollments, setEnrollments] = useState<number[]>([])
    const [filter, setFilter] = useState<'all' | 'enrolled' | 'available'>('all')
    const [category, setCategory] = useState<string>('')
    const [level, setLevel] = useState<string>('')
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [enrolling, setEnrolling] = useState<number | null>(null)
    const [previewCourseId, setPreviewCourseId] = useState<number | null>(null)
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
    }, [pagination.page, category, level, search])

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
        setEnrolling(courseId)
        try {
            await api.post('/enrollments', { courseId })
            setEnrollments(prev => [...prev, courseId])
        } catch (error) {
            console.error('Error enrolling:', error)
        }
        setEnrolling(null)
    }

    const handlePageChange = (newPage: number) => {
        setPagination(prev => ({ ...prev, page: newPage }))
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const clearFilters = () => {
        setCategory('')
        setLevel('')
        setSearch('')
        setPagination(prev => ({ ...prev, page: 1 }))
    }

    const filtered = filter === 'all'
        ? courses
        : filter === 'enrolled'
            ? courses.filter(c => enrollments.includes(c.id))
            : courses.filter(c => !enrollments.includes(c.id))

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="STUDENT" />
            <Navbar title="Browse Courses" />
            <main className="page-content">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">📚 Course Library</h1>
                    <p className="text-gray-400">Explore {pagination.total}+ approved courses and start learning today</p>
                </div>

                {/* Enrollment Filter */}
                <div className="flex gap-2 mb-4">
                    {(['all', 'enrolled', 'available'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 capitalize ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
                            {f === 'all' ? `All Courses` : f === 'enrolled' ? `My Enrolled (${enrollments.length})` : 'Available'}
                        </button>
                    ))}
                </div>

                {/* Advanced Filters */}
                <div className="glass-card p-6 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="md:col-span-2 relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search courses by title or description..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="input-field pl-10 w-full"
                            />
                        </div>

                        {/* Category Filter */}
                        <div>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="input-field w-full"
                            >
                                <option value="">All Categories</option>
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Level Filter */}
                        <div>
                            <select
                                value={level}
                                onChange={e => setLevel(e.target.value)}
                                className="input-field w-full"
                            >
                                <option value="">All Levels</option>
                                {levels.map(lvl => (
                                    <option key={lvl} value={lvl}>{lvl}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Active Filters */}
                    {(category || level || search) && (
                        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/10">
                            <span className="text-gray-400 text-sm">Active filters:</span>
                            <div className="flex flex-wrap gap-2">
                                {category && (
                                    <span className="px-3 py-1 bg-purple-500/20 text-purple-400 text-xs rounded-full border border-purple-500/30">
                                        {category}
                                    </span>
                                )}
                                {level && (
                                    <span className="px-3 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full border border-blue-500/30">
                                        {level}
                                    </span>
                                )}
                                {search && (
                                    <span className="px-3 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">
                                        &quot;{search}&quot;
                                    </span>
                                )}
                                <button
                                    onClick={clearFilters}
                                    className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded-full border border-red-500/30 hover:bg-red-500/30 transition-colors"
                                >
                                    Clear All
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">🔍</div>
                        <p className="text-white font-semibold text-lg mb-1">No courses found</p>
                        <p className="text-gray-400 text-sm mb-4">
                            {courses.length === 0 ? 'No approved courses available yet.' : 'Try adjusting your filters or search terms.'}
                        </p>
                        {(category || level || search) && (
                            <button onClick={clearFilters} className="btn-secondary">
                                Clear All Filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filtered.map((course, i) => {
                                const isEnrolled = enrollments.includes(course.id)
                                return (
                                    <div key={course.id} className="course-card group animate-fade-in cursor-pointer"
                                        style={{ animationDelay: `${i * 0.08}s` }}
                                        onClick={() => setPreviewCourseId(course.id)}>
                                        {/* Course Image/Gradient */}
                                        <div className="h-44 relative overflow-hidden"
                                            style={{
                                                background: course.thumbnail
                                                    ? `url(${course.thumbnail}) center/cover`
                                                    : gradients[i % gradients.length]
                                            }}>
                                            {!course.thumbnail && (
                                                <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-50 group-hover:scale-110 transition-transform duration-300">
                                                    📚
                                                </div>
                                            )}
                                            {/* Badges */}
                                            <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                                                {isEnrolled && (
                                                    <span className="badge badge-student">✓ Enrolled</span>
                                                )}
                                                <span className="badge bg-green-500/20 text-green-400 border-green-500/30">
                                                    ✅ APPROVED
                                                </span>
                                            </div>
                                            {course.level && (
                                                <div className="absolute top-3 right-3">
                                                    <span className={`badge border ${levelColors[course.level] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
                                                        {course.level}
                                                    </span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Course Info */}
                                        <div className="p-5">
                                            {/* Category */}
                                            {course.category && (
                                                <div className="mb-2">
                                                    <span className="text-purple-400 text-xs font-semibold uppercase tracking-wide">
                                                        {course.category}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Title */}
                                            <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2 min-h-[3.5rem]">
                                                {course.title}
                                            </h3>

                                            {/* Description */}
                                            <p className="text-gray-400 text-sm mb-3 line-clamp-2 min-h-[2.5rem]">
                                                {course.description || 'No description available'}
                                            </p>

                                            {/* Instructor */}
                                            <p className="text-gray-500 text-xs mb-4">
                                                by <span className="text-primary-400 font-medium">{course.instructor?.name || 'Instructor'}</span>
                                            </p>

                                            {/* Stats */}
                                            <div className="flex items-center gap-4 mb-4 text-xs text-gray-400">
                                                {course.moduleCount !== undefined && (
                                                    <div className="flex items-center gap-1">
                                                        <span>📑</span>
                                                        <span>{course.moduleCount} sections</span>
                                                    </div>
                                                )}
                                                {course.lessonCount !== undefined && (
                                                    <div className="flex items-center gap-1">
                                                        <span>🎥</span>
                                                        <span>{course.lessonCount} lectures</span>
                                                    </div>
                                                )}
                                                {course.duration && (
                                                    <div className="flex items-center gap-1">
                                                        <span>⏱️</span>
                                                        <span>{course.duration}h</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Price & Action */}
                                            <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                                <div className="text-white font-bold text-lg">
                                                    {course.price && course.price > 0 ? (
                                                        <span>${course.price}</span>
                                                    ) : (
                                                        <span className="text-green-400">FREE</span>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        !isEnrolled && handleEnroll(course.id)
                                                    }}
                                                    disabled={isEnrolled || enrolling === course.id}
                                                    className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 ${isEnrolled ? 'btn-primary opacity-80 cursor-default' : 'btn-secondary'}`}>
                                                    {enrolling === course.id ? 'Enrolling...' : isEnrolled ? '✓ Enrolled' : 'Enroll Now'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Pagination */}
                        {pagination.totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-12">
                                <button
                                    onClick={() => handlePageChange(pagination.page - 1)}
                                    disabled={pagination.page === 1}
                                    className="px-4 py-2 rounded-xl text-sm font-medium btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ← Previous
                                </button>

                                <div className="flex gap-2">
                                    {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                                        .filter(page => {
                                            // Show first page, last page, current page, and pages around current
                                            return page === 1 ||
                                                page === pagination.totalPages ||
                                                Math.abs(page - pagination.page) <= 1
                                        })
                                        .map((page, index, array) => {
                                            // Add ellipsis if there's a gap
                                            const showEllipsis = index > 0 && page - array[index - 1] > 1
                                            return (
                                                <div key={page} className="flex items-center gap-2">
                                                    {showEllipsis && (
                                                        <span className="text-gray-500 px-2">...</span>
                                                    )}
                                                    <button
                                                        onClick={() => handlePageChange(page)}
                                                        className={`w-10 h-10 rounded-xl text-sm font-medium transition-all ${page === pagination.page
                                                                ? 'btn-primary'
                                                                : 'btn-secondary'
                                                            }`}
                                                    >
                                                        {page}
                                                    </button>
                                                </div>
                                            )
                                        })}
                                </div>

                                <button
                                    onClick={() => handlePageChange(pagination.page + 1)}
                                    disabled={pagination.page === pagination.totalPages}
                                    className="px-4 py-2 rounded-xl text-sm font-medium btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Next →
                                </button>
                            </div>
                        )}

                        <div className="text-center mt-6 text-gray-400 text-sm">
                            Showing {((pagination.page - 1) * pagination.limit) + 1} - {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} courses
                        </div>
                    </>
                )}

                {/* Full-Screen Course Preview Modal */}
                <CoursePreviewModal
                    isOpen={previewCourseId !== null}
                    courseId={previewCourseId}
                    onClose={() => setPreviewCourseId(null)}
                />
            </main>
        </div>
    )
}
