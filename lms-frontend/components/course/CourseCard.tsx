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
    moduleCount?: number
    instructor?: { name: string; role?: string }
}

interface CourseCardProps {
    course: Course
    isEnrolled: boolean
    onEnroll: (id: number) => void
    enrollingId: number | null
    index: number
}

const cardGradients = [
    'from-indigo-600 to-purple-600',
    'from-blue-600 to-cyan-500',
    'from-emerald-600 to-teal-500',
    'from-amber-600 to-orange-500',
    'from-rose-600 to-pink-500',
    'from-violet-600 to-indigo-500'
]

const levelBadges: Record<string, string> = {
    'Beginner': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    'Intermediate': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    'Advanced': 'bg-rose-500/10 text-rose-500 border-rose-500/20',
    'Expert': 'bg-purple-500/10 text-purple-500 border-purple-500/20'
}

export default function CourseCard({
    course,
    isEnrolled,
    onEnroll,
    enrollingId,
    index
}: CourseCardProps) {
    const router = useRouter()
    const grad = cardGradients[index % cardGradients.length]

    return (
        <div
            onClick={() => router.push(isEnrolled ? `/dashboard/student/courses/${course.id}/learn` : `/dashboard/student/courses/${course.id}`)}
            className="group rounded-[20px] bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col justify-between"
        >
            {/* Top Thumbnail Image / Gradient */}
            <div className="h-44 relative overflow-hidden">
                {course.thumbnail ? (
                    <img 
                        src={course.thumbnail} 
                        alt={course.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                ) : (
                    <div className={`w-full h-full bg-gradient-to-r ${grad} flex items-center justify-center text-5xl text-white p-4 relative group-hover:scale-105 transition-transform duration-500`}>
                        <div className="absolute inset-0 bg-black/10" />
                        <span className="relative z-10">📚</span>
                    </div>
                )}

                {/* Badge Overlays */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 z-10">
                    {isEnrolled && (
                        <span className="px-2.5 py-1 rounded-full bg-indigo-600 text-white text-[10px] font-black shadow-md">
                            ✓ Enrolled
                        </span>
                    )}
                    {course.category && (
                        <span className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-md text-white text-[10px] font-extrabold uppercase tracking-wider">
                            {course.category}
                        </span>
                    )}
                </div>

                {course.level && (
                    <div className="absolute top-3 right-3 z-10">
                        <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black backdrop-blur-md ${levelBadges[course.level] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}>
                            {course.level}
                        </span>
                    </div>
                )}
            </div>

            {/* Content Area */}
            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                    {/* Course Title */}
                    <h3 className="text-base font-black text-[var(--text-primary)] group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
                        {course.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-gray-500 font-medium line-clamp-2 leading-relaxed">
                        {course.description || 'Gain hands-on practical skills with expert guidance and quizzes.'}
                    </p>
                </div>

                {/* Instructor & Metadata */}
                <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs text-gray-500 font-semibold">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-xs font-black">
                                {course.instructor?.name?.charAt(0) || 'I'}
                            </div>
                            <span className="truncate max-w-[110px]">{course.instructor?.name || 'Instructor'}</span>
                        </div>

                        {/* Rating */}
                        <div className="flex items-center gap-1 text-amber-500 font-extrabold">
                            <span>⭐</span>
                            <span>4.8</span>
                        </div>
                    </div>

                    {/* Lesson stats & duration */}
                    <div className="flex items-center justify-between text-[11px] text-gray-400 font-medium pt-1 border-t border-[var(--border)]">
                        <span>🎥 {course.lessonCount || 12} Lessons</span>
                        <span>⏱️ {course.duration || 8} Hours</span>
                    </div>

                    {/* Action & Price Footer */}
                    <div className="flex items-center justify-between pt-2">
                        <span className="text-sm font-black text-[var(--text-primary)]">
                            {course.price && course.price > 0 ? `$${course.price}` : <span className="text-emerald-500">FREE</span>}
                        </span>

                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                if (isEnrolled) {
                                    router.push(`/dashboard/student/courses/${course.id}/learn`)
                                } else {
                                    onEnroll(course.id)
                                }
                            }}
                            disabled={enrollingId === course.id}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all shadow-sm ${
                                isEnrolled
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    : 'bg-[var(--bg-base)] text-[var(--text-primary)] border border-[var(--border)] hover:border-indigo-500/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                            }`}
                        >
                            {enrollingId === course.id
                                ? 'Enrolling...'
                                : isEnrolled
                                ? 'Continue Learning'
                                : 'Enroll Now'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
