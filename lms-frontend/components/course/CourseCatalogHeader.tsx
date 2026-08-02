'use client'

interface HeaderProps {
    totalCourses: number
    totalCategories?: number
    totalInstructors?: number
    totalStudents?: number
}

export default function CourseCatalogHeader({
    totalCourses = 0,
    totalCategories = 8,
    totalInstructors = 15,
    totalStudents = 1240
}: HeaderProps) {
    return (
        <div className="space-y-6 mb-8">
            {/* Title & Subtitle Banner */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-2">
                        <span>🚀</span> EduVerse Learning Hub
                    </div>
                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-[var(--text-primary)] flex items-center gap-3">
                        <span>📚</span> Course Catalog
                    </h1>
                    <p className="text-sm font-medium text-gray-500 max-w-2xl mt-1.5 leading-relaxed">
                        Explore high-quality courses designed by expert instructors and start your learning journey today.
                    </p>
                </div>
            </div>

            {/* Statistics Cards Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {/* Total Courses */}
                <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm flex items-center gap-3.5 hover:shadow-md transition-all">
                    <div className="w-11 h-11 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-xl font-bold">
                        📚
                    </div>
                    <div>
                        <p className="text-2xl font-black text-[var(--text-primary)] leading-none">{totalCourses}</p>
                        <p className="text-[11px] font-bold text-gray-400 mt-1">Total Courses</p>
                    </div>
                </div>

                {/* Categories */}
                <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm flex items-center gap-3.5 hover:shadow-md transition-all">
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center text-xl font-bold">
                        🧩
                    </div>
                    <div>
                        <p className="text-2xl font-black text-[var(--text-primary)] leading-none">{totalCategories}</p>
                        <p className="text-[11px] font-bold text-gray-400 mt-1">Categories</p>
                    </div>
                </div>

                {/* Expert Instructors */}
                <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm flex items-center gap-3.5 hover:shadow-md transition-all">
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xl font-bold">
                        🎓
                    </div>
                    <div>
                        <p className="text-2xl font-black text-[var(--text-primary)] leading-none">{totalInstructors}</p>
                        <p className="text-[11px] font-bold text-gray-400 mt-1">Instructors</p>
                    </div>
                </div>

                {/* Students Enrolled */}
                <div className="p-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm flex items-center gap-3.5 hover:shadow-md transition-all">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-xl font-bold">
                        👥
                    </div>
                    <div>
                        <p className="text-2xl font-black text-[var(--text-primary)] leading-none">{totalStudents}</p>
                        <p className="text-[11px] font-bold text-gray-400 mt-1">Students Enrolled</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
