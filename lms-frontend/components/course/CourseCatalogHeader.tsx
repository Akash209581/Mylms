'use client'

import { BookOpen, GraduationCap, Layers3, UsersRound } from 'lucide-react'

interface HeaderProps { totalCourses: number; totalCategories?: number; totalInstructors?: number; totalStudents?: number }

export default function CourseCatalogHeader({ totalCourses, totalCategories = 0, totalInstructors = 0, totalStudents = 0 }: HeaderProps) {
    const stats = [
        { label: 'Total Courses', value: totalCourses, icon: <BookOpen />, tone: 'bg-emerald-50 text-emerald-600' },
        { label: 'Categories', value: totalCategories, icon: <Layers3 />, tone: 'bg-sky-50 text-sky-600' },
        { label: 'Instructors', value: totalInstructors, icon: <GraduationCap />, tone: 'bg-violet-50 text-violet-600' },
        { label: 'Students Enrolled', value: totalStudents, icon: <UsersRound />, tone: 'bg-indigo-50 text-indigo-600' },
    ]
    return <section className="catalog-hero relative overflow-hidden rounded-none border-b border-slate-100 bg-white px-6 py-6 lg:px-10">
        <img src="/images/course-catalog-hero.png" alt="Student walking toward a university campus" className="absolute inset-0 h-full w-full object-cover object-right" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#fff_0%,rgba(255,255,255,.98)_43%,rgba(255,255,255,.44)_66%,rgba(255,255,255,.06)_100%)]" />
        <div className="relative z-10 max-w-3xl">
            <p className="mb-4 text-xs text-slate-500">Home <span className="mx-2 text-indigo-400">/</span> <span className="font-semibold text-indigo-700">Course Catalog</span></p>
            <h1 className="font-serif text-4xl font-bold tracking-tight text-[#0b1a3c] lg:text-5xl">Course Catalog</h1>
            <p className="mt-1 text-sm text-slate-600 lg:text-base">Explore high-quality courses designed by expert instructors and start your learning journey today.</p>
            <div className="mt-6 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
                {stats.map(stat => <div key={stat.label} className="flex items-center gap-2.5"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${stat.tone}`}>{stat.icon}</span><div><p className="text-lg font-black leading-none text-[#102142]">{stat.value}</p><p className="mt-1 text-[10px] font-medium whitespace-nowrap text-slate-500">{stat.label}</p></div></div>)}
            </div>
        </div>
        <div className="absolute right-[4%] top-1/2 z-10 hidden -translate-y-1/2 border-l-2 border-indigo-400 pl-4 text-[11px] font-semibold leading-6 tracking-wider text-[#0e2549] xl:block">LEARN<br />PRACTICE<br />BUILD<br />BELONG</div>
    </section>
}
