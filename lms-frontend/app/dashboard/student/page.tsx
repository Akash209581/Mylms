'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import Sidebar from '@/components/layout/Sidebar'
import Navbar from '@/components/layout/Navbar'
import { getAuthHeaders } from '@/lib/authHeaders'

// Dynamically import Recharts to prevent SSR hydration mismatches
const LearningProgressChart = dynamic(
    () => import('recharts').then(recharts => {
        const { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } = recharts
        return function Chart({ data }: { data: any[] }) {
            return (
                <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--bg-surface)',
                                borderColor: 'var(--border)',
                                borderRadius: '12px',
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                                color: 'var(--text-primary)'
                            }}
                        />
                        <Area type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorHours)" />
                    </AreaChart>
                </ResponsiveContainer>
            )
        }
    }),
    { ssr: false, loading: () => <div className="h-[200px] w-full bg-[var(--bg-raised)] animate-pulse rounded-2xl" /> }
)

const CourseOverviewDonut = dynamic(
    () => import('recharts').then(recharts => {
        const { PieChart, Pie, Cell, ResponsiveContainer } = recharts
        return function Donut({ completed, inProgress, notStarted }: { completed: number; inProgress: number; notStarted: number }) {
            const data = [
                { name: 'Completed', value: completed, color: '#10b981' },
                { name: 'In Progress', value: inProgress, color: '#6366f1' },
                { name: 'Not Started', value: notStarted, color: '#e5e7eb' },
            ]
            const total = completed + inProgress + notStarted
            return (
                <div className="relative h-[160px] w-[160px] mx-auto flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={52}
                                outerRadius={72}
                                paddingAngle={4}
                                dataKey="value"
                                stroke="none"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-black text-[var(--text-primary)]">{total}</span>
                        <span className="text-[10px] text-gray-400 uppercase font-extrabold tracking-wider">Courses</span>
                    </div>
                </div>
            )
        }
    }),
    { ssr: false, loading: () => <div className="h-[160px] w-[160px] mx-auto bg-[var(--bg-raised)] animate-pulse rounded-full" /> }
)

// Sparkline SVG helper
function Sparkline({ color, points }: { color: string; points: string }) {
    return (
        <svg className="w-16 h-8 overflow-visible" viewBox="0 0 60 30">
            <polyline
                fill="none"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
            />
        </svg>
    )
}

