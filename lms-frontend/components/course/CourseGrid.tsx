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
        {saved.error && <div role="alert" className="ui-alert is-warning mb-4"><span className="flex-1">{saved.error}</span><button className="ui-btn ui-btn-ghost ui-btn-sm" onClick={saved.reload}>Retry</button></div>}
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
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
