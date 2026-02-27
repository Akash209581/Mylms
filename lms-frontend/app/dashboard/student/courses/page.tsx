'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'

const gradients = [
    'linear-gradient(135deg, #667eea, #764ba2)',
    'linear-gradient(135deg, #f093fb, #f5576c)',
    'linear-gradient(135deg, #4facfe, #00f2fe)',
    'linear-gradient(135deg, #43e97b, #38f9d7)',
    'linear-gradient(135deg, #fa709a, #fee140)',
    'linear-gradient(135deg, #a18cd1, #fbc2eb)',
]

export default function StudentCoursesPage() {
    const router = useRouter()
    const [courses, setCourses] = useState<any[]>([])
    const [enrollments, setEnrollments] = useState<number[]>([])
    const [filter, setFilter] = useState<'all' | 'enrolled' | 'available'>('all')
    const [search, setSearch] = useState('')
    const [loading, setLoading] = useState(true)
    const [enrolling, setEnrolling] = useState<number | null>(null)

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }

        Promise.all([
            fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/courses`, { credentials: 'include' }).then(r => r.json()),
            fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/enrollments/my`, { credentials: 'include' }).then(r => r.json()),
        ]).then(([coursesData, enrollData]) => {
            if (Array.isArray(coursesData)) setCourses(coursesData)
            if (Array.isArray(enrollData)) setEnrollments(enrollData.map((e: any) => e.courseId))
        }).catch(() => { }).finally(() => setLoading(false))
    }, [])

    const handleEnroll = async (courseId: number) => {
        setEnrolling(courseId)
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/enrollments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ courseId }),
            })
            if (res.ok) setEnrollments(prev => [...prev, courseId])
        } catch { }
        setEnrolling(null)
    }

    const filtered = courses.filter(c => {
        const matchSearch = c.title?.toLowerCase().includes(search.toLowerCase())
        if (filter === 'enrolled') return enrollments.includes(c.id) && matchSearch
        if (filter === 'available') return !enrollments.includes(c.id) && matchSearch
        return matchSearch
    })

    return (
        <div className="min-h-screen bg-mesh">
            <Sidebar role="STUDENT" />
            <Navbar title="My Courses" />
            <main className="page-content">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">Course Library</h1>
                    <p className="text-gray-400">Explore and enroll in courses to advance your skills</p>
                </div>

                {/* Filter + Search */}
                <div className="flex flex-col sm:flex-row gap-4 mb-8">
                    <div className="flex gap-2">
                        {(['all', 'enrolled', 'available'] as const).map(f => (
                            <button key={f} onClick={() => setFilter(f)}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 capitalize ${filter === f ? 'btn-primary' : 'btn-secondary'}`}>
                                {f}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input type="text" placeholder="Search courses..." value={search}
                            onChange={e => setSearch(e.target.value)} className="input-field pl-10" />
                    </div>
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
                        <p className="text-gray-400 text-sm">
                            {courses.length === 0 ? 'No courses have been added to the platform yet.' : 'Try a different search or filter.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {filtered.map((course, i) => {
                            const isEnrolled = enrollments.includes(course.id)
                            return (
                                <div key={course.id} className="course-card group animate-fade-in"
                                    style={{ animationDelay: `${i * 0.08}s` }}>
                                    <div className="h-44 relative overflow-hidden"
                                        style={{ background: gradients[i % gradients.length] }}>
                                        <div className="absolute inset-0 flex items-center justify-center text-5xl opacity-50 group-hover:scale-110 transition-transform duration-300">
                                            📚
                                        </div>
                                        {isEnrolled && (
                                            <div className="absolute top-3 right-3 badge badge-student">Enrolled</div>
                                        )}
                                    </div>
                                    <div className="p-5">
                                        <h3 className="text-white font-semibold text-lg mb-2 line-clamp-1">{course.title}</h3>
                                        <p className="text-gray-400 text-sm mb-3 line-clamp-2">{course.description || 'No description available'}</p>
                                        <p className="text-gray-500 text-xs mb-4">
                                            by <span className="text-primary-400">{course.instructor?.name || 'Instructor'}</span>
                                        </p>
                                        <button
                                            onClick={() => !isEnrolled && handleEnroll(course.id)}
                                            disabled={isEnrolled || enrolling === course.id}
                                            className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-105 ${isEnrolled ? 'btn-primary opacity-80 cursor-default' : 'btn-secondary'}`}>
                                            {enrolling === course.id ? 'Enrolling...' : isEnrolled ? '✓ Enrolled' : 'Enroll Now'}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </main>
        </div>
    )
}