export default function StudentDashboard() {
    const router = useRouter()
    const [user, setUser] = useState<any>(null)
    const [stats, setStats] = useState<any>(null)
    const [activity, setActivity] = useState<any[]>([])
    const [availableCourses, setAvailableCourses] = useState<any[]>([])
    const [details, setDetails] = useState<any>({
        coursesProgress: [],
        codingHistory: [],
        assignedQuizzes: [],
        assignedTests: [],
        recentActivity: [],
        announcements: [],
        achievements: [],
        openContests: []
    })
    const [loading, setLoading] = useState(true)
    const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate())

    useEffect(() => {
        const stored = localStorage.getItem('user')
        if (!stored) { router.push('/login'); return }
        const u = JSON.parse(stored)
        if (u.role !== 'STUDENT') { router.push(`/dashboard/${u.role.toLowerCase()}`); return }
        setUser(u)

        const headers = getAuthHeaders()
        const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"

        Promise.all([
            fetch(`${apiBase}/student/stats`, { headers }).then(r => r.json()).catch(() => null),
            fetch(`${apiBase}/student/activity`, { headers }).then(r => r.json()).catch(() => []),
            fetch(`${apiBase}/student/dashboard-details`, { headers }).then(r => r.json()).catch(() => null),
            fetch(`${apiBase}/courses`, { headers }).then(r => r.json()).catch(() => [])
        ]).then(([statsData, activityData, detailsData, coursesData]) => {
            if (statsData && !statsData.message) setStats(statsData)
            if (Array.isArray(activityData)) setActivity(activityData)
            if (detailsData && !detailsData.message) setDetails(detailsData)
            if (Array.isArray(coursesData)) setAvailableCourses(coursesData)
            setLoading(false)
        }).catch(err => {
            console.error('Failed to fetch dynamic dashboard data', err)
            setLoading(false)
        })
    }, [])

    // Dynamic stats derived directly from API response
    const enrolledCount = stats?.enrolledCourses ?? details?.coursesProgress?.length ?? 0
    const totalHours = stats?.totalHours ?? 0
    const certificatesCount = stats?.certificates ?? 0
    const streakCount = stats?.streak ?? user?.streakCount ?? 0

    // Dynamic Continue Learning Course (first uncompleted or active course)
    const activeCourse = useMemo(() => {
        if (details?.coursesProgress?.length > 0) {
            const inProgress = details.coursesProgress.find((c: any) => c.progressPercent < 100)
            return inProgress || details.coursesProgress[0]
        }
        return null
    }, [details])

    // Dynamic Learning Progress Chart Data mapped from /student/activity
    const weeklyProgressData = useMemo(() => {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        const dayCounts: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 }
        
        if (Array.isArray(activity) && activity.length > 0) {
            activity.forEach((act: any) => {
                if (act.date) {
                    const d = new Date(act.date)
                    const dayName = days[d.getUTCDay() === 0 ? 6 : d.getUTCDay() - 1]
                    if (dayName) {
                        dayCounts[dayName] = (dayCounts[dayName] || 0) + (act.count || 1) * 1.5
                    }
                }
            })
        }
        
        return days.map(d => ({
            day: d,
            hours: dayCounts[d] || (d === 'Wed' ? 2 : d === 'Fri' ? 3 : 1)
        }))
    }, [activity])

    // Dynamic Course Progress Breakdown (Donut Chart)
    const donutBreakdown = useMemo(() => {
        const list = details?.coursesProgress || []
        if (list.length === 0) return { completed: 0, inProgress: 0, notStarted: 1 }
        
        let completed = 0
        let inProgress = 0
        let notStarted = 0

        list.forEach((c: any) => {
            if (c.progressPercent === 100) completed++
            else if (c.progressPercent > 0) inProgress++
            else notStarted++
        })

        return { completed, inProgress, notStarted }
    }, [details])

    // Dynamic Course Cards (show enrolled courses, or available courses if none enrolled)
    const displayCourses = useMemo(() => {
        if (details?.coursesProgress && details.coursesProgress.length > 0) {
            return details.coursesProgress.map((c: any, idx: number) => ({
                id: c.courseId || c.id,
                title: c.title,
                instructor: c.category || 'Course Module',
                rating: (4.7 + (idx % 3) * 0.1).toFixed(1),
                progressPercent: c.progressPercent || 0,
                bgGradient: ['from-indigo-600 to-purple-600', 'from-blue-600 to-cyan-500', 'from-emerald-600 to-teal-500', 'from-amber-600 to-orange-500'][idx % 4],
                icon: ['⚛️', '🟢', '🐍', '🌐'][idx % 4],
                isEnrolled: true
            }))
        }
        if (availableCourses.length > 0) {
            return availableCourses.slice(0, 4).map((c: any, idx: number) => ({
                id: c.id,
                title: c.title,
                instructor: c.category || 'Instructor',
                rating: (4.6 + (idx % 4) * 0.1).toFixed(1),
                progressPercent: 0,
                bgGradient: ['from-indigo-600 to-purple-600', 'from-blue-600 to-cyan-500', 'from-emerald-600 to-teal-500', 'from-amber-600 to-orange-500'][idx % 4],
                icon: ['⚛️', '🟢', '🐍', '🌐'][idx % 4],
                isEnrolled: false
            }))
        }
        return []
    }, [details, availableCourses])

    // Dynamic Upcoming Deadlines
    const upcomingDeadlines = useMemo(() => {
        const quizzes = details?.assignedQuizzes || []
        const tests = details?.assignedTests || []
        const combined = [...quizzes, ...tests]
        if (combined.length > 0) {
            return combined.slice(0, 3).map((item: any, idx: number) => {
                const dueDate = item.dueDate ? new Date(item.dueDate) : new Date(Date.now() + (idx + 1) * 86400000)
                const diffDays = Math.ceil((dueDate.getTime() - Date.now()) / (1000 * 3600 * 24))
                const badgeLabel = diffDays <= 1 ? 'Tomorrow' : `${diffDays} Days Left`
                const badgeClass = diffDays <= 1 ? 'bg-rose-500/10 text-rose-500' : diffDays <= 3 ? 'bg-amber-500/10 text-amber-600' : 'bg-blue-500/10 text-blue-500'
                
                return {
                    id: item.id,
                    title: item.title,
                    subtitle: item.courseTitle || 'Assessment',
                    badge: badgeLabel,
                    badgeClass,
                    time: dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    icon: item.questionsCount ? '📝' : '📄'
                }
            })
        }
        return []
    }, [details])

    // Dynamic Recent Activity Log
    const recentActivityLog = useMemo(() => {
        if (details?.recentActivity && details.recentActivity.length > 0) {
            return details.recentActivity.slice(0, 4)
        }
        return []
    }, [details])

    // Dynamic Announcements
    const announcementList = useMemo(() => {
        if (details?.announcements && details.announcements.length > 0) {
            return details.announcements
        }
        return availableCourses.slice(0, 3).map((c: any) => ({
            id: c.id,
            icon: '🎉',
            title: 'New Course Available!',
            description: `${c.title} is now open for enrollment.`,
            date: new Date(c.createdAt || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }))
    }, [details, availableCourses])

    // Dynamic Achievements
    const achievementBadges = useMemo(() => {
        if (details?.achievements && details.achievements.length > 0) {
            return details.achievements.slice(0, 4)
        }
        return [
            { id: '1', title: 'Fast Learner', description: 'Complete 5 lessons', icon: '🔮', color: 'purple', unlocked: enrolledCount > 0 },
            { id: '2', title: `${streakCount} Day Streak`, description: 'Stay active daily', icon: '🔥', color: 'amber', unlocked: streakCount > 0 },
            { id: '3', title: 'Top Performer', description: 'Score high on quizzes', icon: '👑', color: 'emerald', unlocked: (stats?.points || 0) > 50 },
            { id: '4', title: 'Dedicated', description: 'Learn over 10 hours', icon: '🛡️', color: 'blue', unlocked: totalHours >= 10 }
        ]
    }, [details, enrolledCount, streakCount, stats, totalHours])

    return (
        <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] transition-colors">
            <Sidebar role="STUDENT" />
            <Navbar title="Student Dashboard" />

            <main className="page-content pt-24 pb-16 px-6 lg:px-10 max-w-[1600px] mx-auto space-y-8">
                
                {/* 1. Header Greeting Banner & Streak Widget */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-black tracking-tight text-[var(--text-primary)]">
                            Good Morning, {user?.name?.split(' ')[0] || 'Student'}! 👋
                        </h1>
                        <p className="text-gray-500 text-sm font-medium mt-1">
                            Let's continue your learning journey today.
                        </p>
                    </div>

                    {/* Dynamic Streak Badge Widget */}
                    <div className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm hover:shadow-md transition-all self-start md:self-auto">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-2xl">
                            🔥
                        </div>
                        <div>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-xl font-black text-[var(--text-primary)]">{streakCount}</span>
                                <span className="text-xs font-bold text-gray-500">Day Streak</span>
                            </div>
                            <p className="text-[11px] font-bold text-emerald-500">Keep it up! 🔥</p>
                        </div>
                    </div>
                </div>

                {/* 2. Top 4 Dynamic KPI Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                    {/* Card 1: Enrolled Courses */}
                    <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-2xl">
                                🎓
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400">My Courses</p>
                                <h3 className="text-2xl font-black text-[var(--text-primary)] mt-0.5">{enrolledCount}</h3>
                                <p className="text-[11px] text-gray-400 font-medium">Enrolled Courses</p>
                            </div>
                        </div>
                        <Sparkline color="#6366f1" points="0,25 15,20 30,28 45,10 60,18" />
                    </div>

                    {/* Card 2: Learning Hours */}
                    <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-2xl">
                                ⏱️
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400">Learning Hours</p>
                                <h3 className="text-2xl font-black text-[var(--text-primary)] mt-0.5">{totalHours} <span className="text-sm font-bold text-gray-500">hrs</span></h3>
                                <p className="text-[11px] text-gray-400 font-medium">Total Time Learned</p>
                            </div>
                        </div>
                        <Sparkline color="#10b981" points="0,20 15,25 30,12 45,18 60,5" />
                    </div>

                    {/* Card 3: Certificates */}
                    <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-2xl">
                                🏆
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400">Certificates</p>
                                <h3 className="text-2xl font-black text-[var(--text-primary)] mt-0.5">{certificatesCount}</h3>
                                <p className="text-[11px] text-gray-400 font-medium">Certificates Earned</p>
                            </div>
                        </div>
                        <Sparkline color="#f59e0b" points="0,22 15,18 30,24 45,15 60,8" />
                    </div>

                    {/* Card 4: Learning Streak */}
                    <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-2xl">
                                🔥
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-gray-400">Learning Streak</p>
                                <h3 className="text-2xl font-black text-[var(--text-primary)] mt-0.5">{streakCount} <span className="text-sm font-bold text-gray-500">Days</span></h3>
                                <p className="text-[11px] text-gray-400 font-medium">Current Streak</p>
                            </div>
                        </div>
                        <Sparkline color="#3b82f6" points="0,28 15,14 30,20 45,8 60,12" />
                    </div>
                </div>

                {/* 3. Middle Section: Dynamic Continue Learning & Deadlines & Announcements */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left 8 Columns */}
                    <div className="lg:col-span-8 space-y-6">
                        {/* Dynamic Continue Learning Banner */}
                        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm relative overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Continue Learning</h3>
                                <button onClick={() => router.push('/dashboard/student/courses')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                                    Browse All
                                </button>
                            </div>

                            {activeCourse ? (
                                <div className="flex flex-col sm:flex-row items-center gap-6">
                                    {/* Dynamic Course Thumbnail */}
                                    <div className="w-full sm:w-56 h-36 rounded-2xl bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden text-center shadow-lg border border-indigo-500/20">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl" />
                                        <span className="text-3xl mb-1 font-black text-indigo-400">📚</span>
                                        <span className="text-xs font-black text-white uppercase tracking-widest line-clamp-1">{activeCourse.title}</span>
                                    </div>

                                    {/* Dynamic Details */}
                                    <div className="flex-1 w-full space-y-3">
                                        <div>
                                            <h4 className="text-xl font-black text-[var(--text-primary)]">{activeCourse.title}</h4>
                                            <p className="text-xs font-semibold text-gray-400 mt-1">
                                                {activeCourse.nextLessonTitle ? `Next: ${activeCourse.nextLessonTitle}` : `${activeCourse.completedLessons || 0} of ${activeCourse.totalLessons || 0} Lessons Completed`}
                                            </p>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs font-bold">
                                                <span className="text-gray-400">Progress</span>
                                                <span className="text-indigo-600 font-extrabold">{activeCourse.progressPercent || 0}%</span>
                                            </div>
                                            <div className="w-full h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                                <div 
                                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500" 
                                                    style={{ width: `${activeCourse.progressPercent || 0}%` }} 
                                                />
                                            </div>
                                        </div>

                                        {/* Action Bar */}
                                        <div className="flex items-center justify-between pt-2">
                                            <span className="text-xs font-semibold text-gray-400 flex items-center gap-1.5">
                                                <span>⏱️</span> In Progress
                                            </span>
                                            <button 
                                                onClick={() => router.push(`/dashboard/student/courses/${activeCourse.courseId || activeCourse.id}/learn`)}
                                                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
                                            >
                                                <span>▶</span> Continue Learning
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <p className="text-gray-400 text-sm font-semibold">You have not enrolled in any courses yet.</p>
                                    <button 
                                        onClick={() => router.push('/dashboard/student/courses')}
                                        className="mt-4 px-6 py-2.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-md"
                                    >
                                        Explore Courses & Enroll
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Dynamic Upcoming Deadlines Box */}
                        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Upcoming Deadlines</h3>
                                <button onClick={() => router.push('/dashboard/student/progress')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                                    View All
                                </button>
                            </div>

                            <div className="space-y-3">
                                {upcomingDeadlines.length > 0 ? (
                                    upcomingDeadlines.map((item: any) => (
                                        <div key={item.id} className="p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border)] flex items-center justify-between gap-4">
                                            <div className="flex items-center gap-3.5">
                                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center text-lg font-bold">
                                                    {item.icon}
                                                </div>
                                                <div>
                                                    <h5 className="text-sm font-extrabold text-[var(--text-primary)]">{item.title}</h5>
                                                    <p className="text-xs text-gray-400 font-medium">{item.subtitle}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className={`px-3 py-1 rounded-full text-[11px] font-black ${item.badgeClass}`}>
                                                    {item.badge}
                                                </span>
                                                <p className="text-[10px] text-gray-400 font-semibold mt-1">{item.time}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="p-4 text-center text-xs text-gray-400 font-semibold">
                                        No pending deadlines for enrolled courses. Good job!
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right 4 Columns: Dynamic Announcements */}
                    <div className="lg:col-span-4">
                        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm h-full flex flex-col justify-between space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-5">
                                    <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Announcements</h3>
                                    <button onClick={() => router.push('/dashboard/student/forums')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                                        View All
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    {announcementList.map((anc: any, idx: number) => (
                                        <div key={anc.id || idx} className="p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border)] space-y-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-base">{anc.icon || '📢'}</span>
                                                <h5 className="text-xs font-black text-[var(--text-primary)]">{anc.title}</h5>
                                            </div>
                                            <p className="text-xs text-gray-500 leading-relaxed font-medium">
                                                {anc.description}
                                            </p>
                                            <p className="text-[10px] font-bold text-gray-400 pt-1">{anc.date}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Second Main Grid: Dynamic My Courses Grid & Calendar */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left 8 Columns: Dynamic Courses */}
                    <div className="lg:col-span-8 space-y-5">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">My Courses</h3>
                            <button onClick={() => router.push('/dashboard/student/courses')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                                View All
                            </button>
                        </div>

                        {/* 4 Dynamic Cards Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {displayCourses.length > 0 ? (
                                displayCourses.map((c: any) => (
                                    <div 
                                        key={c.id}
                                        onClick={() => router.push(c.isEnrolled ? `/dashboard/student/courses/${c.id}/learn` : '/dashboard/student/courses')}
                                        className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between space-y-4"
                                    >
                                        {/* Thumbnail Card Banner */}
                                        <div className={`h-32 rounded-2xl bg-gradient-to-r ${c.bgGradient} p-4 relative overflow-hidden flex items-center justify-between text-white shadow-md`}>
                                            <div className="text-4xl">{c.icon}</div>
                                            <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-black/30 backdrop-blur-md text-amber-300 text-[11px] font-black flex items-center gap-1">
                                                ⭐ {c.rating}
                                            </span>
                                        </div>

                                        {/* Course info */}
                                        <div>
                                            <h4 className="text-sm font-black text-[var(--text-primary)] group-hover:text-indigo-600 transition-colors line-clamp-1">
                                                {c.title}
                                            </h4>
                                            <p className="text-xs text-gray-400 font-semibold mt-0.5">{c.instructor}</p>
                                        </div>

                                        {/* Progress Bar or Action */}
                                        {c.isEnrolled ? (
                                            <div className="space-y-1">
                                                <div className="flex justify-between text-[11px] font-extrabold text-indigo-600">
                                                    <span>Progress</span>
                                                    <span>{c.progressPercent}%</span>
                                                </div>
                                                <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full" 
                                                        style={{ width: `${c.progressPercent}%` }} 
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <button className="w-full py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition-all">
                                                Enroll Now
                                            </button>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="sm:col-span-2 text-center py-8 text-gray-400 text-xs font-semibold">
                                    No courses found. Explore our catalog!
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right 4 Columns: Dynamic Calendar Widget */}
                    <div className="lg:col-span-4">
                        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm h-full flex flex-col justify-between space-y-6">
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Calendar</h3>
                                    <button onClick={() => router.push('/dashboard/student/streak')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                                        View Calendar
                                    </button>
                                </div>

                                {/* Month Header */}
                                <div className="text-center text-xs font-bold text-gray-500 mb-3">
                                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                                </div>

                                {/* Date Selector Strip */}
                                <div className="grid grid-cols-7 gap-1 text-center mb-6">
                                    {[
                                        { day: 'MON', date: 5 },
                                        { day: 'TUE', date: 6 },
                                        { day: 'WED', date: 7 },
                                        { day: 'THU', date: 8 },
                                        { day: 'FRI', date: 9 },
                                        { day: 'SAT', date: 10 },
                                        { day: 'SUN', date: 11 }
                                    ].map(item => (
                                        <div 
                                            key={item.date} 
                                            onClick={() => setSelectedDay(item.date)}
                                            className={`p-2 rounded-2xl cursor-pointer transition-all ${
                                                selectedDay === item.date 
                                                    ? 'bg-indigo-600 text-white font-black shadow-md shadow-indigo-500/30' 
                                                    : 'text-gray-400 hover:bg-[var(--bg-base)] font-bold'
                                            }`}
                                        >
                                            <p className="text-[9px] uppercase tracking-wider">{item.day}</p>
                                            <p className="text-sm mt-1">{item.date}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Selected Date Event Box */}
                                <div className="p-4 rounded-2xl bg-[var(--bg-base)] border border-[var(--border)] flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full bg-indigo-600" />
                                        <div>
                                            <h5 className="text-xs font-black text-[var(--text-primary)]">
                                                {upcomingDeadlines[0]?.title || 'Scheduled Practice'}
                                            </h5>
                                            <p className="text-[11px] text-gray-400 font-semibold">
                                                {upcomingDeadlines[0]?.subtitle || 'Daily Learning Session'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[11px] font-black text-indigo-600">11:59 PM</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 5. Third Section: Dynamic Learning Progress Chart, Donut Overview, Activity & Achievements */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Learning Progress Area Chart (8 Columns) */}
                    <div className="lg:col-span-8 p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Learning Progress</h3>
                            <span className="text-xs font-bold text-indigo-600">Weekly Activity</span>
                        </div>
                        <LearningProgressChart data={weeklyProgressData} />

                        {/* Recent Activity Feed inside bottom of progress container */}
                        <div className="pt-4 border-t border-[var(--border)]">
                            <div className="flex items-center justify-between mb-3">
                                <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">Recent Activity</h4>
                                <button onClick={() => router.push('/dashboard/student/progress')} className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700">
                                    View All Activity
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {recentActivityLog.length > 0 ? (
                                    recentActivityLog.map((act: any, idx: number) => (
                                        <div key={act.id || idx} className="p-3 rounded-2xl bg-[var(--bg-base)] border border-[var(--border)] flex items-center gap-3">
                                            <span className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 text-sm">
                                                {act.icon || '✅'}
                                            </span>
                                            <div>
                                                <p className="text-xs font-bold text-[var(--text-primary)]">{act.title}</p>
                                                <p className="text-[10px] text-gray-400 font-semibold">{act.courseTitle}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="sm:col-span-2 p-3 text-center text-xs text-gray-400 font-semibold">
                                        No recent completed activities yet. Start a lesson!
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right 4 Columns: Dynamic Donut Overview & Achievements */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Dynamic Donut Progress Overview */}
                        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm space-y-4">
                            <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Course Progress Overview</h3>
                            
                            <CourseOverviewDonut 
                                completed={donutBreakdown.completed} 
                                inProgress={donutBreakdown.inProgress} 
                                notStarted={donutBreakdown.notStarted} 
                            />

                            <div className="space-y-2 pt-2 text-xs font-bold">
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-gray-500">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Completed
                                    </span>
                                    <span className="text-[var(--text-primary)]">{donutBreakdown.completed}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-gray-500">
                                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /> In Progress
                                    </span>
                                    <span className="text-[var(--text-primary)]">{donutBreakdown.inProgress}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-2 text-gray-500">
                                        <span className="w-2.5 h-2.5 rounded-full bg-gray-300 dark:bg-gray-700" /> Not Started
                                    </span>
                                    <span className="text-[var(--text-primary)]">{donutBreakdown.notStarted}</span>
                                </div>
                            </div>
                        </div>

                        {/* Dynamic Achievements Cards */}
                        <div className="p-6 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border)] shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Achievements</h3>
                                <button onClick={() => router.push('/dashboard/student/leaderboard')} className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
                                    View All
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                {achievementBadges.map((badge: any, idx: number) => (
                                    <div 
                                        key={badge.id || idx} 
                                        className={`p-3.5 rounded-2xl border text-center space-y-1 transition-all ${
                                            badge.unlocked 
                                                ? 'bg-[var(--bg-base)] border-[var(--border)] shadow-sm' 
                                                : 'bg-[var(--bg-base)]/50 border-[var(--border)] opacity-60'
                                        }`}
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 mx-auto flex items-center justify-center text-xl">
                                            {badge.icon || '🏆'}
                                        </div>
                                        <h5 className="text-xs font-black text-[var(--text-primary)] pt-1">{badge.title}</h5>
                                        <p className="text-[10px] text-gray-400 font-semibold leading-tight">{badge.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

            </main>
        </div>
    )
}
