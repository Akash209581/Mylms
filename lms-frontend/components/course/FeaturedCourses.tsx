'use client'
import { useRouter } from 'next/navigation'

interface Course {
    id: number
    title: string
    description: string
    thumbnail?: string
    category?: string
    level?: string
    price?: number
    duration?: number
    lessonCount?: number
    instructor?: { name: string; role?: string }
}

interface FeaturedCoursesProps {
    courses: Course[]
    enrolledIds: number[]
    onEnroll: (courseId: number) => void
    enrollingId: number | null
}

const gradients = [
    'from-indigo-900 via-purple-950 to-slate-900',
    'from-blue-900 via-indigo-950 to-slate-900',
    'from-purple-900 via-slate-950 to-indigo-950'
]

export default function FeaturedCourses({
    courses,
    enrolledIds,
    onEnroll,
    enrollingId
}: FeaturedCoursesProps) {
    const router = useRouter()
    const featured = courses.slice(0, 2)

    if (featured.length === 0) return null

    return (
        <div className="space-y-4 my-8">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-xl">🌟</span>
                    <h2 className="text-xl font-black text-[var(--text-primary)] tracking-tight">Featured Courses</h2>
                </div>
                <span className="text-xs font-bold text-gray-400">Handpicked by Experts</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {featured.map((c, idx) => {
                    const isEnrolled = enrolledIds.includes(c.id)
                    const bgGrad = gradients[idx % gradients.length]
                    return (
                        <div
                            key={c.id}
                            onClick={() => router.push(isEnrolled ? `/dashboard/student/courses/${c.id}/learn` : `/dashboard/student/courses/${c.id}`)}
                            className="group p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden"
                        >
                            {/* Horizontal Header Banner */}
                            <div className={`h-44 rounded-2xl bg-gradient-to-r ${bgGrad} p-5 relative overflow-hidden flex flex-col justify-between text-white shadow-lg`}>
                                <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

                                <div className="flex items-center justify-between z-10">
                                    <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-black uppercase tracking-wider text-purple-300">
                                        {c.category || 'Featured'}
                                    </span>
                                    <span className="px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-amber-300 text-xs font-black flex items-center gap-1">
                                        ⭐ 4.9 (1.2k)
                                    </span>
                                </div>

                                <div className="z-10">
                                    <h3 className="text-xl font-black text-white line-clamp-1 group-hover:text-purple-300 transition-colors">
                                        {c.title}
                                    </h3>
                                    <p className="text-xs text-indigo-200/80 font-medium line-clamp-1 mt-1">
                                        {c.description || 'Master key concepts with hands-on projects.'}
                                    </p>
                                </div>
                            </div>

                            {/* Info & Stats */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-500 flex items-center justify-center text-xs font-black">
                                            {c.instructor?.name?.charAt(0) || 'I'}
                                        </div>
                                        <span>{c.instructor?.name || 'Expert Instructor'}</span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span>⏱️ {c.duration || 12}h</span>
                                        <span>🎥 {c.lessonCount || 18} lessons</span>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                                    <span className="text-sm font-black text-emerald-500">
                                        {c.price ? `$${c.price}` : 'FREE'}
                                    </span>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            if (isEnrolled) {
                                                router.push(`/dashboard/student/courses/${c.id}/learn`)
                                            } else {
                                                onEnroll(c.id)
                                            }
                                        }}
                                        disabled={enrollingId === c.id}
                                        className={`px-5 py-2.5 rounded-2xl text-xs font-black transition-all shadow-md flex items-center gap-2 ${
                                            isEnrolled
                                                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90'
                                                : 'bg-[var(--bg-base)] text-[var(--text-primary)] border border-[var(--border)] hover:border-indigo-500/50'
                                        }`}
                                    >
                                        {enrollingId === c.id
                                            ? 'Enrolling...'
                                            : isEnrolled
                                            ? '▶ Continue Learning'
                                            : 'Enroll Now →'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
