'use client'
import CourseCard from './CourseCard'
import { useSavedCourses } from '@/lib/useSavedCourses'

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

interface CourseGridProps {
    courses: Course[]
    enrolledIds: number[]
    onEnroll: (id: number) => void
    enrollingId: number | null
}

export default function CourseGrid({
    courses,
    enrolledIds,
    onEnroll,
    enrollingId
}: CourseGridProps) {
    const saved = useSavedCourses()
    return (
        <>
        {saved.error && <p role="alert" className="portal-error">{saved.error}<button onClick={saved.reload}>Retry</button></p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {courses.map((c, idx) => (
                <CourseCard
                    key={c.id}
                    course={c}
                    isEnrolled={enrolledIds.includes(c.id)}
                    onEnroll={onEnroll}
                    enrollingId={enrollingId}
                    index={idx}
                    isSaved={saved.courses.some(row => row.courseId === c.id)}
                    saving={saved.loading || saved.busy.includes(c.id)}
                    onSave={value => void saved.toggle(c.id, value)}
                />
            ))}
        </div>
        </>
    )
}
